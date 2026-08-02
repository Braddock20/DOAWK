/* settings.js */
(function (global) {
  'use strict';
  const { h, toast, ls, copy, sheet, closeSheet, confirm, saveAs } = global.U;
  const S = global.S;
  const I = global.I;

  const THEMES = [
    { id: 'light', color: '#fff', label: 'Light' },
    { id: 'dark', color: '#1c1c1e', label: 'Dark' },
  ];

  function mount() {}
  function refresh() {
    const sc = document.getElementById('scroll-settings');
    sc.innerHTML = '';
    const root = h('div', { class: 'settings' });

    /* Profile */
    root.appendChild(h('h3', { text: 'Profile' }));
    const av = h('div', { class: 'avatar' });
    if (S.avatar) { const img = new Image(); img.src = S.avatar; av.appendChild(img); } else av.appendChild(I.user(20));
    const nameInp = h('input', { type: 'text', value: S.displayName, placeholder: 'Display name', oninput: (e) => { S.displayName = e.target.value; S.save(); } });
    root.appendChild(h('div', { class: 'row' }, [av, h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Display name' }), nameInp])]));
    const fileInp = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    fileInp.addEventListener('change', () => {
      const f = fileInp.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 256; const ratio = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * ratio); c.height = Math.round(img.height * ratio);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          S.avatar = c.toDataURL('image/jpeg', 0.85); S.save();
          refresh();
        };
        img.src = r.result;
      };
      r.readAsDataURL(f);
    });
    document.body.appendChild(fileInp);
    root.appendChild(h('div', { class: 'row', onclick: () => fileInp.click() }, [h('div', { class: 'ic' }, [I.image(16)]), h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Profile picture' }), h('div', { class: 's', text: 'Stored only on this device' })]), h('div', { class: 'v', text: '›' })]));
    if (S.avatar) {
      root.appendChild(h('div', { class: 'row', onclick: () => { S.avatar = null; S.save(); refresh(); } }, [h('div', { class: 'ic' }, [I.close(16)]), h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Remove picture' })])]));
    }

    /* Appearance */
    root.appendChild(h('h3', { text: 'Appearance' }));
    const themeRow = h('div', { class: 'theme-row' });
    for (const t of THEMES) {
      themeRow.appendChild(h('button', { class: 'theme-dot' + (S.theme === t.id ? ' on' : ''), style: { background: t.color }, title: t.label, onclick: () => { S.theme = t.id; S.save(); App.applyTheme(); refresh(); } }));
    }
    root.appendChild(themeRow);
    root.appendChild(h('div', { class: 'row', onclick: pickBg }, [h('div', { class: 'ic' }, [I.image(16)]), h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Custom background' }), h('div', { class: 's', text: S.bg ? 'Tap to change' : 'Use a photo as the background' })]), h('div', { class: 'v', text: S.bg ? 'On' : 'Off' })]));
    if (S.bg) root.appendChild(h('div', { class: 'row', onclick: () => { S.bg = null; S.save(); App.applyTheme(); refresh(); } }, [h('div', { class: 'ic' }, [I.close(16)]), h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Remove background' })])]));

    /* Privacy */
    root.appendChild(h('h3', { text: 'Privacy' }));
    root.appendChild(h('div', { class: 'row', onclick: changePw }, [h('div', { class: 'ic' }, [I.lock(16)]), h('div', { class: 'body' }, [h('div', { class: 'l', text: S.pwHash ? 'Change passcode' : 'Set a passcode' }), h('div', { class: 's', text: S.pwHash ? 'Salted SHA-256, on this device' : 'Lock on launch' })]), h('div', { class: 'v', text: S.pwHash ? 'On' : 'Off' })]));
    if (S.pwHash) root.appendChild(h('div', { class: 'row', onclick: async () => { const ok = await confirm({ title: 'Remove passcode?', confirmText: 'Remove', danger: true }); if (ok) { await S.setPw(''); refresh(); } } }, [h('div', { class: 'ic' }, [I.lock(16)]), h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Remove passcode' })])]));

    /* Data */
    root.appendChild(h('h3', { text: 'Data' }));
    root.appendChild(h('div', { class: 'row', onclick: exportJson }, [h('div', { class: 'ic' }, [I.export_(16)]), h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Export as JSON' })]), h('div', { class: 'v', text: '.json' })]));
    root.appendChild(h('div', { class: 'row', onclick: exportMd }, [h('div', { class: 'ic' }, [I.export_(16)]), h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Export as Markdown' })]), h('div', { class: 'v', text: '.md' })]));
    root.appendChild(h('div', { class: 'row', onclick: clearCache }, [h('div', { class: 'ic' }, [I.refresh(16)]), h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Clear cache' }), h('div', { class: 's', text: 'Removes offline data. Entries stay safe.' })]), h('div', { class: 'v', text: '›' })]));
    root.appendChild(h('div', { class: 'row', onclick: dangerZone }, [h('div', { class: 'ic' }, [I.trash(16)]), h('div', { class: 'body' }, [h('div', { class: 'l', style: { color: '#ff3b30' }, text: 'Delete all entries' }), h('div', { class: 's', text: 'Cannot be undone' })])]));

    /* About */
    root.appendChild(h('h3', { text: 'About' }));
    root.appendChild(h('div', { class: 'row' }, [h('div', { class: 'ic' }, [I.bookmark(16)]), h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Glass Journal' }), h('div', { class: 's', text: 'v1.0.0 · PWA diary' })])]));

    sc.appendChild(root);
  }

  function pickBg() {
    let inp = document.getElementById('bgInp');
    if (!inp) {
      inp = h('input', { type: 'file', accept: 'image/*', id: 'bgInp', style: { display: 'none' } });
      inp.addEventListener('change', () => {
        const f = inp.files?.[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          const img = new Image();
          img.onload = () => {
            const max = 1280; const ratio = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * ratio); c.height = Math.round(img.height * ratio);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            S.bg = c.toDataURL('image/jpeg', 0.7); S.save(); App.applyTheme(); refresh();
          };
          img.src = r.result;
        };
        r.readAsDataURL(f);
      });
      document.body.appendChild(inp);
    }
    inp.click();
  }

  function changePw() {
    const p1 = h('input', { type: 'password', placeholder: 'New passcode (4–8 digits)', inputMode: 'numeric' });
    const p2 = h('input', { type: 'password', placeholder: 'Confirm', inputMode: 'numeric' });
    const s = sheet([
      h('h2', { text: S.pwHash ? 'Change passcode' : 'Set passcode' }),
      h('div', { style: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' } }, [p1, p2]),
      h('div', { class: 'actions' }, [
        h('button', { class: 'ghost', text: 'Cancel', onclick: () => closeSheet(s) }),
        h('button', { class: 'primary', text: 'Save', onclick: async () => {
          if (!/^\d{4,8}$/.test(p1.value)) { toast('Use 4–8 digits', 'error'); return; }
          if (p1.value !== p2.value) { toast('Codes don\'t match', 'error'); return; }
          await S.setPw(p1.value);
          closeSheet(s);
          toast('Passcode saved', 'success');
          refresh();
        }}),
      ]),
    ]);
  }

  async function exportJson() {
    toast('Exporting…', '', 1500);
    try {
      const all = []; let cursor = null;
      do { const { posts, next_cursor } = await A.list(cursor, 100); all.push(...posts); cursor = next_cursor; } while (cursor);
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), count: all.length, posts: all }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      saveAs(url, 'journal-' + Date.now() + '.json'); URL.revokeObjectURL(url);
      toast('Exported ' + all.length + ' entries', 'success');
    } catch (e) { toast('Export failed: ' + e.message, 'error'); }
  }

  async function exportMd() {
    toast('Exporting…', '', 1500);
    try {
      const all = []; let cursor = null;
      do { const { posts, next_cursor } = await A.list(cursor, 100); all.push(...posts); cursor = next_cursor; } while (cursor);
      all.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const lines = ['# Glass Journal', '', '_Exported ' + new Date().toLocaleString() + '_', ''];
      for (const p of all) {
        lines.push('## ' + new Date(p.created_at).toLocaleString());
        if (p.tags?.length) lines.push('`' + p.tags.map((t) => '#' + t).join(' ') + '`');
        if (p.content) lines.push('', p.content);
        if (p.media?.length) { lines.push('', '**Media:**'); for (const m of p.media) lines.push('- [' + m.type + '](' + m.url + ')' + (m.filename ? ' — ' + m.filename : '')); }
        lines.push('', '---', '');
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      saveAs(url, 'journal-' + Date.now() + '.md'); URL.revokeObjectURL(url);
      toast('Markdown saved', 'success');
    } catch (e) { toast('Export failed: ' + e.message, 'error'); }
  }

  async function clearCache() {
    if (window.caches) { try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); toast('Cache cleared', 'success'); } catch (e) { toast('Couldn\'t clear', 'error'); } }
  }

  async function dangerZone() {
    const code = await promptCode();
    if (code !== 'DELETE') return;
    toast('Deleting all entries…', '', 2000);
    let cursor = null, total = 0;
    do {
      const { posts, next_cursor } = await A.list(cursor, 100);
      for (const p of posts) { try { await A.del(p.id); total++; } catch {} }
      cursor = next_cursor;
    } while (cursor);
    S.posts = []; S.byId = {}; S.tags = {}; S.recomputeTags();
    App.refreshCounts();
    toast('Deleted ' + total + ' entries', 'success');
  }

  function promptCode() {
    return new Promise((resolve) => {
      const inp = h('input', { type: 'text', placeholder: 'Type DELETE to confirm' });
      const s = sheet([
        h('h2', { text: 'Delete all entries?' }),
        h('p', { class: 'muted', style: { margin: '0 16px 8px', fontSize: '13px' }, text: 'This permanently removes every entry from the server.' }),
        h('div', { style: { padding: '0 16px' } }, [inp]),
        h('div', { class: 'actions' }, [
          h('button', { class: 'ghost', text: 'Cancel', onclick: () => { closeSheet(s); resolve(null); } }),
          h('button', { class: 'danger', text: 'Delete all', onclick: () => { closeSheet(s); resolve(inp.value); } }),
        ]),
      ]);
    });
  }

  global.Settings = { mount, refresh };
})(window);
