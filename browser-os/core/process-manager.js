/**
 * Process Manager
 *
 * Creates, tracks, and destroys processes. Each process is a
 * lightweight descriptor — the actual execution happens inside
 * the runtime layer.
 */

export class ProcessManager {
  constructor() {
    this._nextPid = 1;
    /** @type {Map<number, object>} */
    this._processes = new Map();
  }

  /**
   * Create a new process descriptor.
   * @param {string} name
   * @param {object} options
   * @returns {object} process descriptor
   */
  create(name, options = {}) {
    const pid = this._nextPid++;
    const proc = {
      pid,
      name,
      status: 'running',
      permissions: options.permissions || [],
      runtime: options.runtime || null,
      startTime: Date.now(),
      memoryUsage: 0,
      kill: () => this.kill(pid),
    };
    this._processes.set(pid, proc);
    return proc;
  }

  /**
   * Kill a running process.
   * @param {number} pid
   */
  kill(pid) {
    const proc = this._processes.get(pid);
    if (!proc) return;
    proc.status = 'terminated';
    this._processes.delete(pid);
  }

  /**
   * Get a process by PID.
   * @param {number} pid
   * @returns {object|undefined}
   */
  get(pid) {
    return this._processes.get(pid);
  }

  /**
   * List all active processes.
   * @returns {object[]}
   */
  listProcesses() {
    return Array.from(this._processes.values());
  }

  /**
   * Return the number of active processes.
   */
  get count() {
    return this._processes.size;
  }
}
