// ─── guest.js ─────────────────────────────────────────────────────────────────
// Guest kiosk: activates the view, renders messages in real time,
// handles sending, and sets up the logo long-press for staff access.

import { detachListeners, listenMsgs, writeMsg } from './firebase.js';
import { appState, msgsArray, fmt, scrollBottom } from './state.js';
import { showView }                               from './router.js';
import { getRoomOnce }                            from './firebase.js';
import { initLogoLongPress }                      from './kiosk.js';

export function activateGuest(rid) {
  detachListeners();

  getRoomOnce(rid).then(snap => {
    if (!snap.exists()) {
      // Room not found — fall back to setup
      import('./setup.js').then(m => m.activateSetup());
      return;
    }

    const room = snap.val();
    showView('view-guest');
    appState.curView = 'guest';
    appState.curRid  = rid;

    // Populate header
    document.getElementById('g-room').textContent    = room.name;
    document.getElementById('g-event').textContent   = room.event || '';
    document.getElementById('g-heading').textContent = room.event
      ? 'Welcome, ' + room.event + '!'
      : 'How can we help?';
    const sub = document.getElementById('g-subhead');
    if (sub) sub.textContent = room.name + ' · Send us a message and we\u2019ll respond shortly.';

    // Show standalone warning if opened in Safari (not home screen)
    const isStandalone = window.navigator.standalone
      || window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone) document.getElementById('standalone-warn').classList.add('show');

    // Tech setup bar
    const techBar = document.getElementById('tech-bar');
    if (techBar) {
      techBar.classList.remove('hidden');
      const techSub = document.getElementById('tech-bar-room');
      if (techSub) techSub.textContent = room.name + (room.event ? ' · ' + room.event : '');
    }

    // Real-time message listener
    listenMsgs(rid, appState.curRid, () => renderGMsgs(rid));

    // Set up logo long-press for staff settings access
    initLogoLongPress();
  });
}

/** Re-render the full guest message list */
function renderGMsgs(rid) {
  const msgs = msgsArray(rid);
  const list = document.getElementById('g-msgs');

  if (!msgs.length) {
    list.innerHTML = `
      <div class="g-empty">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.4" style="color:var(--ih-text-muted)">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Type a message below and tap send \u2014 our team will reply here.</span>
      </div>`;
    return;
  }

  const f = document.createDocumentFragment();
  msgs.forEach(msg => {
    const isGuest = msg.sender === 'guest';
    const row = document.createElement('div'); row.className = 'msg-row';
    const snd = document.createElement('div'); snd.className = 'msg-sender';
    snd.textContent = isGuest ? 'You' : 'AV & Events Team';
    const bub = document.createElement('div');
    bub.className   = 'msg-bubble ' + (isGuest ? 'g-bub' : 's-bub');
    bub.textContent = msg.text;
    const tm  = document.createElement('div'); tm.className = 'msg-time';
    tm.textContent  = fmt(msg.ts);
    row.appendChild(snd); row.appendChild(bub); row.appendChild(tm);
    f.appendChild(row);
  });

  list.innerHTML = '';
  list.appendChild(f);
  scrollBottom(list);
}

// ─── Send handlers ────────────────────────────────────────────────────────────

window.guestKD = function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); guestSend(); }
};

window.guestSend = function() {
  const el   = document.getElementById('g-input');
  const text = el.value.trim();
  if (!text || !appState.curRid) return;
  el.value = ''; el.style.height = '';
  writeMsg(appState.curRid, 'guest', text);
};
