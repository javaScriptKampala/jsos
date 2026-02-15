/**
 * VFS Wrapper
 *
 * Thin abstraction over the almostnode Virtual Filesystem that
 * exposes a familiar Node-like API and bootstraps the default
 * directory layout on first boot.
 */

/** Default directory tree created on a fresh install. */
const DEFAULT_DIRS = [
  '/bin',
  '/system',
  '/apps',
  '/home',
  '/tmp',
  '/config',
  '/packages',
];

export class VFSWrapper {
  /**
   * @param {object} vfs  almostnode VFS instance
   */
  constructor(vfs) {
    this.vfs = vfs;
  }

  /** Ensure the default directory tree exists. */
  bootstrap() {
    for (const dir of DEFAULT_DIRS) {
      this.mkdir(dir);
    }
    // Seed the packages registry if missing
    if (!this.exists('/config/packages.json')) {
      this.writeFile('/config/packages.json', JSON.stringify({ installed: {} }, null, 2));
    }
  }

  /** Create a directory (no-op if it already exists). */
  mkdir(path) {
    try {
      this.vfs.mkdirSync(path, { recursive: true });
    } catch {
      // directory may already exist — ignore
    }
  }

  /** Read a file as UTF-8 string. */
  readFile(path) {
    return this.vfs.readFileSync(path, 'utf8');
  }

  /** Write a string to a file. */
  writeFile(path, content) {
    this.vfs.writeFileSync(path, content);
  }

  /** List entries in a directory. */
  readdir(path) {
    return this.vfs.readdirSync(path);
  }

  /** Delete a file. */
  rm(path) {
    this.vfs.unlinkSync(path);
  }

  /** Check whether a path exists. */
  exists(path) {
    try {
      this.vfs.readFileSync(path);
      return true;
    } catch {
      return false;
    }
  }

  /** Produce a serialisable snapshot of the entire VFS. */
  toSnapshot() {
    return this.vfs.toSnapshot();
  }
}
