/* app.js — bootstrap, lock screen, routing, mount views */
(function (global) {
  'use strict';
  const { h, ls, toast, sha256 } = global.U;
  const S = global.S;
  const I = global.I;

  const TABS = [
    { id: 'home',     label: 'Home',     icon: () => I.home(20) },
    { id: 'search',   label: 'Search',   icon: () => I.search(20) },
    { id: 'pins',     label: 'Pins',     icon: () => I.pin(20) },
    { id: 'tags',     label: 'Tags',     icon: () => I.tag(20) },
    { id: 'media',    label: 'Media',    icon: () => I.media(20) },
    { id: 'settings', label: 'Settings', icon: () => I.gear(20) },
  ];

  function buildShell() {
    const app = h('div', { id: 'app' });

    // top bar
    const bar = h('div', { class: 'bar' });
    bar.appendChild(h('div', { class: 'title', id: 'title', text: 'Glass Journal' }));
    const actions = h('div', { style: { display: 'flex', gap: '4px', marginLeft: 'auto' } });
    bar.appendChild(actions);
    app.appendChild(bar);

    // tabs
    const tabs = h('div', { class: 'tabs', id: 'tabs' });
    app.appendChild(tabs);

    // views
    const views = h('div', { style: { flex: '1', minHeight: '0', display: 'flex' } });
    for (const t of TABS) {
      const v = h('section', { class: 'view', 'data-view': t.id });
      v.appendChild(h('div', { class: 'scroll', 'data-scroll': t.id, id: 'scroll-' + t.id }));
      views.appendChild(v);
    }
    // thread view (special)
    const tv = h('section', { class: 'view', 'data-view': 'thread' });
    tv.appendChild(h('div', { class: 'scroll', id: 'scroll-thread' }));
    views.appendChild(tv);
    app.appendChild(views);

    // composer
    const composer = h('div', { id: 'composer' });
    app.appendChild(composer);

    document.body.appendChild(app);

    Composer.mount(composer);
    Feed.mount();
    Thread.mount();
    Pins.mount();
    Tags.mount();
    MediaLib.mount();
    Search.mount();
    Settings.mount();
  }

  function buildTabs() {
    const host = document.getElementById('tabs');
    host.innerHTML = '';
    for (const t of TABS) {
      const btn = h('button', { class: 'tab', 'data-tab': t.id, onclick: () => go(t.id) }, [
        t.icon(),
        h('span', { text: t.label }),
        h('span', { class: 'n', id: 'cnt-' + t.id }),
      ]);
      host.appendChild(btn);
    }
    refreshCounts();
  }

  function refreshCounts() {
    const set = (id, n) => { const el = document.getElementById('cnt-' + id); if (el) el.textContent = n > 0 ? '·' + n : ''; };
    set('pins', (ls.get('pins', []) || []).length);
    set('tags', Object.keys(S.tags).length);
    let m = 0; for (const p of S.posts) m += (p.media || []).length; set('media', m);
  }

  function updateTitle() {
    const t = S.active === 'thread' ? 'Thread' : (TABS.find((x) => x.id === S.active)?.label || 'Glass Journal');
    const el = document.getElementById('title');
    if (el) el.textContent = t;
  }

  function setActions(buttons) {
    const top = document.querySelector('.bar > div:last-child');
    // re-grab — the actions div is the one with marginLeft:auto
    const all = document.querySelectorAll('.bar > div');
    const host = all[all.length - 1];
    host.innerHTML = '';
    for (const b of (buttons || [])) host.appendChild(b);
  }

  function go(id) {
    S.active = id;
    document.querySelectorAll('.tab').forEach((el) => el.classList.toggle('active', el.dataset.tab === id));
    document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.dataset.view === id));
    document.getElementById('composer').style.display = id === 'thread' ? 'none' : 'block';
    updateTitle();
    setActions([h('button', { class: 'btn-icon', title: 'New', onclick: () => { go('home'); setTimeout(() => document.getElementById('cText')?.focus(), 30); } }, [I.plus(22)])]);
    if (id === 'home')     Feed.refresh();
    if (id === 'search')   Search.refresh();
    if (id === 'pins')     Pins.refresh();
    if (id === 'tags')     Tags.refresh();
    if (id === 'media')    MediaLib.refresh();
    if (id === 'settings') Settings.refresh();
    if (id === 'thread' && S.threadId) Thread.refresh();
    // reset scroll to top
    const sc = document.getElementById('scroll-' + id);
    if (sc) sc.scrollTop = 0;
  }

  /* ---------- lock screen ---------- */
  function showLock() {
    const lock = h('div', { class: 'lock' });
    const pw = h('input', { type: 'password', placeholder: 'Passcode', inputMode: 'numeric', pattern: '[0-9]*', autocomplete: 'off' });
    const err = h('div', { class: 'err' });
    const form = h('form', { onsubmit: (e) => { e.preventDefault(); tryUnlock(); } }, [
      pw,
      h('button', { class: 'unlock', text: 'Unlock', type: 'submit' }),
      err,
    ]);
    lock.append(
      h('div', { class: 'logo' }, [I.lock(28)]),
      h('h1', { text: 'Glass Journal' }),
      h('p', { text: 'Enter your passcode to continue.' }),
      form,
    );
    document.body.appendChild(lock);
    setTimeout(() => pw.focus(), 100);

    async function tryUnlock() {
      if (await S.checkPw(pw.value)) { lock.remove(); mountApp(); }
      else { err.textContent = 'Wrong passcode'; pw.value = ''; pw.focus(); }
    }
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', S.theme);
    if (S.bg) {
      document.documentElement.classList.add('has-bg');
      document.documentElement.style.setProperty('--bg-image', `url("${S.bg}")`);
    } else {
      document.documentElement.classList.remove('has-bg');
    }
  }

  function mountApp() {
    buildShell();
    buildTabs();
    go('home');
    Feed.refresh();
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  function boot() {
    S.hydrate();
    applyTheme();
    const splash = document.getElementById('splash');
    if (splash) { splash.classList.add('gone'); setTimeout(() => splash.remove(), 200); }

    if (S.pwHash) showLock(); else mountApp();
    registerSW();

    window.addEventListener('error', (e) => console.error('[gj]', e.error || e.message));
    window.addEventListener('unhandledrejection', (e) => console.error('[gj]', e.reason));
  }

  // modules wired in via other files
  const Composer = global.Composer, Feed = global.Feed, Thread = global.Thread, Pins = global.Pins, Tags = global.Tags, MediaLib = global.MediaLib, Search = global.Search, Settings = global.Settings;
  global.App = { go, refreshCounts, applyTheme };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
