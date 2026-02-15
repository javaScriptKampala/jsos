/**
 * Desktop
 *
 * Creates the root DOM structure: a desktop area, a taskbar, and
 * an app launcher overlay.
 */

export class Desktop {
  /**
   * @param {HTMLElement} root  The root element to render into
   */
  constructor(root) {
    this._root = root;
    this._desktopEl = null;
    this._launcherEl = null;
  }

  /** Render the desktop chrome into the root element. */
  render() {
    this._root.innerHTML = '';
    this._root.style.cssText = `
      margin:0; padding:0; width:100vw; height:100vh;
      overflow:hidden; font-family:'Segoe UI',system-ui,sans-serif;
      background:#11111b; color:#cdd6f4;
    `;

    // Desktop surface
    this._desktopEl = document.createElement('div');
    this._desktopEl.id = 'desktop';
    this._desktopEl.style.cssText = `
      position:absolute; inset:0 0 48px 0; overflow:hidden;
    `;
    this._root.appendChild(this._desktopEl);

    // Notification area (top-right)
    const notif = document.createElement('div');
    notif.id = 'notifications';
    notif.style.cssText = `
      position:fixed; top:12px; right:12px; z-index:10000;
      display:flex; flex-direction:column; gap:8px; pointer-events:none;
    `;
    this._root.appendChild(notif);

    // App launcher overlay (hidden by default)
    this._launcherEl = document.createElement('div');
    this._launcherEl.id = 'app-launcher';
    this._launcherEl.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,.65);
      display:none; align-items:center; justify-content:center; z-index:9999;
    `;
    this._launcherEl.innerHTML = `
      <div style="background:#1e1e2e; border-radius:16px; padding:32px;
        min-width:320px; text-align:center;">
        <h2 style="margin:0 0 16px; color:#cdd6f4;">App Launcher</h2>
        <div id="launcher-apps" style="display:flex; flex-wrap:wrap; gap:16px; justify-content:center;"></div>
      </div>
    `;
    this._launcherEl.addEventListener('click', (e) => {
      if (e.target === this._launcherEl) this.toggleLauncher(false);
    });
    this._root.appendChild(this._launcherEl);

    return this._desktopEl;
  }

  /** Show or hide the app launcher overlay. */
  toggleLauncher(visible) {
    this._launcherEl.style.display = visible ? 'flex' : 'none';
  }

  /** Show a transient notification toast. */
  notify(message, durationMs = 3000) {
    const container = document.getElementById('notifications');
    if (!container) return;
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      background:#313244; color:#cdd6f4; padding:10px 18px;
      border-radius:8px; font-size:13px; pointer-events:auto;
      box-shadow:0 4px 12px rgba(0,0,0,.4);
      animation: fadeIn .2s ease;
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), durationMs);
  }

  get desktopElement() {
    return this._desktopEl;
  }
}
