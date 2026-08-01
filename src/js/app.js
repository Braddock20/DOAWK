/* app.js — bootstrap, lock screen, tab routing, install prompt, PWA wiring */
(function (global) {
  'use strict';

  const { h, ls, toast, confirm: confirmSheet } = window.Util;
  const Store = window.Store;
  const Icons = window.Icons;

  /* ---------- DOM bootstrap ---------- */
  function buildShell() {
    const app = h('div', { id: 'app' });

    // Top bar
    const top = h('header', { class: 'top' }, [
      h('div', { class: 'brand' }, [
        h('div', { class: 'logo', id: 'brandLogo' }, [h('span', { text: 'G' })]),
        h('div', { class: 'titles' }, [
          h('div', { class: 'name', id: 'brandName', text: 'Glass Journal' }),
          h('div', { class: 'sub', id: 'brandSub', text: 'A private place for your thoughts' }),
        ]),
      ]),
      h('div', { class: 'actions', id: 'topActions' }),
    ]);

    // Tabs
    const tabs = h('nav', { class: 'tabs', id: 'tabs' });

    // Views
    const views = h('main', { id: 'views' }, [
      h('section', { class: 'view', 'data-view': 'home' },    [h('div', { class: 'scroll pad-bottom', id: 'homeScroll' },    [h('div', { class: 'feed', id: 'feed' })])]),
      h('section', { class: 'view', 'data-view': 'search' },  [h('div', { class: 'search-bar', id: 'searchBar' }),        h('div', { class: 'scroll pad-bottom', id: 'searchResults' }, [h('div', { class: 'suggest-list', id: 'suggestList' })])]),
      h('section', { class: 'view', 'data-view': 'pins' },    [h('div', { class: 'scroll pad-bottom', id: 'pinsScroll' },   [h('div', { class: 'feed', id: 'pinFeed' })])]),
      h('section', { class: 'view', 'data-view': 'tags' },    [h('div', { class: 'scroll pad-bottom', id: 'tagsScroll' },   [h('div', { class: 'tag-cloud', id: 'tagCloud' })])]),
      h('section', { class: 'view', 'data-view': 'media' },   [h('div', { class: 'scroll pad-bottom', id: 'mediaScroll' },  [h('div', { class: 'library-grid', id: 'mediaGrid' })])]),
      h('section', { class: 'view', 'data-view': 'settings' },[h('div', { class: 'scroll pad-bottom', id: 'settingsScroll' })]),
      h('section', { class: 'view', 'data-view': 'thread' },  [h('div', { class: 'scroll pad-bottom', id: 'threadScroll' }, [h('div', { class: 'feed', id: 'threadFeed' })])]),
    ]);

    // Composer (docked)
    const composerHost = h('div', { id: 'composerHost' });

    // Toast
    const toastWrap = h('div', { class: 'toast-wrap' });

    // Install prompt
    const install = h('div', { class: 'install-prompt', id: 'installPrompt' }, [
      h('div', { class: 'body' }, [
        h('div', { class: 'ttl', text: 'Install Glass Journal' }),
        h('div', { class: 'sub', text: 'Add to your home screen for a fullscreen app experience.' }),
      ]),
      h('button', { class: 'dismiss', text: 'Later', onclick: (e) => { e.currentTarget.closest('.install-prompt').classList.remove('show'); } }),
      h('button', { class: 'install', text: 'Install', onclick: (e) => triggerInstall(e) }),
    ]);

    app.append(top, tabs, views, composerHost, toastWrap, install);
    document.body.appendChild(app);
  }

  /* ---------- Tab bar ---------- */
  const TAB_DEFS = [
    { id: 'home',    label: 'Home',    icon: () => Icons.home() },
    { id: 'search',  label: 'Search',  icon: () => Icons.search() },
    { id: 'pins',    label: 'Pinned',  icon: () => Icons.pin() },
    { id: 'tags',    label: 'Tags',    icon: () => Icons.tag() },
    { id: 'media',   label: 'Media',   icon: () => Icons.media() },
    { id: 'settings',label: 'Settings',icon: () => Icons.settings() },
  ];

  function buildTabs() {
    const host = document.getElementById('tabs');
    host.innerHTML = '';
    for (const t of TAB_DEFS) {
      const btn = h('button', { class: 'tab', 'data-tab': t.id, onclick: () => switchTab(t.id) }, [
        t.icon(),
        h('span', { text: t.label }),
      ]);
      host.appendChild(btn);
    }
    refreshTabBadges();
  }

  function refreshTabBadges() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((el) => {
      const id = el.dataset.tab;
      const old = el.querySelector('.badge'); if (old) old.remove();
      let n = 0;
      if (id === 'pins') n = pinCount();
      if (id === 'tags')  n = Object.keys(Store.state.tags).length;
      if (id === 'media') n = mediaCount();
      if (n > 0) {
        const b = h('span', { class: 'badge', text: n > 99 ? '99+' : String(n) });
        el.appendChild(b);
      }
    });
  }

  function pinCount() {
    return (ls.get('pins', []) || []).length;
  }
  function mediaCount() {
    let c = 0;
    for (const p of Store.state.timeline) c += (p.media || []).length;
    return c;
  }

  function switchTab(id, opts = {}) {
    Store.state.activeTab = id;
    document.querySelectorAll('.tab').forEach((el) => el.classList.toggle('active', el.dataset.tab === id));
    document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.dataset.view === id));
    // Mount the relevant view module
    if (id === 'home')     Feed.mount();
    if (id === 'search')   Search.mount();
    if (id === 'pins')     Pins.mount();
    if (id === 'tags')     Tags.mount();
    if (id === 'media')    Media.mount();
    if (id === 'settings') Settings.mount();
    if (id === 'thread' && opts.threadId) Thread.mount(opts.threadId);
    document.getElementById('composerHost').style.display = (id === 'thread') ? 'none' : 'block';
    window.scrollTo(0, 0);
  }

  /* ---------- Lock screen (password gate) ---------- */
  async function showLock() {
    if (!Store.state.passwordHash) { Store.state.locked = false; return mountApp(); }
    if (!Store.state.locked) return mountApp();

    const lock = h('div', { class: 'lock', id: 'lockScreen' });
    const form = h('form', {});
    const pw = h('input', { type: 'password', placeholder: 'Passcode', autocomplete: 'current-password', inputmode: 'numeric', pattern: '[0-9]*' });
    const err = h('div', { class: 'err' });
    const btn = h('button', { class: 'btn', text: 'Unlock' });
    const hint = h('div', { class: 'hint', text: 'Enter your passcode to view your journal.' });

    form.append(pw, btn, err, hint);
    lock.append(
      h('div', { class: 'brand-big' }, [h('span', { html: renderMiniLogo() })]),
      h('h1', { text: 'Glass Journal' }),
      h('p', { text: 'Private. Yours. Encrypted on this device.' }),
      form,
    );
    document.body.appendChild(lock);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ok = await Store.verifyPassword(pw.value);
      if (ok) {
        Store.state.locked = false;
        lock.remove();
        mountApp();
      } else {
        err.textContent = 'Wrong passcode';
        pw.value = '';
        pw.focus();
      }
    });
    setTimeout(() => pw.focus(), 50);
  }

  function renderMiniLogo() {
    return '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h14a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>';
  }

  /* ---------- Apply theme ---------- */
  function applyTheme() {
    const t = Store.state.theme || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', getComputedStyle(document.body).backgroundColor || '#0a0a0c');
    // Background
    if (Store.state.bg) {
      document.documentElement.classList.add('has-bg');
      document.documentElement.style.setProperty('--bg-image', `url("${Store.state.bg}")`);
    } else {
      document.documentElement.classList.remove('has-bg');
    }
  }

  /* ---------- Install prompt ---------- */
  let deferredPrompt = null;
  function setupInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // Only auto-show if user has not dismissed
      if (!ls.get('installDismissed', false)) {
        document.getElementById('installPrompt').classList.add('show');
      }
    });
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      document.getElementById('installPrompt').classList.remove('show');
      toast('Installed! Open from your home screen.', 'success');
    });
  }
  async function triggerInstall(e) {
    e.currentTarget.closest('.install-prompt').classList.remove('show');
    if (!deferredPrompt) { toast('Use your browser\'s "Add to Home Screen" option.', '', 3500); return; }
    deferredPrompt.prompt();
    const r = await deferredPrompt.userChoice;
    if (r.outcome !== 'accepted') ls.set('installDismissed', true);
    deferredPrompt = null;
  }

  /* ---------- Top bar (dynamic brand text + actions) ---------- */
  function renderTopActions() {
    const host = document.getElementById('topActions');
    host.innerHTML = '';
    const searchBtn = h('button', { class: 'icon-btn', title: 'Search', onclick: () => switchTab('search') }, [Icons.search()]);
    const newBtn = h('button', { class: 'icon-btn', title: 'New entry', onclick: () => openNewPost() }, [Icons.plus()]);
    host.append(searchBtn, newBtn);
  }

  function openNewPost() {
    if (Store.state.activeTab !== 'home') switchTab('home');
    requestAnimationFrame(() => {
      const c = document.getElementById('composerText');
      if (c) { c.focus(); c.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    });
  }

  /* ---------- Service worker ---------- */
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => { /* ignore */ });
    }
  }

  /* ---------- Mount main app ---------- */
  async function mountApp() {
    buildShell();
    buildTabs();
    renderTopActions();
    applyTheme();
    Composer.mount(document.getElementById('composerHost'));
    Settings.ensureMounted();
    // Initial state from URL ?tab=
    const params = new URLSearchParams(location.search);
    const wanted = params.get('tab');
    if (wanted && TAB_DEFS.find((t) => t.id === wanted)) switchTab(wanted);
    else switchTab('home');
    Feed.refresh();
  }

  /* ---------- Boot ---------- */
  function boot() {
    Store.hydrate();
    applyTheme();
    // Remove splash
    const splash = document.getElementById('splash');
    if (splash) { splash.classList.add('gone'); setTimeout(() => splash.remove(), 280); }

    if (Store.state.locked) showLock();
    else mountApp();
    setupInstall();
    registerSW();

    // Surface unhandled errors so they don't disappear silently
    window.addEventListener('error', (e) => {
      console.error('[gj]', e.error || e.message);
      toast('Something went wrong: ' + (e.message || 'unknown'), 'error', 4000);
    });
    window.addEventListener('unhandledrejection', (e) => {
      console.error('[gj]', e.reason);
      toast('Promise error: ' + ((e.reason && e.reason.message) || e.reason), 'error', 4000);
    });

    // Re-apply theme when prefs change
    Store.on(() => {
      applyTheme();
      refreshTabBadges();
    });

    // Keyboard shortcut: "/" focuses search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault(); switchTab('search');
        setTimeout(() => document.querySelector('#searchInput')?.focus(), 50);
      }
    });

    // URL bar updates on tab change for shareable links
    window.addEventListener('popstate', () => {
      const p = new URLSearchParams(location.search);
      const t = p.get('tab');
      if (t) switchTab(t);
    });
  }

  // modules
  const Feed     = global.Feed;
  const Search   = global.Search;
  const Pins     = global.Pins;
  const Tags     = global.Tags;
  const Media    = global.Media;
  const Settings = global.Settings;
  const Composer = global.Composer;

  // Expose for components
  global.App = { switchTab, refreshTabBadges, applyTheme, openNewPost, TAB_DEFS };

  document.addEventListener('DOMContentLoaded', boot);
})(window);
