/**
 * BrowserOS Kernel
 *
 * Central control module that manages processes, permissions,
 * the event bus, and app lifecycle. All subsystem interactions
 * flow through the kernel.
 */

import { ProcessManager } from './process-manager.js';
import { Scheduler } from './scheduler.js';
import { PermissionManager } from './permissions.js';

export class Kernel {
  constructor() {
    this.processManager = new ProcessManager();
    this.scheduler = new Scheduler(this.processManager);
    this.permissionManager = new PermissionManager();
    this.eventBus = new EventTarget();
    this.registeredApps = new Map();
    this.started = false;
  }

  /**
   * Boot the kernel: start subsystems and emit the ready event.
   */
  async start() {
    if (this.started) return;
    this.started = true;
    this.scheduler.start();
    this.broadcastEvent('kernel:ready', { timestamp: Date.now() });
  }

  /**
   * Shut down all processes and stop the scheduler.
   */
  async shutdown() {
    const pids = this.processManager.listProcesses().map((p) => p.pid);
    for (const pid of pids) {
      this.kill(pid);
    }
    this.scheduler.stop();
    this.started = false;
    this.broadcastEvent('kernel:shutdown', { timestamp: Date.now() });
  }

  /**
   * Register an application so it can be spawned later.
   * @param {string} name  Unique app name
   * @param {object} meta  Application metadata (entry, permissions, etc.)
   */
  registerApp(name, meta) {
    this.registeredApps.set(name, meta);
  }

  /**
   * Spawn a new process for the given application.
   * @param {string} name          App name (must be registered)
   * @param {object} [options={}]  Extra spawn options
   * @returns {object} The created process descriptor
   */
  spawn(name, options = {}) {
    const app = this.registeredApps.get(name);
    if (!app) {
      throw new Error(`App "${name}" is not registered`);
    }

    const requiredPermissions = app.permissions || [];
    for (const perm of requiredPermissions) {
      if (!this.permissionManager.hasPermission(name, perm)) {
        throw new Error(
          `App "${name}" lacks required permission: ${perm}`
        );
      }
    }

    const proc = this.processManager.create(name, {
      ...options,
      permissions: requiredPermissions,
    });
    this.broadcastEvent('process:spawned', { pid: proc.pid, name });
    return proc;
  }

  /**
   * Kill a process by PID.
   * @param {number} pid
   */
  kill(pid) {
    this.processManager.kill(pid);
    this.broadcastEvent('process:killed', { pid });
  }

  /**
   * Return a snapshot of all running processes.
   */
  listProcesses() {
    return this.processManager.listProcesses();
  }

  /**
   * Grant a permission to an app.
   */
  grantPermission(appName, permission) {
    this.permissionManager.grant(appName, permission);
  }

  /**
   * Request permission (returns true if already granted).
   */
  requestPermission(appName, permission) {
    return this.permissionManager.hasPermission(appName, permission);
  }

  /**
   * Emit a custom event on the kernel event bus.
   */
  broadcastEvent(type, detail = {}) {
    this.eventBus.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /**
   * Subscribe to a kernel event.
   */
  on(type, handler) {
    this.eventBus.addEventListener(type, handler);
  }

  /**
   * Unsubscribe from a kernel event.
   */
  off(type, handler) {
    this.eventBus.removeEventListener(type, handler);
  }
}
