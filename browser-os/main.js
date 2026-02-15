/**
 * BrowserOS – main.js
 *
 * Boot sequence:
 *   1. Initialise the almostnode container (or fall back to an in-memory VFS)
 *   2. Restore the VFS snapshot from IndexedDB if available
 *   3. Bootstrap the directory tree
 *   4. Start the Kernel
 *   5. Render the Desktop, Window Manager, and Taskbar
 *   6. Launch the Terminal as the first process
 */

import { Kernel } from './core/kernel.js';
import { VFSWrapper } from './filesystem/vfs-wrapper.js';
import { saveSnapshot, loadSnapshot } from './filesystem/persistence.js';
import { RuntimeManager } from './runtime/runtime-manager.js';
import { Desktop } from './ui/desktop.js';
import { WindowManager } from './ui/window-manager.js';
import { Taskbar } from './ui/taskbar.js';
import { TerminalApp } from './apps/terminal-app.js';
import { FileManagerApp } from './apps/file-manager-app.js';

// ─── Boot screen ────────────────────────────────────────

function showBootScreen() {
  const el = document.createElement('div');
  el.id = 'boot-screen';
  el.style.cssText = `
    position:fixed; inset:0; background:#11111b; color:#cdd6f4;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    font-family:system-ui,sans-serif; z-index:99999;
  `;
  el.innerHTML = `
    <h1 style="font-size:28px; margin:0 0 12px;">⊞ BrowserOS</h1>
    <p id="boot-status" style="color:#a6adc8; font-size:14px;">Booting…</p>
  `;
  document.body.appendChild(el);
  return {
    setStatus(msg) {
      const s = document.getElementById('boot-status');
      if (s) s.textContent = msg;
    },
    dismiss() {
      el.style.transition = 'opacity .4s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 400);
    },
  };
}

// ─── In-memory VFS fallback (when almostnode is not loaded) ─────

class MemoryVFS {
  constructor() {
    this._files = new Map();
    this._dirs = new Set(['/']);
  }
  mkdirSync(p) {
    const parts = p.split('/').filter(Boolean);
    let cur = '';
    for (const part of parts) {
      cur += '/' + part;
      this._dirs.add(cur);
    }
  }
  writeFileSync(p, content) { this._files.set(p, content); }
  readFileSync(p) {
    if (this._files.has(p)) return this._files.get(p);
    throw new Error(`ENOENT: ${p}`);
  }
  readdirSync(p) {
    const norm = p === '/' ? '' : p;
    if (!this._dirs.has(p === '/' ? '/' : p)) throw new Error(`ENOENT: ${p}`);
    const entries = new Set();
    const prefix = norm + '/';
    for (const d of this._dirs) {
      if (d !== p && d.startsWith(prefix)) {
        const rel = d.slice(prefix.length);
        const top = rel.split('/')[0];
        if (top) entries.add(top);
      }
    }
    for (const f of this._files.keys()) {
      if (f.startsWith(prefix)) {
        const rel = f.slice(prefix.length);
        const top = rel.split('/')[0];
        if (top && !rel.includes('/')) entries.add(top);
      }
    }
    return Array.from(entries);
  }
  unlinkSync(p) { this._files.delete(p); }
  toSnapshot() {
    return {
      files: Array.from(this._files.entries()),
      dirs: Array.from(this._dirs),
    };
  }
  static fromSnapshot(snap) {
    const vfs = new MemoryVFS();
    if (snap && snap.dirs) snap.dirs.forEach((d) => vfs._dirs.add(d));
    if (snap && snap.files) snap.files.forEach(([k, v]) => vfs._files.set(k, v));
    return vfs;
  }
}

// ─── Boot ───────────────────────────────────────────────

async function boot() {
  const bootScreen = showBootScreen();

  // 1. Create VFS (almostnode or fallback)
  bootScreen.setStatus('Initialising virtual filesystem…');
  let rawVfs;

  const snapshot = await loadSnapshot().catch(() => null);

  if (typeof globalThis.almostnode !== 'undefined') {
    if (snapshot) {
      rawVfs = globalThis.almostnode.VirtualFS.fromSnapshot(snapshot);
    } else {
      const container = await globalThis.almostnode.createContainer();
      rawVfs = container.vfs;
    }
  } else {
    rawVfs = snapshot ? MemoryVFS.fromSnapshot(snapshot) : new MemoryVFS();
  }

  const vfs = new VFSWrapper(rawVfs);
  vfs.bootstrap();

  // 2. Kernel
  bootScreen.setStatus('Starting kernel…');
  const kernel = new Kernel();

  // 3. Runtime manager (optional – needs almostnode)
  const almostnode = globalThis.almostnode || null;
  const runtimeManager = new RuntimeManager(almostnode, rawVfs);
  void runtimeManager; // available for apps that need it

  // 4. Register built-in apps & grant permissions
  for (const app of [TerminalApp, FileManagerApp]) {
    kernel.registerApp(app.name, app);
    for (const perm of app.permissions || []) {
      kernel.grantPermission(app.name, perm);
    }
  }

  await kernel.start();

  // 5. Render UI
  bootScreen.setStatus('Loading desktop…');
  const desktop = new Desktop(document.body);
  const desktopEl = desktop.render();

  const wm = new WindowManager(desktopEl);

  const taskbar = new Taskbar(document.body, wm, () => {
    desktop.toggleLauncher(true);
  });
  taskbar.render();

  // Populate app-launcher buttons
  const launcherContainer = document.getElementById('launcher-apps');
  if (launcherContainer) {
    for (const [name, meta] of kernel.registeredApps) {
      const btn = document.createElement('button');
      btn.textContent = meta.title || name;
      btn.style.cssText = `
        padding:12px 20px; border-radius:10px; border:none;
        background:#313244; color:#cdd6f4; font-size:14px;
        cursor:pointer;
      `;
      btn.addEventListener('click', () => {
        launchApp(name);
        desktop.toggleLauncher(false);
      });
      launcherContainer.appendChild(btn);
    }
  }

  // ─── App launcher helper ──────────────────────────────
  function launchApp(name) {
    const app = kernel.registeredApps.get(name);
    if (!app) return;
    const proc = kernel.spawn(name);
    const content = wm.createWindow(proc.pid, app.title || name);
    app.start(content, { kernel, vfs, runtimeManager });
    taskbar.update(kernel.listProcesses());
  }

  // Listen for process changes to keep the taskbar in sync
  kernel.on('process:killed', () => taskbar.update(kernel.listProcesses()));

  // 6. Launch Terminal as the first process
  bootScreen.setStatus('Launching terminal…');
  launchApp('terminal');

  // 7. Persist VFS on changes (debounced)
  let persistTimer;
  function schedulePersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(async () => {
      try {
        await saveSnapshot(vfs.toSnapshot());
      } catch {
        // Persistence failure is non-fatal
      }
    }, 2000);
  }
  kernel.on('process:spawned', schedulePersist);
  kernel.on('process:killed', schedulePersist);
  // Best-effort save on unload (async — may not complete)
  window.addEventListener('beforeunload', () => {
    schedulePersist();
  });

  // Done!
  bootScreen.dismiss();
  desktop.notify('BrowserOS ready.');
}

// Kick-off
boot().catch((err) => {
  console.error('BrowserOS boot failed:', err);
  document.body.textContent = `Boot failed: ${err.message}`;
});
