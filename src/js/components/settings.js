/* settings.js — preferences, password gate, theme, background, display name, avatar, export, danger zone */
(function (global) {
  'use strict';
  const { h, toast, ls, confirm: confirmSheet, copy } = window.Util;
  const Icons = window.Icons;
  const Store = window.Store;

  const THEMES = [
    { id: 'dark',     label: 'Midnight' },
    { id: 'light',    label: 'Daylight' },
    { id: 'midnight', label: 'Aurora' },
    { id: 'sunset',   label: 'Sunset' },
    { id: 'forest',   label: 'Forest' },
  ];

  function ensureMounted() { /* lazy — full mount happens in mount() */ }

  function mount() {
    const host = document.getElementById('settingsScroll');
    host.innerHTML = '';

    host.appendChild(buildProfileSection());
    host.appendChild(buildAppearanceSection());
    host.appendChild(buildPrivacySection());
    host.appendChild(buildDataSection());
    host.appendChild(buildAboutSection());

    bindAvatarInput();
  }

  /* ---------- Profile ---------- */
  function buildProfileSection() {
    const sec = h('div', { class: 'settings-section' });
    sec.appendChild(h('h3', { text: 'Profile' }));

    const avatar = h('div', { class: 'avatar', id: 'settingsAvatar' });
    refreshAvatar(avatar);

    const nameInput = h('input', { type: 'text', placeholder: 'Display name', value: Store.state.displayName || '', maxlength: 32 });
    nameInput.addEventListener('change', () => { Store.set({ displayName: nameInput.value.trim() || 'You' }); Store.persistPrefs(); toast('Name saved', 'success', 1200); });

    sec.appendChild(h('div', { class: 'set-row' }, [
      avatar,
      h('div', { class: 'body' }, [
        h('div', { class: 'l', text: 'Display name' }),
        nameInput,
      ]),
    ]));

    sec.appendChild(h('div', { class: 'set-row', onclick: () => changeAvatar() }, [
      h('div', { class: 'ic' }, [Icons.user()]),
      h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Profile picture' }), h('div', { class: 's', text: 'Choose from your photo library. Stored only on this device.' })]),
      h('div', { class: 'val', text: '›' }),
    ]));

    sec.appendChild(h('div', { class: 'set-row' }, [
      h('div', { class: 'ic' }, [Icons.link()]),
      h('div', { class: 'body' }, [h('div', { class: 'l', text: 'API endpoint' }), h('div', { class: 's', text: 'Glass Journal server' })]),
      h('div', { class: 'val', id: 'apiBaseVal', text: shortApi() }),
    ]));

    const apiInput = h('input', { type: 'url', placeholder: 'https://thread-07jf.onrender.com', value: Api.getBase() });
    apiInput.style.cssText = 'width:100%;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);margin-top:6px;';
    sec.appendChild(h('div', { class: 'set-row' }, [
      h('div', { class: 'body', style: { flex: 1 } }, [h('div', { class: 'l', text: 'Change server' }), apiInput]),
      h('button', { class: 'tab', style: { marginLeft: '8px' }, onclick: () => {
        Api.setBase(apiInput.value);
        toast('Server updated', 'success');
        mount();
      } }, 'Save'),
    ]));

    return sec;
  }

  function shortApi() {
    try { const u = new URL(Api.getBase()); return u.host; } catch { return Api.getBase(); }
  }
  function refreshAvatar(host) {
    host.innerHTML = '';
    if (Store.state.avatar) {
      const img = new Image(); img.src = Store.state.avatar; host.appendChild(img);
    } else {
      host.appendChild(h('div', { class: 'ic' }, [Icons.user()]));
    }
  }

  function bindAvatarInput() {
    const inp = document.getElementById('settingsAvatarInput');
    if (!inp) return;
    inp.addEventListener('change', () => {
      const f = inp.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        // Downscale to 256px before storing
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          const max = 256;
          const ratio = Math.min(1, max / Math.max(img.width, img.height));
          c.width = Math.round(img.width * ratio);
          c.height = Math.round(img.height * ratio);
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, c.width, c.height);
          Store.set({ avatar: c.toDataURL('image/jpeg', 0.85) });
          Store.persistPrefs();
          toast('Avatar updated', 'success');
          mount();
        };
        img.src = r.result;
      };
      r.readAsDataURL(f);
    });
  }
  function changeAvatar() {
    let inp = document.getElementById('settingsAvatarInput');
    if (!inp) {
      inp = h('input', { type: 'file', accept: 'image/*', id: 'settingsAvatarInput', style: { display: 'none' } });
      document.body.appendChild(inp);
      bindAvatarInput();
    }
    inp.click();
  }

  /* ---------- Appearance ---------- */
  function buildAppearanceSection() {
    const sec = h('div', { class: 'settings-section' });
    sec.appendChild(h('h3', { text: 'Appearance' }));

    const swatches = h('div', { class: 'theme-swatches', style: { padding: '4px 18px 8px' } });
    THEMES.forEach((t) => {
      const s = h('button', { class: 'theme-swatch' + (Store.state.theme === t.id ? ' active' : ''), dataset: { t: t.id }, title: t.label, onclick: () => {
        Store.set({ theme: t.id });
        Store.persistPrefs();
        App.applyTheme();
        mount();
      } });
      swatches.appendChild(s);
    });
    sec.appendChild(h('div', { class: 'set-row', style: { display: 'block' } }, [
      h('div', { class: 'l', text: 'Theme' }),
      swatches,
    ]));

    // Bubble style
    const bubbleColors = ['auto', 'purple', 'blue', 'pink', 'green', 'orange', 'mono'];
    const swatches2 = h('div', { class: 'theme-swatches' });
    bubbleColors.forEach((c) => {
      const s = h('button', { class: 'theme-swatch' + (Store.state.accent === c ? ' active' : ''), title: c, onclick: () => { Store.set({ accent: c }); Store.persistPrefs(); applyAccent(); mount(); } });
      s.style.background = bubblePreview(c);
      swatches2.appendChild(s);
    });
    sec.appendChild(h('div', { class: 'set-row', style: { display: 'block' } }, [
      h('div', { class: 'l', text: 'Accent color' }),
      swatches2,
    ]));

    // Background image
    sec.appendChild(h('div', { class: 'set-row', onclick: pickBackground }, [
      h('div', { class: 'ic' }, [Icons.image()]),
      h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Custom background' }), h('div', { class: 's', text: Store.state.bg ? 'Tap to change' : 'Use a photo as the app background' })]),
      h('div', { class: 'val', text: Store.state.bg ? 'On' : 'Off' }),
    ]));
    if (Store.state.bg) {
      sec.appendChild(h('div', { class: 'set-row', onclick: removeBackground }, [
        h('div', { class: 'ic' }, [Icons.close()]),
        h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Remove background' })]),
      ]));
    }

    // Haptics (toggle) — placeholder using vibration API
    sec.appendChild(h('div', { class: 'set-row', onclick: (e) => { toggleRow(e, 'haptics', true); mount(); } }, [
      h('div', { class: 'ic' }, [Icons.flame()]),
      h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Haptic feedback' }), h('div', { class: 's', text: 'Vibrate on send / actions' })]),
      h('div', { class: 'toggle' + (ls.get('haptics', true) ? ' on' : '') }),
    ]));

    return sec;
  }

  function bubblePreview(c) {
    if (c === 'auto')  return 'linear-gradient(135deg, #a78bfa, #f472b6)';
    if (c === 'purple')return 'linear-gradient(135deg, #8b5cf6, #c084fc)';
    if (c === 'blue')  return 'linear-gradient(135deg, #3b82f6, #06b6d4)';
    if (c === 'pink')  return 'linear-gradient(135deg, #ec4899, #fb7185)';
    if (c === 'green') return 'linear-gradient(135deg, #10b981, #84cc16)';
    if (c === 'orange')return 'linear-gradient(135deg, #f59e0b, #f97316)';
    if (c === 'mono')  return 'linear-gradient(135deg, #52525b, #a1a1aa)';
    return 'linear-gradient(135deg, #a78bfa, #f472b6)';
  }
  function applyAccent() {
    const c = Store.state.accent || 'auto';
    const map = {
      purple: ['#8b5cf6', '#c084fc', '#fbbf24'],
      blue:   ['#3b82f6', '#06b6d4', '#7dd3fc'],
      pink:   ['#ec4899', '#fb7185', '#fda4af'],
      green:  ['#10b981', '#84cc16', '#a3e635'],
      orange: ['#f59e0b', '#f97316', '#fbbf24'],
      mono:   ['#52525b', '#a1a1aa', '#d4d4d8'],
      auto:   null,
    };
    const v = map[c];
    if (v) {
      document.documentElement.style.setProperty('--accent', v[0]);
      document.documentElement.style.setProperty('--accent-2', v[1]);
      document.documentElement.style.setProperty('--accent-3', v[2]);
      document.documentElement.style.setProperty('--me', v[0]);
      document.documentElement.style.setProperty('--me-2', v[1]);
    } else {
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accent-2');
      document.documentElement.style.removeProperty('--accent-3');
      document.documentElement.style.removeProperty('--me');
      document.documentElement.style.removeProperty('--me-2');
    }
  }

  function toggleRow(e, key, fallback) {
    const v = !ls.get(key, fallback);
    ls.set(key, v);
  }
  function pickBackground() {
    let inp = document.getElementById('bgInput');
    if (!inp) {
      inp = h('input', { type: 'file', accept: 'image/*', id: 'bgInput', style: { display: 'none' } });
      inp.addEventListener('change', () => {
        const f = inp.files?.[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          const img = new Image();
          img.onload = () => {
            // downscale for storage
            const c = document.createElement('canvas');
            const max = 1280;
            const ratio = Math.min(1, max / Math.max(img.width, img.height));
            c.width = Math.round(img.width * ratio);
            c.height = Math.round(img.height * ratio);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            Store.set({ bg: c.toDataURL('image/jpeg', 0.7) });
            Store.persistPrefs();
            App.applyTheme();
            toast('Background set', 'success');
            mount();
          };
          img.src = r.result;
        };
        r.readAsDataURL(f);
      });
      document.body.appendChild(inp);
    }
    inp.click();
  }
  function removeBackground() {
    Store.set({ bg: null }); Store.persistPrefs(); App.applyTheme(); mount();
  }

  /* ---------- Privacy (password gate) ---------- */
  function buildPrivacySection() {
    const sec = h('div', { class: 'settings-section' });
    sec.appendChild(h('h3', { text: 'Privacy' }));

    sec.appendChild(h('div', { class: 'set-row', onclick: () => changePassword() }, [
      h('div', { class: 'ic' }, [Store.state.passwordHash ? Icons.lock() : Icons.unlock()]),
      h('div', { class: 'body' }, [
        h('div', { class: 'l', text: Store.state.passwordHash ? 'Change passcode' : 'Set a passcode' }),
        h('div', { class: 's', text: Store.state.passwordHash ? 'Stored locally as a salted hash.' : 'Lock the app on launch with a 4–8 digit code.' }),
      ]),
      h('div', { class: 'val', text: Store.state.passwordHash ? 'On' : 'Off' }),
    ]));

    if (Store.state.passwordHash) {
      sec.appendChild(h('div', { class: 'set-row', onclick: async () => {
        const ok = await confirmSheet({ title: 'Remove passcode?', body: 'Anyone with this device will be able to read your journal.', confirmText: 'Remove', danger: true });
        if (!ok) return;
        await Store.setPassword('');
        toast('Passcode removed', 'success');
        mount();
      }}, [
        h('div', { class: 'ic' }, [Icons.unlock()]),
        h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Remove passcode' })]),
      ]));
    }

    sec.appendChild(h('div', { class: 'set-row', onclick: () => toggleLocalOnly() }, [
      h('div', { class: 'ic' }, [Icons.eye()]),
      h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Auto-lock' }), h('div', { class: 's', text: 'Lock when the app is backgrounded for 30s' })]),
      h('div', { class: 'toggle' + (ls.get('autolock', true) ? ' on' : '') }),
    ]));

    return sec;
  }

  function toggleLocalOnly() {
    const v = !ls.get('autolock', true);
    ls.set('autolock', v);
    mount();
  }

  async function changePassword() {
    const pw1 = h('input', { type: 'password', placeholder: 'New passcode (4–8 digits)', inputmode: 'numeric' });
    const pw2 = h('input', { type: 'password', placeholder: 'Confirm', inputmode: 'numeric' });
    const back = Util.openModal(h('div', {}, [
      h('h2', { text: Store.state.passwordHash ? 'Change passcode' : 'Set passcode' }),
      h('div', { style: { padding: '0 18px', display: 'flex', flexDirection: 'column', gap: '10px' } }, [pw1, pw2]),
      h('p', { class: 'muted', style: { padding: '8px 18px 0', fontSize: '12px' }, text: 'Stored only on this device as a salted SHA-256 hash. We can\'t recover it for you.' }),
      h('div', { class: 'actions' }, [
        h('button', { class: 'ghost', text: 'Cancel', onclick: () => Util.closeModal(back) }),
        h('button', { class: 'primary', text: 'Save', onclick: async () => {
          if (!/^\d{4,8}$/.test(pw1.value)) { toast('Use 4–8 digits', 'error'); return; }
          if (pw1.value !== pw2.value) { toast('Codes don\'t match', 'error'); return; }
          await Store.setPassword(pw1.value);
          Util.closeModal(back);
          toast('Passcode saved', 'success');
          mount();
        }}),
      ]),
    ]));
  }

  /* ---------- Data (export, cache, danger) ---------- */
  function buildDataSection() {
    const sec = h('div', { class: 'settings-section' });
    sec.appendChild(h('h3', { text: 'Data' }));

    sec.appendChild(h('div', { class: 'set-row', onclick: exportAll }, [
      h('div', { class: 'ic' }, [Icons.export()]),
      h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Export all entries' }), h('div', { class: 's', text: 'Download a JSON file of every entry and media URL.' })]),
      h('div', { class: 'val', text: 'JSON' }),
    ]));

    sec.appendChild(h('div', { class: 'set-row', onclick: exportMarkdown }, [
      h('div', { class: 'ic' }, [Icons.doc()]),
      h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Export as Markdown' }), h('div', { class: 's', text: 'Human-readable archive grouped by date.' })]),
      h('div', { class: 'val', text: '.md' }),
    ]));

    sec.appendChild(h('div', { class: 'set-row', onclick: copySummary }, [
      h('div', { class: 'ic' }, [Icons.copy()]),
      h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Copy timeline summary' }), h('div', { class: 's', text: 'A quick text snapshot of your journal.' })]),
    ]));

    sec.appendChild(h('div', { class: 'set-row', onclick: clearCache }, [
      h('div', { class: 'ic' }, [Icons.refresh()]),
      h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Clear local cache' }), h('div', { class: 's', text: 'Removes cached images & offline data. Your entries stay safe.' })]),
    ]));

    sec.appendChild(h('div', { class: 'set-row', onclick: dangerZone }, [
      h('div', { class: 'ic', style: { background: 'rgba(255,90,90,0.15)', color: 'var(--danger)' } }, [Icons.trash()]),
      h('div', { class: 'body' }, [
        h('div', { class: 'l', style: { color: 'var(--danger)' }, text: 'Danger zone' }),
        h('div', { class: 's', text: 'Delete all entries from the server (cannot be undone).' }),
      ]),
    ]));

    return sec;
  }

  async function exportAll() {
    toast('Preparing export…', '', 1500);
    try {
      const all = [];
      let cursor = null;
      do {
        const { posts, next_cursor } = await Api.listPosts(cursor, 100);
        all.push(...posts);
        cursor = next_cursor;
      } while (cursor);
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), count: all.length, posts: all }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      Util.saveAs(url, 'journal-export-' + Date.now() + '.json');
      URL.revokeObjectURL(url);
      toast('Exported ' + all.length + ' entries', 'success');
    } catch (e) { toast('Export failed: ' + (e.body?.error || e.message), 'error'); }
  }

  async function exportMarkdown() {
    toast('Preparing Markdown…', '', 1500);
    try {
      const all = [];
      let cursor = null;
      do {
        const { posts, next_cursor } = await Api.listPosts(cursor, 100);
        all.push(...posts);
        cursor = next_cursor;
      } while (cursor);
      // Sort ascending (oldest first) for a journal
      all.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const lines = ['# Glass Journal Export', '', '_Exported ' + new Date().toLocaleString() + '_', ''];
      for (const p of all) {
        const d = new Date(p.created_at);
        lines.push('## ' + d.toLocaleString());
        if (p.tags?.length) lines.push('`' + p.tags.map(t => '#' + t).join(' ') + '`');
        if (p.content) lines.push('', p.content);
        if (p.media?.length) {
          lines.push('', '**Media:**');
          for (const m of p.media) lines.push('- [' + m.type + '](' + m.url + ')' + (m.filename ? ' — ' + m.filename : ''));
        }
        lines.push('', '---', '');
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      Util.saveAs(url, 'journal-' + Date.now() + '.md');
      URL.revokeObjectURL(url);
      toast('Markdown saved', 'success');
    } catch (e) { toast('Export failed: ' + (e.body?.error || e.message), 'error'); }
  }

  async function copySummary() {
    const n = Store.state.timeline.length;
    const tags = Object.entries(Store.state.tags).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t, c]) => '#' + t + ' (' + c + ')').join(', ');
    const media = Store.state.timeline.reduce((s, p) => s + (p.media?.length || 0), 0);
    const text = 'Glass Journal summary\n' + n + ' entries\n' + media + ' media files\nTop tags: ' + (tags || '—') + '\n';
    copy(text).then((ok) => toast(ok ? 'Copied' : 'Copy failed', ok ? 'success' : 'error'));
  }

  async function clearCache() {
    if (window.caches) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        toast('Cache cleared', 'success');
      } catch (e) { toast('Couldn\'t clear cache', 'error'); }
    }
  }

  async function dangerZone() {
    const code = await promptCode();
    if (code !== 'DELETE') { toast('Cancelled', '', 1200); return; }
    toast('Deleting all entries…', '', 2000);
    let cursor = null, total = 0;
    do {
      const { posts, next_cursor } = await Api.listPosts(cursor, 100);
      for (const p of posts) {
        try { await Api.deletePost(p.id); total++; } catch {}
      }
      cursor = next_cursor;
    } while (cursor);
    Store.state.timeline = []; Store.state.byId = {}; Store.state.tags = {}; Store.recomputeTags();
    App.refreshTabBadges();
    toast('Deleted ' + total + ' entries', 'success');
  }
  function promptCode() {
    return new Promise((resolve) => {
      const inp = h('input', { type: 'text', placeholder: 'Type DELETE to confirm', style: { padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', width: '100%' } });
      const back = Util.openModal(h('div', {}, [
        h('h2', { text: 'Delete all entries?' }),
        h('p', { class: 'muted', style: { padding: '0 18px 12px', fontSize: '13px' }, text: 'This permanently deletes every entry from the server. Type DELETE to confirm.' }),
        h('div', { style: { padding: '0 18px' } }, [inp]),
        h('div', { class: 'actions' }, [
          h('button', { class: 'ghost', text: 'Cancel', onclick: () => { Util.closeModal(back); resolve(null); } }),
          h('button', { class: 'danger', text: 'Delete everything', onclick: () => { Util.closeModal(back); resolve(inp.value); } }),
        ]),
      ]));
    });
  }

  /* ---------- About ---------- */
  function buildAboutSection() {
    const sec = h('div', { class: 'settings-section' });
    sec.appendChild(h('h3', { text: 'About' }));

    sec.appendChild(h('div', { class: 'set-row' }, [
      h('div', { class: 'ic' }, [Icons.info()]),
      h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Glass Journal' }), h('div', { class: 's', text: 'v1.0.0 — a private PWA diary.' })]),
    ]));

    sec.appendChild(h('div', { class: 'set-row', onclick: () => { copy('https://github.com/'); toast('Tip copied', 'success'); } }, [
      h('div', { class: 'ic' }, [Icons.link()]),
      h('div', { class: 'body' }, [h('div', { class: 'l', text: 'Self-host & open source' }), h('div', { class: 's', text: 'All your data lives on the Glass Journal API.' })]),
    ]));

    return sec;
  }

  global.Settings = { mount, ensureMounted, applyAccent };
})(window);
