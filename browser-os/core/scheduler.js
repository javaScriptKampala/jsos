/**
 * Scheduler
 *
 * Periodically iterates over active processes and invokes their
 * tick callbacks (if any).  This enables cooperative multitasking
 * inside the single-threaded browser environment.
 */

export class Scheduler {
  /**
   * @param {import('./process-manager.js').ProcessManager} processManager
   * @param {number} [intervalMs=200]  Tick interval in milliseconds
   */
  constructor(processManager, intervalMs = 200) {
    this._processManager = processManager;
    this._intervalMs = intervalMs;
    this._timerId = null;
  }

  /** Start the scheduler loop. */
  start() {
    if (this._timerId !== null) return;
    this._timerId = setInterval(() => this._tick(), this._intervalMs);
  }

  /** Stop the scheduler loop. */
  stop() {
    if (this._timerId !== null) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  }

  /** @private */
  _tick() {
    for (const proc of this._processManager.listProcesses()) {
      if (typeof proc.onTick === 'function' && proc.status === 'running') {
        try {
          proc.onTick();
        } catch {
          proc.status = 'error';
        }
      }
    }
  }
}
