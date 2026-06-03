// ─── staff.js ─────────────────────────────────────────────────────────────────
// Staff view: activates listeners, renders sidebar + dashboard + chat,
// handles message sending, per-message edit/delete, and alert strip.

import {
  detachListeners, listenRooms, listenAllMsgs, listenReadTs,
  writeMsg, editMessageFB, deleteMessageFB, setReadTsFB, clearChatFB,
} from './firebase.js';
import {
  appState, alertState,
  cachedRooms, cachedReadTs,
  roomsArray, roomsSorted, msgsArray, unreadCount,
  fmt, esc, scrollBottom,
} from './state.js';
import { showView }               from './router.js';
import { updateNotifBtn }         from './notifications.js';
import { playChime, showBrowserNotification } from './notifications.js';

export function activateStaff() {
  detachListeners();
  showView('view-staff');
  appState.curView = 'staff';
  appState.curRid  = null;

  if (typeof Notification !== 'undefined') updateNotifBtn(Notification.permission);

  listenRooms(() => {
    renderSB();
    if (appState.curRid) renderSChat(); else renderDash();
    updatePills();
  });
  listenAllMsgs(() => {
    renderSB();
    if (appState.curRid) renderSChat(); else renderDash();
    updatePills();
    checkAlertAndChime();
  });
  listenReadTs(() => {
    updatePills();
    if (appState.curRid) renderSChat();
  });

  showDashUI();
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function renderSB() {
  const rooms = roomsSorted();
  const c     = document.getElementById('sb-rooms');
  const f     = document.createDocumentFragment();

  rooms.forEach(room => {
    const msgs = msgsArray(room.id);
    const u    = unreadCount(room.id);
    const last = msgs.length ? msgs[msgs.length - 1] : null;

    const item = document.createElement('div');
    item.className = 'sb-room'
      + (room.id === appState.curRid ? ' active'     : '')
      + (u > 0                       ? ' has-unread' : '');
    item.onclick = () => openRoom(room.id);

    const ic  = document.createElement('div'); ic.className = 'sb-icon';
    ic.textContent = room.name.charAt(0).toUpperCase();

    const inf = document.createElement('div'); inf.className = 'sb-info';
    const nm  = document.createElement('div'); nm.className  = 'sb-room-name'; nm.textContent = room.name;
    const pv  = document.createElement('div'); pv.className  = 'sb-room-prev';
    pv.textContent = last ? last.text : (room.event || 'No messages');

    inf.appendChild(nm); inf.appendChild(pv);
    item.appendChild(ic); item.appendChild(inf);

    if (u > 0) {
      const b = document.createElement('div'); b.className = 'unread-badge'; b.textContent = u;
      item.appendChild(b);
    }
    f.appendChild(item);
  });

  c.innerHTML = ''; c.appendChild(f);
}

export function updatePills() {
  const rooms = roomsArray();
  document.getElementById('p-rooms').textContent = rooms.length + ' rooms';
  const tu = rooms.reduce((a, r) => a + unreadCount(r.id), 0);
  const pw = document.getElementById('p-unread-wrap');
  if (tu > 0) {
    pw.style.display = 'flex';
    document.getElementById('p-unread').textContent = tu + ' unread';
  } else {
    pw.style.display = 'none';
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function showDashUI() {
  appState.curRid = null;
  document.getElementById('dash-view').style.display    = 'block';
  document.getElementById('chat-view').style.display    = 'none';
  document.getElementById('no-sel').style.display       = 'none';
  document.getElementById('archive-view').style.display = 'none';
  document.getElementById('room-actions').style.display = 'none';
  document.getElementById('tb-title').textContent = 'All Rooms';
  document.getElementById('tb-sub').textContent   = 'iHotel & Illinois Conference Center';
  renderDash(); renderSB(); updatePills();
}
window.showDash = showDashUI;

function renderDash() {
  const rooms = roomsSorted();
  const grid  = document.getElementById('dash-grid');

  if (!rooms.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem 1rem;color:var(--ih-text-muted);font-size:.9rem">
        <div style="font-family:'Ovo',serif;font-size:1.4rem;color:var(--ih-blue);margin-bottom:.5rem">No rooms yet</div>
        Use the sidebar to add a room, or launch a kiosk from the setup screen.
      </div>`;
    return;
  }

  const f = document.createDocumentFragment();
  rooms.forEach(room => {
    const msgs = msgsArray(room.id);
    const u    = unreadCount(room.id);
    const last = msgs.length ? msgs[msgs.length - 1] : null;

    const card = document.createElement('div');
    card.className = 'dash-card'
      + (msgs.length ? ' card-has'    : '')
      + (u > 0       ? ' card-unread' : '');
    card.onclick = () => openRoom(room.id);
    card.innerHTML =
        '<div class="dc-room">'   + esc(room.name) + '</div>'
      + '<div class="dc-event">'  + (room.event ? esc(room.event) : '<span style="opacity:.45">No event assigned</span>') + '</div>'
      + (last ? '<div class="dc-msg">' + esc(last.text) + '</div>' : '<div class="dc-no-msg">No messages yet</div>')
      + '<div class="dc-footer"><div class="dc-time">' + (last ? fmt(last.ts) : '') + '</div>'
      + (u > 0 ? '<div class="dc-badge">' + u + ' new</div>' : '<div class="dc-dot"></div>')
      + '</div>';
    f.appendChild(card);
  });
  grid.innerHTML = ''; grid.appendChild(f);
}

// ─── Staff chat ───────────────────────────────────────────────────────────────

export function openRoom(rid) {
  appState.curRid = rid;
  setReadTsFB(rid);

  document.getElementById('dash-view').style.display    = 'none';
  document.getElementById('chat-view').style.display    = 'flex';
  document.getElementById('no-sel').style.display       = 'none';
  document.getElementById('archive-view').style.display = 'none';
  document.getElementById('room-actions').style.display = 'flex';

  const room = cachedRooms[rid] || {};
  document.getElementById('tb-title').textContent = room.name  || rid;
  document.getElementById('tb-sub').textContent   = room.event || 'No event assigned';

  renderSChat(); renderSB(); updatePills();
  document.getElementById('staff-input').focus();
}

export function renderSChat() {
  const msgs = msgsArray(appState.curRid);
  const list = document.getElementById('chat-msgs');

  if (!msgs.length) {
    list.innerHTML = '<div class="chat-empty">No messages from this room yet.</div>';
    return;
  }

  const f = document.createDocumentFragment();
  msgs.forEach(msg => {
    const isGuest = msg.sender === 'guest';
    const row  = document.createElement('div'); row.className  = 'chat-row';
    const lbl  = document.createElement('div'); lbl.className  = 'chat-lbl';
    lbl.textContent = (isGuest ? 'Guest' : 'AV & Events Team') + ' \u00b7 ' + fmt(msg.ts);
    const bub  = document.createElement('div'); bub.className  = 'chat-bub ' + (isGuest ? 'from-guest' : 'from-staff');
    bub.textContent = msg.text;

    const acts  = document.createElement('div'); acts.className = 'msg-actions';
    const eBtn  = document.createElement('button'); eBtn.className = 'msg-act-btn'; eBtn.textContent = 'Edit';
    eBtn.onclick = () => startMsgEdit(msg.key, msg.text, row, bub, acts);
    const dBtn  = document.createElement('button'); dBtn.className = 'msg-act-btn del'; dBtn.textContent = 'Delete';
    dBtn.onclick = () => confirmDeleteMsg(msg.key);
    acts.appendChild(eBtn); acts.appendChild(dBtn);

    row.appendChild(lbl); row.appendChild(bub); row.appendChild(acts);
    f.appendChild(row);
  });

  list.innerHTML = ''; list.appendChild(f);
  scrollBottom(list);
  setReadTsFB(appState.curRid);
}

window.staffKD = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); staffSend(); } };
window.staffSend = function() {
  if (!appState.curRid) return;
  const el   = document.getElementById('staff-input');
  const text = el.value.trim();
  if (!text) return;
  el.value = ''; el.style.height = '';
  writeMsg(appState.curRid, 'staff', text);
};
window.staffQR = t => { document.getElementById('staff-input').value = t; staffSend(); };

// ─── Per-message edit ─────────────────────────────────────────────────────────

function startMsgEdit(key, currentText, row, bub, acts) {
  bub.style.display  = 'none';
  acts.style.display = 'none';

  const wrap   = document.createElement('div'); wrap.className = 'msg-edit-wrap';
  const ta     = document.createElement('textarea'); ta.className = 'msg-edit-ta'; ta.value = currentText; ta.rows = 2;
  const saveB  = document.createElement('button'); saveB.className = 'msg-edit-save'; saveB.textContent = 'Save';
  const cancelB = document.createElement('button'); cancelB.className = 'msg-edit-cancel'; cancelB.textContent = 'Cancel';

  saveB.onclick = () => {
    const newText = ta.value.trim();
    if (!newText) { alert('Message cannot be empty.'); return; }
    editMessageFB(appState.curRid, key, newText);
    wrap.remove(); bub.style.display = ''; acts.style.display = '';
  };
  cancelB.onclick = () => {
    wrap.remove(); bub.style.display = ''; acts.style.display = '';
  };

  wrap.appendChild(ta); wrap.appendChild(saveB); wrap.appendChild(cancelB);
  row.appendChild(wrap);
  ta.focus(); ta.select();
}

function confirmDeleteMsg(key) {
  if (!confirm('Delete this message?')) return;
  deleteMessageFB(appState.curRid, key);
}

// ─── Alerts + chime ───────────────────────────────────────────────────────────

function checkAlertAndChime() {
  let newestTs = 0, newestRoom = null;

  roomsArray().forEach(room => {
    const readTs = cachedReadTs[room.id] || 0;
    msgsArray(room.id)
      .filter(m => m.sender === 'guest' && m.ts > readTs && m.ts > alertState.lastAlertTs)
      .forEach(m => { if (m.ts > newestTs) { newestTs = m.ts; newestRoom = room; } });
  });

  if (newestRoom && newestTs > alertState.lastAlertTs) {
    alertState.lastAlertTs = newestTs;
    playChime();
    showBrowserNotification(
      'iHotel \u2014 New message',
      newestRoom.name + ': ' + (msgsArray(newestRoom.id).slice(-1)[0]?.text || '')
    );
    const strip = document.getElementById('alert-strip');
    strip.textContent   = '\uD83D\uDD14 New message from ' + newestRoom.name;
    strip.style.display = 'block';
    clearTimeout(strip._t);
    strip._t = setTimeout(() => { strip.style.display = 'none'; }, 6000);
  }

  // Keep scroll pinned to bottom when new messages arrive in the open room
  if (appState.curRid) {
    const count = msgsArray(appState.curRid).length;
    if (alertState.prevMsgCounts[appState.curRid] !== undefined
        && count > alertState.prevMsgCounts[appState.curRid]) {
      scrollBottom(document.getElementById('chat-msgs'));
    }
    alertState.prevMsgCounts[appState.curRid] = count;
  }
}
