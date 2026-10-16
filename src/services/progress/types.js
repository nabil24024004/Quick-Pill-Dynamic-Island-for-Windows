// @ts-check

/**
 * Valid progress operation statuses
 */
const PROGRESS_STATUSES = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  INDETERMINATE: "indeterminate",
});

/**
 * Valid progress operation categories
 */
const PROGRESS_CATEGORIES = Object.freeze({
  FILE_OPERATION: "file-operation",
  DOWNLOAD: "download",
  UPLOAD: "upload",
  INSTALLATION: "installation",
  UPDATE: "update",
  RENDER: "render",
  COMPRESSION: "compression",
  EXPORT: "export",
  OTHER: "other",
});

/**
 * Default capabilities for an operation
 */
const DEFAULT_CAPABILITIES = Object.freeze({
  canPause: false,
  canResume: false,
  canCancel: false,
  canRetry: false,
  canOpenDestination: false,
  canOpenDetails: false,
  canDismiss: true,
});

/**
 * Sanitizes and limits string length to prevent UI overflow and memory issues
 * @param {any} val 
 * @param {number} [maxLength=120] 
 * @returns {string}
 */
function sanitizeString(val, maxLength = 120) {
  if (val === null || val === undefined) return "";
  const str = String(val).trim().replace(/[\r\n\t]+/g, " ");
  return str.length > maxLength ? str.slice(0, maxLength - 1) + "…" : str;
}

/**
 * Clamps numeric progress to 0-100 or returns null for indeterminate
 * @param {any} val 
 * @returns {number|null}
 */
function clampProgress(val) {
  if (typeof val !== "number" || isNaN(val)) return null;
  return Math.min(100, Math.max(0, Math.round(val * 10) / 10));
}

/**
 * Validates and normalizes an incoming progress operation input
 * @param {object} input 
 * @param {string} providerId 
 * @returns {object} Normalized ProgressOperation object
 */
function normalizeOperationInput(input, providerId) {
  if (!input || typeof input !== "object") {
    throw new Error("Progress operation input must be an object");
  }

  const id = String(input.id || `${providerId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const title = sanitizeString(input.title || "Operation", 80);
  const subtitle = sanitizeString(input.subtitle || "", 120);
  const applicationName = sanitizeString(input.applicationName || "Quick Pill", 50);

  const rawCat = String(input.category || PROGRESS_CATEGORIES.OTHER).toLowerCase();
  const category = Object.values(PROGRESS_CATEGORIES).includes(rawCat) ? rawCat : PROGRESS_CATEGORIES.OTHER;

  const rawStatus = String(input.status || PROGRESS_STATUSES.RUNNING).toLowerCase();
  const status = Object.values(PROGRESS_STATUSES).includes(rawStatus) ? rawStatus : PROGRESS_STATUSES.RUNNING;

  const now = Date.now();
  const startedAt = typeof input.startedAt === "number" ? input.startedAt : now;
  const progress = clampProgress(input.progress);

  const completedUnits = typeof input.completedUnits === "number" && input.completedUnits >= 0 ? input.completedUnits : null;
  const totalUnits = typeof input.totalUnits === "number" && input.totalUnits > 0 ? input.totalUnits : null;
  const unitLabel = sanitizeString(input.unitLabel || "", 20) || null;

  const bytesCompleted = typeof input.bytesCompleted === "number" && input.bytesCompleted >= 0 ? input.bytesCompleted : null;
  const totalBytes = typeof input.totalBytes === "number" && input.totalBytes > 0 ? input.totalBytes : null;
  const bytesPerSecond = typeof input.bytesPerSecond === "number" && input.bytesPerSecond >= 0 ? Math.round(input.bytesPerSecond) : null;

  const capabilities = {
    ...DEFAULT_CAPABILITIES,
    ...(input.capabilities && typeof input.capabilities === "object" ? input.capabilities : {})
  };

  return {
    id,
    providerId: String(providerId),
    sourceId: input.sourceId ? String(input.sourceId) : undefined,
    title,
    subtitle: subtitle || undefined,
    applicationName: applicationName || undefined,
    category,
    status,
    progress,
    completedUnits,
    totalUnits,
    unitLabel,
    bytesCompleted,
    totalBytes,
    bytesPerSecond,
    startedAt,
    updatedAt: now,
    completedAt: status === PROGRESS_STATUSES.COMPLETED ? now : undefined,
    estimatedRemainingSeconds: typeof input.estimatedRemainingSeconds === "number" && input.estimatedRemainingSeconds >= 0 ? Math.round(input.estimatedRemainingSeconds) : null,
    capabilities,
    destinationPath: input.destinationPath ? String(input.destinationPath) : null,
    errorCode: input.errorCode ? sanitizeString(input.errorCode, 50) : null,
    errorMessage: input.errorMessage ? sanitizeString(input.errorMessage, 200) : null,
    iconKey: input.iconKey ? sanitizeString(input.iconKey, 30) : null,
    metadata: input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {}
  };
}

module.exports = {
  PROGRESS_STATUSES,
  PROGRESS_CATEGORIES,
  DEFAULT_CAPABILITIES,
  sanitizeString,
  clampProgress,
  normalizeOperationInput
};
