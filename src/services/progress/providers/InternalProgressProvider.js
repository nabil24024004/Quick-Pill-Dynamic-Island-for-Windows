// @ts-check
const { PROGRESS_CATEGORIES, PROGRESS_STATUSES } = require("../types");

class InternalProgressProvider {
  /**
   * @param {import("../ProgressRegistry").ProgressRegistry} registry
   */
  constructor(registry) {
    this.providerId = "internal";
    this.registry = registry;
    /** @type {Map<string, Function>} */
    this.actionListeners = new Map();
  }

  /**
   * Starts a new tracked operation
   * @param {object} input 
   * @param {Function} [actionHandler] 
   * @returns {string} Operation ID
   */
  startOperation(input, actionHandler) {
    const opId = this.registry.register(input, this.providerId);
    if (typeof actionHandler === "function") {
      this.actionListeners.set(opId, actionHandler);
    }
    return opId;
  }

  /**
   * Updates an ongoing operation
   * @param {string} opId 
   * @param {object} updates 
   * @returns {boolean}
   */
  updateOperation(opId, updates) {
    return this.registry.update(opId, updates, this.providerId);
  }

  /**
   * Completes an operation
   * @param {string} opId 
   * @param {object} [metadata] 
   */
  completeOperation(opId, metadata) {
    this.actionListeners.delete(opId);
    return this.registry.complete(opId, metadata, this.providerId);
  }

  /**
   * Fails an operation
   * @param {string} opId 
   * @param {Error|string} error 
   */
  failOperation(opId, error) {
    this.actionListeners.delete(opId);
    return this.registry.fail(opId, error, this.providerId);
  }

  /**
   * Cancels an operation
   * @param {string} opId 
   */
  cancelOperation(opId) {
    this.actionListeners.delete(opId);
    return this.registry.cancel(opId, this.providerId);
  }

  /**
   * Handles action routing for internal operations
   */
  async handleAction(operationId, action, params, op) {
    const handler = this.actionListeners.get(operationId);
    if (typeof handler === "function") {
      return handler(action, params, op);
    }
    return undefined;
  }
}

module.exports = {
  InternalProgressProvider
};
