// @ts-check
const { EventEmitter } = require("events");
const {
  PROGRESS_STATUSES,
  normalizeOperationInput,
  clampProgress,
  sanitizeString
} = require("./types");

class ProgressRegistry extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxHistory = options.maxHistory || 50;
    this.completionRetentionMs = options.completionRetentionMs || 5000;
    
    /** @type {Map<string, object>} */
    this.activeOperations = new Map();
    
    /** @type {object[]} */
    this.history = [];
    
    /** @type {Map<string, NodeJS.Timeout>} */
    this.archiveTimers = new Map();

    /** @type {Map<string, { speedEma: number, lastBytes: number, lastTime: number }>} */
    this.speedTrackers = new Map();

    this._pendingEmit = false;
    this._batchTimeout = null;
    this.batchDelayMs = options.batchDelayMs || 50;
  }

  /**
   * Registers a new operation in the registry
   * @param {object} input 
   * @param {string} providerId 
   * @returns {string} Operation ID
   */
  register(input, providerId) {
    const op = normalizeOperationInput(input, providerId);
    
    // Clear any previous archive timer if re-registering
    if (this.archiveTimers.has(op.id)) {
      clearTimeout(this.archiveTimers.get(op.id));
      this.archiveTimers.delete(op.id);
    }

    this.activeOperations.set(op.id, op);
    this.speedTrackers.set(op.id, {
      speedEma: op.bytesPerSecond || 0,
      lastBytes: op.bytesCompleted || 0,
      lastTime: Date.now()
    });

    this._scheduleEmit(true);
    return op.id;
  }

  /**
   * Updates an existing operation
   * @param {string} operationId 
   * @param {object} updates 
   * @param {string} [providerId] 
   * @returns {boolean}
   */
  update(operationId, updates, providerId) {
    const op = this.activeOperations.get(operationId);
    if (!op) return false;

    // Check ownership if providerId is supplied
    if (providerId && op.providerId !== providerId) {
      return false;
    }

    // Reject non-terminal updates if operation is already in a terminal state
    const isTerminal = [
      PROGRESS_STATUSES.COMPLETED,
      PROGRESS_STATUSES.FAILED,
      PROGRESS_STATUSES.CANCELLED
    ].includes(op.status);

    if (isTerminal && (!updates.status || updates.status === op.status)) {
      return false;
    }

    const now = Date.now();

    // Update progress percentage
    if (updates.progress !== undefined) {
      const p = clampProgress(updates.progress);
      if (p !== null) {
        // Prevent accidental backwards jumps unless explicit reset
        if (!updates.allowBackwards && typeof op.progress === "number" && p < op.progress && p > 0) {
          // Ignore micro jitter
        } else {
          op.progress = p;
        }
      } else {
        op.progress = null; // Indeterminate
      }
    }

    // Units
    if (typeof updates.completedUnits === "number") op.completedUnits = updates.completedUnits;
    if (typeof updates.totalUnits === "number") op.totalUnits = updates.totalUnits;
    if (updates.unitLabel !== undefined) op.unitLabel = sanitizeString(updates.unitLabel, 20);

    // Bytes & Speed
    if (typeof updates.bytesCompleted === "number") {
      op.bytesCompleted = Math.max(0, updates.bytesCompleted);
    }
    if (typeof updates.totalBytes === "number") {
      op.totalBytes = Math.max(0, updates.totalBytes);
    }

    // Throughput and smoothed ETA calculation
    const tracker = this.speedTrackers.get(operationId);
    if (typeof updates.bytesPerSecond === "number") {
      op.bytesPerSecond = Math.max(0, Math.round(updates.bytesPerSecond));
      if (tracker) tracker.speedEma = op.bytesPerSecond;
    } else if (tracker && typeof op.bytesCompleted === "number") {
      const dt = (now - tracker.lastTime) / 1000;
      if (dt >= 0.4) {
        const deltaBytes = Math.max(0, op.bytesCompleted - tracker.lastBytes);
        const instantSpeed = deltaBytes / dt;
        // Exponential moving average: alpha = 0.35
        tracker.speedEma = tracker.speedEma === 0 ? instantSpeed : Math.round(tracker.speedEma * 0.65 + instantSpeed * 0.35);
        tracker.lastBytes = op.bytesCompleted;
        tracker.lastTime = now;
        op.bytesPerSecond = tracker.speedEma;
      }
    }

    // Calculate smoothed ETA if not supplied directly
    if (typeof updates.estimatedRemainingSeconds === "number") {
      op.estimatedRemainingSeconds = Math.max(0, Math.round(updates.estimatedRemainingSeconds));
    } else if (op.totalBytes && op.bytesCompleted && op.bytesPerSecond && op.bytesPerSecond > 500) {
      const remainingBytes = Math.max(0, op.totalBytes - op.bytesCompleted);
      op.estimatedRemainingSeconds = Math.max(1, Math.round(remainingBytes / op.bytesPerSecond));
    }

    // Titles & Subtitles
    if (updates.title) op.title = sanitizeString(updates.title, 80);
    if (updates.subtitle !== undefined) op.subtitle = sanitizeString(updates.subtitle, 120);

    // Status transition
    if (updates.status && Object.values(PROGRESS_STATUSES).includes(updates.status)) {
      op.status = updates.status;
      if (op.status === PROGRESS_STATUSES.COMPLETED) {
        op.completedAt = now;
        op.progress = 100;
        this._scheduleArchive(operationId, this.completionRetentionMs);
      } else if (op.status === PROGRESS_STATUSES.CANCELLED || op.status === PROGRESS_STATUSES.FAILED) {
        op.completedAt = now;
        this._scheduleArchive(operationId, 8000);
      }
    }

    if (updates.errorCode !== undefined) op.errorCode = sanitizeString(updates.errorCode, 50);
    if (updates.errorMessage !== undefined) op.errorMessage = sanitizeString(updates.errorMessage, 200);
    if (updates.destinationPath !== undefined) op.destinationPath = updates.destinationPath ? String(updates.destinationPath) : null;
    if (updates.metadata && typeof updates.metadata === "object") {
      op.metadata = { ...op.metadata, ...updates.metadata };
    }

    op.updatedAt = now;

    const isUrgent = updates.status !== undefined;
    this._scheduleEmit(isUrgent);
    return true;
  }

  /**
   * Marks an operation as completed
   * @param {string} operationId 
   * @param {object} [metadata] 
   * @param {string} [providerId] 
   */
  complete(operationId, metadata = {}, providerId) {
    return this.update(operationId, {
      status: PROGRESS_STATUSES.COMPLETED,
      progress: 100,
      metadata
    }, providerId);
  }

  /**
   * Marks an operation as failed
   * @param {string} operationId 
   * @param {Error|string|object} error 
   * @param {string} [providerId] 
   */
  fail(operationId, error, providerId) {
    const message = error instanceof Error ? error.message : typeof error === "object" ? error.message || JSON.stringify(error) : String(error);
    const code = error && error.code ? String(error.code) : "OPERATION_FAILED";
    return this.update(operationId, {
      status: PROGRESS_STATUSES.FAILED,
      errorMessage: message,
      errorCode: code
    }, providerId);
  }

  /**
   * Marks an operation as cancelled
   * @param {string} operationId 
   * @param {string} [providerId] 
   */
  cancel(operationId, providerId) {
    return this.update(operationId, {
      status: PROGRESS_STATUSES.CANCELLED,
      bytesPerSecond: 0
    }, providerId);
  }

  /**
   * Pauses an operation
   * @param {string} operationId 
   * @param {string} [providerId] 
   */
  pause(operationId, providerId) {
    return this.update(operationId, {
      status: PROGRESS_STATUSES.PAUSED,
      bytesPerSecond: 0
    }, providerId);
  }

  /**
   * Resumes an operation
   * @param {string} operationId 
   * @param {string} [providerId] 
   */
  resume(operationId, providerId) {
    return this.update(operationId, {
      status: PROGRESS_STATUSES.RUNNING
    }, providerId);
  }

  /**
   * Dismisses an operation from active list
   * @param {string} operationId 
   */
  dismiss(operationId) {
    const op = this.activeOperations.get(operationId);
    if (!op) return false;

    if (this.archiveTimers.has(operationId)) {
      clearTimeout(this.archiveTimers.get(operationId));
      this.archiveTimers.delete(operationId);
    }

    this.activeOperations.delete(operationId);
    this.speedTrackers.delete(operationId);
    this._addToHistory(op);

    this._scheduleEmit(true);
    return true;
  }

  /**
   * Clears completed history
   */
  clearHistory() {
    this.history = [];
    this._scheduleEmit(true);
  }

  /**
   * @private
   */
  _scheduleArchive(operationId, delayMs) {
    if (this.archiveTimers.has(operationId)) {
      clearTimeout(this.archiveTimers.get(operationId));
    }

    const timer = setTimeout(() => {
      this.archiveTimers.delete(operationId);
      const op = this.activeOperations.get(operationId);
      if (op) {
        this.activeOperations.delete(operationId);
        this.speedTrackers.delete(operationId);
        this._addToHistory(op);
        this._scheduleEmit(true);
      }
    }, delayMs);

    this.archiveTimers.set(operationId, timer);
  }

  /**
   * @private
   */
  _addToHistory(op) {
    // Deduplicate history entry by ID
    this.history = [op, ...this.history.filter(h => h.id !== op.id)].slice(0, this.maxHistory);
  }

  /**
   * @private
   */
  _scheduleEmit(immediate = false) {
    if (immediate) {
      if (this._batchTimeout) {
        clearTimeout(this._batchTimeout);
        this._batchTimeout = null;
      }
      this._pendingEmit = false;
      this.emit("change", this.getSnapshot());
      return;
    }

    if (this._pendingEmit) return;
    this._pendingEmit = true;

    this._batchTimeout = setTimeout(() => {
      this._pendingEmit = false;
      this._batchTimeout = null;
      this.emit("change", this.getSnapshot());
    }, this.batchDelayMs);
  }

  /**
   * Gets a complete snapshot of all active and historic operations
   * @returns {{ active: object[], history: object[], summary: object }}
   */
  getSnapshot() {
    const active = Array.from(this.activeOperations.values());
    const running = active.filter(o => o.status === PROGRESS_STATUSES.RUNNING);
    const paused = active.filter(o => o.status === PROGRESS_STATUSES.PAUSED);
    const failed = active.filter(o => o.status === PROGRESS_STATUSES.FAILED);
    const completed = active.filter(o => o.status === PROGRESS_STATUSES.COMPLETED);

    let totalSpeed = 0;
    let totalBytesActive = 0;
    let completedBytesActive = 0;
    let hasIndeterminate = false;

    for (const op of running) {
      if (typeof op.bytesPerSecond === "number") totalSpeed += op.bytesPerSecond;
      if (op.totalBytes && op.bytesCompleted !== undefined) {
        totalBytesActive += op.totalBytes;
        completedBytesActive += op.bytesCompleted;
      }
      if (op.progress === null || op.status === PROGRESS_STATUSES.INDETERMINATE) {
        hasIndeterminate = true;
      }
    }

    const overallPercentage = totalBytesActive > 0 
      ? Math.round((completedBytesActive / totalBytesActive) * 1000) / 10
      : null;

    return {
      active,
      history: [...this.history],
      summary: {
        activeCount: active.length,
        runningCount: running.length,
        pausedCount: paused.length,
        failedCount: failed.length,
        completedCount: completed.length,
        totalBytesPerSecond: totalSpeed,
        overallPercentage,
        hasIndeterminate
      }
    };
  }

  destroy() {
    if (this._batchTimeout) clearTimeout(this._batchTimeout);
    for (const timer of this.archiveTimers.values()) {
      clearTimeout(timer);
    }
    this.archiveTimers.clear();
    this.activeOperations.clear();
    this.speedTrackers.clear();
    this.history = [];
    this.removeAllListeners();
  }
}

module.exports = {
  ProgressRegistry
};
