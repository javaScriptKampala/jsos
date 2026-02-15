/**
 * Permission Manager
 *
 * Manages per-app permission grants.  The kernel checks this
 * module before allowing privileged operations.
 */

/** All recognised permission strings. */
export const PERMISSIONS = Object.freeze({
  FS_READ: 'filesystem.read',
  FS_WRITE: 'filesystem.write',
  NETWORK: 'network',
  SPAWN: 'spawn',
  SERVER: 'server',
});

export class PermissionManager {
  constructor() {
    /** @type {Map<string, Set<string>>} appName → granted permissions */
    this._grants = new Map();
  }

  /**
   * Grant a permission to an app.
   * @param {string} appName
   * @param {string} permission
   */
  grant(appName, permission) {
    if (!this._grants.has(appName)) {
      this._grants.set(appName, new Set());
    }
    this._grants.get(appName).add(permission);
  }

  /**
   * Revoke a permission.
   */
  revoke(appName, permission) {
    const perms = this._grants.get(appName);
    if (perms) perms.delete(permission);
  }

  /**
   * Check whether an app holds a specific permission.
   * @returns {boolean}
   */
  hasPermission(appName, permission) {
    const perms = this._grants.get(appName);
    return perms ? perms.has(permission) : false;
  }

  /**
   * List all permissions for an app.
   * @returns {string[]}
   */
  listPermissions(appName) {
    const perms = this._grants.get(appName);
    return perms ? Array.from(perms) : [];
  }
}
