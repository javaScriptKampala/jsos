/**
 * Taskbar
 *
 * A bottom dock that shows running apps and an app-launcher button.
 */

export class Taskbar {
  /**
   * @param {HTMLElement}  root           Root element to append to
   * @param {import('./window-manager.js').WindowManager} windowManager
   * @param {Function}     onLauncherClick
   */
  constructor(root, windowManager, onLauncherClick) {
    this._root = root;
    this._wm = windowManager;
    this._onLauncherClick = onLauncherClick;
    this._el = null;
    this._itemsEl = null;
  }

  /** Render the taskbar into the root element. */
  render() {
    this._el = document.createElement('div');
    this._el.id = 'taskbar';
    this._el.style.cssText = `
      position:fixed; bottom:0; left:0; right:0; height:48px;
      background:#181825; display:flex; align-items:center;
      padding:0 12px; gap:8px; z-index:9998;
      border-top:1px solid #313244;
    `;

    // Launcher button
    const launcher = document.createElement('button');
    launcher.textContent = '⊞';
    launcher.style.cssText = `
      width:36px; height:36px; border-radius:8px; border:none;
      background:#45475a; color:#cdd6f4; font-size:18px;
      cursor:pointer; display:flex; align-items:center; justify-content:center;
    `;
    launcher.addEventListener('click', () => this._onLauncherClick());
    this._el.appendChild(launcher);

    // Running-app items container
    this._itemsEl = document.createElement('div');
    this._itemsEl.style.cssText = 'display:flex; gap:6px; flex:1;';
    this._el.appendChild(this._itemsEl);

    // Clock
    const clock = document.createElement('span');
    clock.style.cssText = 'color:#a6adc8; font-size:13px; margin-left:auto;';
    const updateClock = () => {
      clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    updateClock();
    setInterval(updateClock, 30_000);
    this._el.appendChild(clock);

    this._root.appendChild(this._el);
  }

  /** Refresh the list of running-app buttons. */
  update(processes) {
    if (!this._itemsEl) return;
    this._itemsEl.innerHTML = '';
    for (const proc of processes) {
      const btn = document.createElement('button');
      btn.textContent = proc.name;
      btn.title = `PID ${proc.pid}`;
      btn.style.cssText = `
        padding:4px 12px; border-radius:6px; border:none;
        background:#313244; color:#cdd6f4; font-size:12px;
        cursor:pointer;
      `;
      btn.addEventListener('click', () => this._wm.restoreWindow(proc.pid));
      this._itemsEl.appendChild(btn);
    }
  }
}
