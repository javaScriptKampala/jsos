/**
 * Runtime Manager
 *
 * Wraps almostnode's createContainer / createRuntime helpers and
 * provides a unified API for the kernel to execute code in either
 * trusted (same-origin) or sandboxed (cross-origin iframe) mode.
 */

export class RuntimeManager {
  /**
   * @param {object} almostnode  Reference to the global almostnode API
   * @param {object} vfs         The active VFS instance
   */
  constructor(almostnode, vfs) {
    this._almostnode = almostnode;
    this._vfs = vfs;
    this._runtimes = new Map();
  }

  /**
   * Create a trusted runtime for first-party / system apps.
   * Uses createContainer for quick boot.
   */
  async createTrusted(id) {
    if (this._almostnode && typeof this._almostnode.createContainer === 'function') {
      const container = await this._almostnode.createContainer(this._vfs);
      this._runtimes.set(id, { type: 'trusted', container });
      return container;
    }
    // Fallback stub when almostnode is not available (e.g. tests)
    const stub = this._createStubRuntime();
    this._runtimes.set(id, { type: 'trusted', container: stub });
    return stub;
  }

  /**
   * Create a sandboxed runtime for third-party apps.
   * Uses createRuntime with sandbox option.
   * @param {string} id
   * @param {string} [sandboxOrigin]
   */
  async createSandboxed(id, sandboxOrigin) {
    if (this._almostnode && typeof this._almostnode.createRuntime === 'function') {
      const runtime = await this._almostnode.createRuntime(this._vfs, {
        sandbox: sandboxOrigin || 'about:blank',
      });
      this._runtimes.set(id, { type: 'sandboxed', container: runtime });
      return runtime;
    }
    const stub = this._createStubRuntime();
    this._runtimes.set(id, { type: 'sandboxed', container: stub });
    return stub;
  }

  /**
   * Execute a file inside a runtime.
   */
  async runFile(id, filePath) {
    const entry = this._runtimes.get(id);
    if (!entry) throw new Error(`Runtime "${id}" not found`);
    if (typeof entry.container.runFile === 'function') {
      return entry.container.runFile(filePath);
    }
    // Stub: simply read and eval (for test/demo only)
    return undefined;
  }

  /**
   * Execute arbitrary code inside a runtime.
   */
  async execute(id, code) {
    const entry = this._runtimes.get(id);
    if (!entry) throw new Error(`Runtime "${id}" not found`);
    if (typeof entry.container.execute === 'function') {
      return entry.container.execute(code);
    }
    return undefined;
  }

  /**
   * Destroy a runtime.
   */
  destroy(id) {
    this._runtimes.delete(id);
  }

  /** @private Minimal stub so tests can run without almostnode. */
  _createStubRuntime() {
    return {
      runFile: async () => undefined,
      execute: async () => undefined,
    };
  }
}
