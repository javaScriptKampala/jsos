/**
 * Terminal App definition
 *
 * Wraps the Terminal UI so it can be launched as a process
 * by the kernel and rendered inside a window.
 */

import { Terminal } from '../ui/terminal.js';

export const TerminalApp = {
  name: 'terminal',
  title: 'Terminal',
  permissions: ['filesystem.read', 'filesystem.write'],

  /**
   * Called by the kernel to start the app.
   * @param {HTMLElement} container  Window content area
   * @param {object}      ctx        { kernel, vfs }
   */
  start(container, ctx) {
    const term = new Terminal(container, ctx.kernel, ctx.vfs);
    term.render();
  },
};
