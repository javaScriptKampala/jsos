/**
 * Window Manager
 *
 * Handles window creation, dragging, resizing, z-index stacking,
 * minimise / maximise / close, and focus management.
 */

export class WindowManager {
  constructor(container) {
    /** @type {HTMLElement} DOM node that hosts all windows */
    this._container = container;
    /** @type {Map<number, HTMLElement>} pid → window element */
    this._windows = new Map();
    this._topZ = 100;
  }

  /**
   * Create a new window.
   * @param {number} pid
   * @param {string} title
   * @param {object}  [opts]
   * @returns {HTMLElement} The content area inside the window
   */
  createWindow(pid, title, opts = {}) {
    const width = opts.width || 640;
    const height = opts.height || 420;

    const win = document.createElement('div');
    win.className = 'os-window';
    win.dataset.pid = pid;
    win.style.cssText = `
      position: absolute;
      left: ${60 + (this._windows.size % 8) * 30}px;
      top: ${60 + (this._windows.size % 8) * 30}px;
      width: ${width}px;
      height: ${height}px;
      z-index: ${++this._topZ};
      display: flex;
      flex-direction: column;
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,.45);
    `;

    // Title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'os-window-titlebar';
    titleBar.style.cssText = `
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 12px; height: 36px; background: #181825;
      cursor: grab; user-select: none; flex-shrink: 0;
    `;

    const titleText = document.createElement('span');
    titleText.textContent = title;
    titleText.style.cssText = 'color:#cdd6f4; font-size:13px; font-weight:600;';

    const btnGroup = document.createElement('span');
    btnGroup.style.cssText = 'display:flex; gap:8px;';
    for (const [label, color, action] of [
      ['−', '#f9e2af', 'minimize'],
      ['□', '#a6e3a1', 'maximize'],
      ['×', '#f38ba8', 'close'],
    ]) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `
        width:14px; height:14px; border-radius:50%; border:none;
        background:${color}; color:transparent; font-size:10px;
        cursor:pointer; display:flex; align-items:center; justify-content:center;
        padding:0;
      `;
      btn.addEventListener('mouseenter', () => { btn.style.color = '#1e1e2e'; });
      btn.addEventListener('mouseleave', () => { btn.style.color = 'transparent'; });
      btn.dataset.action = action;
      btnGroup.appendChild(btn);
    }

    titleBar.appendChild(titleText);
    titleBar.appendChild(btnGroup);

    // Content area
    const content = document.createElement('div');
    content.className = 'os-window-content';
    content.style.cssText = 'flex:1; overflow:auto; position:relative;';

    win.appendChild(titleBar);
    win.appendChild(content);
    this._container.appendChild(win);
    this._windows.set(pid, win);

    // --- Interactions ---
    this._makeDraggable(win, titleBar);
    this._makeResizable(win);
    win.addEventListener('mousedown', () => this._focus(win));

    // Button handlers
    btnGroup.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'close') this.closeWindow(pid);
      else if (action === 'minimize') this.minimizeWindow(pid);
      else if (action === 'maximize') this._toggleMaximize(win);
    });

    return content;
  }

  closeWindow(pid) {
    const win = this._windows.get(pid);
    if (win) {
      win.remove();
      this._windows.delete(pid);
    }
  }

  minimizeWindow(pid) {
    const win = this._windows.get(pid);
    if (win) win.style.display = 'none';
  }

  restoreWindow(pid) {
    const win = this._windows.get(pid);
    if (win) {
      win.style.display = 'flex';
      this._focus(win);
    }
  }

  /** @private */
  _focus(win) {
    win.style.zIndex = ++this._topZ;
  }

  /** @private */
  _toggleMaximize(win) {
    if (win.dataset.maximized === 'true') {
      win.style.cssText = win.dataset.prevStyle;
      win.dataset.maximized = 'false';
    } else {
      win.dataset.prevStyle = win.style.cssText;
      win.style.left = '0';
      win.style.top = '0';
      win.style.width = '100%';
      win.style.height = 'calc(100% - 48px)';
      win.style.borderRadius = '0';
      win.dataset.maximized = 'true';
    }
  }

  /** @private */
  _makeDraggable(win, handle) {
    let startX, startY, origX, origY;
    const onMove = (e) => {
      win.style.left = `${origX + e.clientX - startX}px`;
      win.style.top = `${origY + e.clientY - startY}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      startX = e.clientX;
      startY = e.clientY;
      origX = parseInt(win.style.left, 10) || 0;
      origY = parseInt(win.style.top, 10) || 0;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  /** @private */
  _makeResizable(win) {
    const grip = document.createElement('div');
    grip.style.cssText = `
      position:absolute; right:0; bottom:0; width:16px; height:16px;
      cursor:nwse-resize;
    `;
    let startX, startY, origW, origH;
    const onMove = (e) => {
      win.style.width = `${origW + e.clientX - startX}px`;
      win.style.height = `${origH + e.clientY - startY}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    grip.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      origW = win.offsetWidth;
      origH = win.offsetHeight;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    win.appendChild(grip);
  }

  /** Expose active window map for taskbar. */
  getWindows() {
    return this._windows;
  }
}
