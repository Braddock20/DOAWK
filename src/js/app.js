/* app.js — bootstrap, lock, routing, mount views */
(function (global) {
  'use strict';
  const { h, ls, toast } = global.U;
  const S = global.S;
  const I = global.I;

  const TABS = [
    { id: 'home',     label: 'Home',     icon: () => I.home(22) },
    { id: 'search',   label: 'Search',   icon: () => I.search(22) },
    { id: 'pins',     label: 'Pins',     icon: () => I.pin(22) },
    { id: 'media',    label: 'Media',    icon: () => I.media(22) },
    { id: 'settings', label: 'Settings', icon: () => I.gear(22) },
  ];

  function buildShell() {
    const app = h('div', { id: 'app' });

    // Top bar
    const bar = h('div', { class: 'bar' }, [
      h('div', { class: 'title', id: 'title', text: 'Home' }),
      h('div', { style: { display: 'flex', gap: '4px' }, id: 'barActions' }),
    ]);
    app.appendChild(bar);

    // Views
    const views = h('div', { style: { flex: '1', minHeight: '0', display: 'flex' } });
    for (const t of TABS) {
      const v = h('section', { class: 'view', 'data-view': t.id });
      v.appendChild(h('div', { class: 'scroll', 'data-scroll': t.id, id: 'scroll-' + t.id }));
      views.appendChild(v);
    }
    const tv = h('section', { class: 'view', 'data-view': 'thread' });
    tv.appendChild(h('div', { class: 'scroll', id: 'scroll-thread' }));
    views.appendChild(tv);

    // Tags view (extra)
    const tagsv = h('section', { class: 'view', 'data-view': 'tags' });
    tagsv.appendChild(h('div', { class: 'scroll', id: 'scroll-tags' }));
    views.appendChild(tagsv);

    app.appendChild(views);

    // Composer
    const composer = h('div', { id: 'composer' });
    app.appendChild(composer);

    // Bottom nav
    const bnav = h('div', { class: 'bnav', id: 'bnav' });
    app.appendChild(bnav);

    document.body.appendChild(app);

    Composer.mount(composer);
    Feed.mount(); Thread.mount(); Pins.mount(); Tags.mount();
    MediaLib.mount(); Search.mount(); Settings.mount();
  }

  function buildNav() {
    const host = document.getElementById('bnav');
    host.innerHTML = '';
    for (const t of TABS) {
      const btn = h('button', { 'data-tab': t.id, onclick: () => go(t.id) }, [
        t.icon(),
        h('span', { text: t.label }),
      ]);
      host.appendChild(btn);
    }
    // Center compose button? No, just put one in the bar instead.
    // Update the bar to have a compose (+) action.
    const actions = document.getElementById('barActions');
    actions.innerHTML = '';
    actions.appendChild(h('button', { class: 'btn-icon', title: 'New entry', onclick: () => { go('home'); setTimeout(() => document.getElementById('cText')?.focus(), 30); } }, [I.plus(22)]));
  }

  function refreshCounts() {
    // optional counts on nav (omitted for cleanliness)
  }

  function updateTitle() {
    const t = S.active === 'thread' ? 'Thread' : S.active === 'tags' ? 'Tags' : (TABS.find((x) => x.id === S.active)?.label || 'Journal');
    const el = document.getElementById('title');
    if (el) el.textContent = t;
  }

  function go(id) {
    S.active = id;
    document.querySelectorAll('.bnav button').forEach((el) => el.classList.toggle('active', el.dataset.tab === id));
    document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.dataset.view === id));
    document.getElementById('composer').style.display = (id === 'thread' || id === 'settings' || id === 'search') ? 'none' : 'block';
    updateTitle();
    if (id === 'home')     Feed.refresh();
    if (id === 'search')   Search.refresh();
    if (id === 'pins')     Pins.refresh();
    if (id === 'tags')     Tags.refresh();
    if (id === 'media')    MediaLib.refresh();
    if (id === 'settings') Settings.refresh();
    if (id === 'thread' && S.threadId) Thread.refresh();
    const sc = document.getElementById('scroll-' + id);
    if (sc) sc.scrollTop = 0;
  }

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
  }

  function mountApp() {
    buildShell();
    buildNav();
    go('home');
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

  const Composer = global.Composer, Feed = global.Feed, Thread = global.Thread, Pins = global.Pins, Tags = global.Tags, MediaLib = global.MediaLib, Search = global.Search, Settings = global.Settings;
  global.App = { go, refreshCounts, applyTheme };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
