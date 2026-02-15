/**
 * File Manager App
 *
 * Simple two-pane file browser rendered inside a window.
 */

export const FileManagerApp = {
  name: 'file-manager',
  title: 'Files',
  permissions: ['filesystem.read', 'filesystem.write'],

  /**
   * @param {HTMLElement} container
   * @param {object}      ctx  { kernel, vfs }
   */
  start(container, ctx) {
    const vfs = ctx.vfs;
    let cwd = '/';

    container.style.cssText += `
      background:#1e1e2e; padding:12px; font-family:system-ui,sans-serif;
      font-size:13px; color:#cdd6f4; overflow-y:auto;
    `;

    const breadcrumb = document.createElement('div');
    breadcrumb.style.cssText = 'margin-bottom:10px; color:#89b4fa; font-size:14px;';

    const list = document.createElement('div');
    list.style.cssText = 'display:flex; flex-direction:column; gap:4px;';

    container.appendChild(breadcrumb);
    container.appendChild(list);

    function navigate(path) {
      cwd = path;
      breadcrumb.textContent = cwd;
      list.innerHTML = '';

      if (cwd !== '/') {
        const up = document.createElement('div');
        up.textContent = '📁 ..';
        up.style.cssText = 'cursor:pointer; padding:4px 8px; border-radius:4px;';
        up.addEventListener('click', () => {
          const parent = cwd.split('/').slice(0, -1).join('/') || '/';
          navigate(parent);
        });
        up.addEventListener('mouseenter', () => { up.style.background = '#313244'; });
        up.addEventListener('mouseleave', () => { up.style.background = 'none'; });
        list.appendChild(up);
      }

      let entries;
      try {
        entries = vfs.readdir(cwd);
      } catch {
        entries = [];
      }

      for (const name of entries) {
        const fullPath = cwd === '/' ? `/${name}` : `${cwd}/${name}`;
        const row = document.createElement('div');
        row.style.cssText = 'cursor:pointer; padding:4px 8px; border-radius:4px;';
        row.addEventListener('mouseenter', () => { row.style.background = '#313244'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'none'; });

        let isDir = false;
        try {
          vfs.readdir(fullPath);
          isDir = true;
        } catch {
          // not a directory
        }

        row.textContent = isDir ? `📁 ${name}` : `📄 ${name}`;
        if (isDir) {
          row.addEventListener('click', () => navigate(fullPath));
        } else {
          row.addEventListener('click', () => {
            try {
              const content = vfs.readFile(fullPath);
              showPreview(fullPath, content);
            } catch (err) {
              showPreview(fullPath, `Error: ${err.message}`);
            }
          });
        }
        list.appendChild(row);
      }
    }

    navigate('/');

    /** Show file content in a preview pane below the file list. */
    function showPreview(filePath, content) {
      let preview = container.querySelector('#file-preview');
      if (!preview) {
        preview = document.createElement('pre');
        preview.id = 'file-preview';
        preview.style.cssText = `
          margin-top:12px; padding:10px; background:#11111b;
          border:1px solid #45475a; border-radius:6px;
          color:#cdd6f4; font-size:12px; white-space:pre-wrap;
          word-break:break-all; max-height:200px; overflow-y:auto;
        `;
        container.appendChild(preview);
      }
      preview.textContent = `── ${filePath} ──\n${content}`;
    }
  },
};
