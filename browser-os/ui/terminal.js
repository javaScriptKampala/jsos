/**
 * Terminal UI
 *
 * Renders a terminal emulator inside a given container and
 * dispatches commands to the kernel / VFS.
 */

export class Terminal {
  /**
   * @param {HTMLElement} container  DOM element to render inside
   * @param {object}      kernel     BrowserOS kernel
   * @param {import('../filesystem/vfs-wrapper.js').VFSWrapper} vfs
   */
  constructor(container, kernel, vfs) {
    this._container = container;
    this._kernel = kernel;
    this._vfs = vfs;
    this._cwd = '/home';
    this._history = [];
    this._historyIdx = -1;
    this._outputEl = null;
    this._inputEl = null;

    /** Built-in command registry. */
    this._commands = {
      help: () => this._cmdHelp(),
      ls: (args) => this._cmdLs(args),
      cd: (args) => this._cmdCd(args),
      cat: (args) => this._cmdCat(args),
      mkdir: (args) => this._cmdMkdir(args),
      rm: (args) => this._cmdRm(args),
      touch: (args) => this._cmdTouch(args),
      echo: (args) => this._cmdEcho(args),
      pwd: () => this._cwd,
      ps: () => this._cmdPs(),
      kill: (args) => this._cmdKill(args),
      clear: () => { this._outputEl.innerHTML = ''; return ''; },
      install: (args) => this._cmdInstall(args),
      run: (args) => this._cmdRun(args),
    };
  }

  /** Render the terminal UI. */
  render() {
    this._container.style.cssText += `
      background:#11111b; display:flex; flex-direction:column;
      font-family:'JetBrains Mono','Fira Code',monospace; font-size:13px;
    `;

    this._outputEl = document.createElement('div');
    this._outputEl.style.cssText = `
      flex:1; overflow-y:auto; padding:10px; white-space:pre-wrap;
      word-break:break-all; color:#cdd6f4;
    `;

    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex; padding:6px 10px; gap:6px; align-items:center;';

    const prompt = document.createElement('span');
    prompt.style.cssText = 'color:#a6e3a1; flex-shrink:0;';
    prompt.textContent = '$ ';

    this._inputEl = document.createElement('input');
    this._inputEl.type = 'text';
    this._inputEl.style.cssText = `
      flex:1; background:transparent; border:none; outline:none;
      color:#cdd6f4; font:inherit;
    `;
    this._inputEl.spellcheck = false;
    this._inputEl.addEventListener('keydown', (e) => this._onKeyDown(e));

    inputRow.appendChild(prompt);
    inputRow.appendChild(this._inputEl);
    this._container.appendChild(this._outputEl);
    this._container.appendChild(inputRow);

    this._print('BrowserOS Terminal v1.0\nType "help" for a list of commands.\n');
    this._inputEl.focus();
  }

  // ─── Input handling ───────────────────────────────────

  /** @private */
  _onKeyDown(e) {
    if (e.key === 'Enter') {
      const line = this._inputEl.value.trim();
      this._inputEl.value = '';
      if (line) {
        this._history.push(line);
        this._historyIdx = this._history.length;
        this._print(`$ ${line}`);
        this._execute(line);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this._historyIdx > 0) {
        this._historyIdx--;
        this._inputEl.value = this._history[this._historyIdx];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this._historyIdx < this._history.length - 1) {
        this._historyIdx++;
        this._inputEl.value = this._history[this._historyIdx];
      } else {
        this._historyIdx = this._history.length;
        this._inputEl.value = '';
      }
    }
  }

  // ─── Execution ────────────────────────────────────────

  /** @private */
  _execute(line) {
    const [cmd, ...args] = line.split(/\s+/);
    const handler = this._commands[cmd];
    if (!handler) {
      this._print(`Unknown command: ${cmd}`);
      return;
    }
    try {
      const result = handler(args);
      if (result !== undefined && result !== '') this._print(String(result));
    } catch (err) {
      this._print(`Error: ${err.message}`);
    }
  }

  /** @private */
  _print(text) {
    const line = document.createElement('div');
    line.textContent = text;
    this._outputEl.appendChild(line);
    this._outputEl.scrollTop = this._outputEl.scrollHeight;
  }

  // ─── Built-in commands ────────────────────────────────

  _cmdHelp() {
    return [
      'Available commands:',
      '  help              Show this message',
      '  ls   [path]       List directory',
      '  cd   <path>       Change directory',
      '  cat  <file>       Print file contents',
      '  mkdir <dir>       Create directory',
      '  rm   <file>       Remove file',
      '  touch <file>      Create empty file',
      '  echo <text>       Print text',
      '  pwd               Print working directory',
      '  ps                List processes',
      '  kill <pid>        Kill a process',
      '  clear             Clear terminal',
      '  install <pkg>     Install npm package',
      '  run <file>        Run a JS file',
    ].join('\n');
  }

  _resolvePath(p) {
    if (!p) return this._cwd;
    if (p.startsWith('/')) return p;
    const base = this._cwd === '/' ? '' : this._cwd;
    return `${base}/${p}`.replace(/\/+/g, '/');
  }

  _cmdLs(args) {
    const target = this._resolvePath(args[0]);
    try {
      return this._vfs.readdir(target).join('  ');
    } catch {
      return `ls: cannot access '${target}'`;
    }
  }

  _cmdCd(args) {
    const target = this._resolvePath(args[0] || '/home');
    try {
      this._vfs.readdir(target);
      this._cwd = target;
    } catch {
      return `cd: no such directory: ${target}`;
    }
    return '';
  }

  _cmdCat(args) {
    if (!args[0]) return 'Usage: cat <file>';
    const target = this._resolvePath(args[0]);
    return this._vfs.readFile(target);
  }

  _cmdMkdir(args) {
    if (!args[0]) return 'Usage: mkdir <dir>';
    this._vfs.mkdir(this._resolvePath(args[0]));
    return '';
  }

  _cmdRm(args) {
    if (!args[0]) return 'Usage: rm <file>';
    this._vfs.rm(this._resolvePath(args[0]));
    return '';
  }

  _cmdTouch(args) {
    if (!args[0]) return 'Usage: touch <file>';
    this._vfs.writeFile(this._resolvePath(args[0]), '');
    return '';
  }

  _cmdEcho(args) {
    return args.join(' ');
  }

  _cmdPs() {
    const procs = this._kernel.listProcesses();
    if (!procs.length) return 'No running processes.';
    const lines = ['PID   NAME            STATUS'];
    for (const p of procs) {
      lines.push(
        `${String(p.pid).padEnd(6)}${p.name.padEnd(16)}${p.status}`
      );
    }
    return lines.join('\n');
  }

  _cmdKill(args) {
    const pid = parseInt(args[0], 10);
    if (isNaN(pid)) return 'Usage: kill <pid>';
    this._kernel.kill(pid);
    return `Killed process ${pid}`;
  }

  _cmdInstall(args) {
    if (!args[0]) return 'Usage: install <package>';
    return `Package manager: "${args[0]}" queued for install (requires almostnode npm API).`;
  }

  _cmdRun(args) {
    if (!args[0]) return 'Usage: run <file>';
    return `Execution of "${args[0]}" queued (requires almostnode runtime).`;
  }
}
