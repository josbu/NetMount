/**
 * Main controller - Thin orchestrator
 * 
 * Delegates to focused modules:
 * - mainInit.ts: Application initialization
 * - startupTasks.ts: Startup task orchestration
 * - componentWatchdog.ts: Health monitoring
 * - versionCheck.ts: Version checking
 * - lifecycle.ts: Exit/restart lifecycle management
 * 
 * This file now serves as the public API for the main controller.
 */

export { init } from './mainInit'
export { runStartupTasksInBackground } from './startupTasks'
export { startComponentWatchdog, stopComponentWatchdog } from './componentWatchdog'
export { reupRcloneVersion, reupOpenlistVersion } from './versionCheck'
export { exit, saveStateAndExit } from './lifecycle'
