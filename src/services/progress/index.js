// @ts-check
const { ProgressRegistry } = require("./ProgressRegistry");
const { ProgressCoordinator } = require("./ProgressCoordinator");
const { QuickPillUpdaterProvider } = require("./providers/QuickPillUpdaterProvider");
const { FileOperationsProvider } = require("./providers/FileOperationsProvider");
const { InternalProgressProvider } = require("./providers/InternalProgressProvider");
const types = require("./types");

/**
 * Initializes and wires the complete Universal Progress Engine
 * @param {object} [options]
 * @param {object} [options.autoUpdater]
 * @param {Function} [options.openPath]
 * @returns {{
 *   registry: ProgressRegistry,
 *   coordinator: ProgressCoordinator,
 *   updaterProvider: QuickPillUpdaterProvider,
 *   fileOpsProvider: FileOperationsProvider,
 *   internalProvider: InternalProgressProvider
 * }}
 */
function createProgressEngine(options = {}) {
  const registry = new ProgressRegistry(options);
  const coordinator = new ProgressCoordinator(registry, {
    openPath: options.openPath
  });

  const updaterProvider = new QuickPillUpdaterProvider(registry, options.autoUpdater);
  const fileOpsProvider = new FileOperationsProvider(registry, options);
  const internalProvider = new InternalProgressProvider(registry);

  coordinator.registerProvider(updaterProvider.providerId, updaterProvider);
  coordinator.registerProvider(fileOpsProvider.providerId, fileOpsProvider);
  coordinator.registerProvider(internalProvider.providerId, internalProvider);

  return {
    registry,
    coordinator,
    updaterProvider,
    fileOpsProvider,
    internalProvider
  };
}

module.exports = {
  createProgressEngine,
  ProgressRegistry,
  ProgressCoordinator,
  QuickPillUpdaterProvider,
  FileOperationsProvider,
  InternalProgressProvider,
  ...types
};
