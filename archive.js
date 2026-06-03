// ─── archive.js ───────────────────────────────────────────────────────────────
// Message archive: builds from the Firebase cache, renders grouped by date,
// supports search/date/sender filters, per-message delete, and CSV export.
//
// All messages in Firebase are the archive — nothing extra is stored.
// Messages persist forever unless explicitly deleted.

import { deleteMessageFB }                         from './firebase.js';
import { appState, cachedRooms, roomsArray, msgsArray,
         fmt, fmtDate, fmtDateKey, esc }           from './state.js';
import { renderSB }                                from './staff.js';

// ─── Module state ─────────────────────────────────────────────────────────────
let allArchiveMsgs    = [];
let archiveFilterSender = null; // null | 'guest' | 'staff'

// ─── Open the archive page ────────────────────────────────────────────────────

window.showArchive = function() {
  appState.curRid = null;

  document.getElementById('dash-view').style.display    = 'none';
  document.getElementById('chat-view').style.display    = 'none';
  document.getElementById('no-sel').style.display       = 'none';
  document.getElementById('archive-view').style.display = 'flex';
  document.getElementById('room-actions').style.display = 'none';
  document.getElementById('tb-title').textContent = 'Message Archive';
  document.getElementById('tb-sub').textContent   = 'All rooms \u00b7 All time \u00b7 Auto-archived';

  buildArchive();
  renderSB();
};

// ─── Build flat message list from cache ───────────────────────────────────────

function buildArchive() {
  allArchiveMsgs = [];
  roomsArray().forEach(room => {
    msgsArray(room.id).forEach(msg => {
      allArchiveMsgs.push({
        ...msg,
        roomId:    room.id,
        roomName:  room.name,
        roomEvent: room.event || '',
      });
    });
  });
  allArchiveMsgs.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  applyArchiveFilters();
}

// ─── Filtering ────────────────────────────────────────────────────────────────

function applyArchiveFilters() {
  const q       = (document.getElementById('archive-search').value || '').toLowerCase().trim();
  const dateVal = document.getElementById('archive-date').value;
  let filtered  = allArchiveMsgs;

  if (q) filtered = filtered.filter(m =>
    m.text.toLowerCase().includes(q) ||
    m.roomName.toLowerCase().includes(q) ||
    m.roomEvent.toLowerCase().includes(q)
  );
  if (dateVal)            filtered = filtered.filter(m => fmtDateKey(m.ts) === dateVal);
  if (archiveFilterSender) filtered = filtered.filter(m => m.sender === archiveFilterSender);

  renderArchive(filtered);
}

window.filterArchive = applyArchiveFilters;

window.toggleArchiveFilter = function(sender) {
  archiveFilterSender = archiveFilterSender === sender ? null : sender;
  document.getElementById('af-guest').classList.toggle('active', archiveFilterSender === 'guest');
  document.getElementById('af-staff').classList.toggle('active', archiveFilterSender === 'staff');
  applyArchiveFilters();
};

window.clearArchiveFilters = function() {
  archiveFilterSender = null;
  document.getElementById('archive-search').value = '';
  document.getElementById('archive-date').value   = '';
  document.getElementById('af-guest').classList.remove('active');
  document.getElementById('af-staff').classList.remove('active');
  applyArchiveFilters();
};

// ─── Render ───────────────────────────────────────────────────────────────────

function renderArchive(msgs) {
  const container = document.getElementById('archive-list');
  const statsEl   = document.getElementById('archive-stats');

  // Stats bar
  const gCount   = msgs.filter(m => m.sender === 'guest').length;
  const sCount   = msgs.filter(m => m.sender === 'staff').length;
  const roomCount = [...new Set(msgs.map(m => m.roomId))].length;
  statsEl.innerHTML =
      `<span class="archive-stat-pill">${msgs.length} messages</span>`
    + `<span class="archive-stat-pill">${roomCount} room${roomCount !== 1 ? 's' : ''}</span>`
    + `<span class="archive-stat-pill">${gCount} guest</span>`
    + `<span class="archive-stat-pill">${sCount} staff</span>`;

  if (!msgs.length) {
    container.innerHTML = '<div class="archive-empty">No messages match your filters.</div>';
    return;
  }

  // Group by calendar date
  const byDay = {};
  msgs.forEach(msg => {
    const dk = fmtDateKey(msg.ts);
    if (!byDay[dk]) byDay[dk] = [];
    byDay[dk].push(msg);
  });

  const f = document.createDocumentFragment();
  Object.keys(byDay).sort().reverse().forEach(dk => {
    const dayMsgs = byDay[dk];
    const block   = document.createElement('div'); block.className = 'archive-day-block';

    const hdr = document.createElement('div'); hdr.className = 'archive-day-hdr';
    hdr.innerHTML =
        `<span class="archive-day-date">${fmtDate(dayMsgs[0].ts)}</span>`
      + `<span class="archive-day-count">${dayMsgs.length} message${dayMsgs.length !== 1 ? 's' : ''}</span>`;
    block.appendChild(hdr);

    dayMsgs.forEach(msg => {
      const row = document.createElement('div'); row.className = 'archive-msg-row';

      const meta = document.createElement('div'); meta.className = 'archive-msg-meta';
      meta.innerHTML = `<strong>${esc(msg.roomName)}</strong>${fmt(msg.ts)}`;

      const body = document.createElement('div'); body.className = 'archive-msg-body';
      body.innerHTML =
          `<div class="archive-msg-sender">${esc(msg.sender === 'guest' ? 'Guest' : 'AV & Events Team')}</div>`
        + `<div class="archive-msg-text${msg.edited ? ' edited' : ''}">${esc(msg.text)}</div>`;

      const del = document.createElement('button');
      del.className = 'archive-del-btn';
      del.title     = 'Delete this message';
      del.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
      del.onclick   = () => deleteArchiveMsg(msg.roomId, msg.key, row);

      row.appendChild(meta); row.appendChild(body); row.appendChild(del);
      block.appendChild(row);
    });
    f.appendChild(block);
  });
  container.innerHTML = ''; container.appendChild(f);
}

function deleteArchiveMsg(roomId, msgKey, rowEl) {
  if (!confirm('Delete this message from the archive? This cannot be undone.')) return;
  deleteMessageFB(roomId, msgKey).then(() => {
    rowEl.style.opacity    = '0';
    rowEl.style.transition = 'opacity .25s';
    setTimeout(() => { rowEl.remove(); buildArchive(); }, 260);
  });
}

// ─── CSV export ───────────────────────────────────────────────────────────────

window.exportArchive = function() {
  const q       = (document.getElementById('archive-search').value || '').toLowerCase().trim();
  const dateVal = document.getElementById('archive-date').value;
  let filtered  = allArchiveMsgs;
  if (q)                 filtered = filtered.filter(m => m.text.toLowerCase().includes(q) || m.roomName.toLowerCase().includes(q) || m.roomEvent.toLowerCase().includes(q));
  if (dateVal)           filtered = filtered.filter(m => fmtDateKey(m.ts) === dateVal);
  if (archiveFilterSender) filtered = filtered.filter(m => m.sender === archiveFilterSender);

  if (!filtered.length) { alert('No messages to export.'); return; }

  const header = ['Date', 'Time', 'Room', 'Event', 'Sender', 'Message'];
  const rows   = filtered.map(m => [
    fmtDateKey(m.ts),
    fmt(m.ts),
    m.roomName,
    m.roomEvent,
    m.sender === 'guest' ? 'Guest' : 'AV & Events Team',
    '"' + m.text.replace(/"/g, '""') + '"',
  ]);

  const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'ihotel-messages-' + (dateVal || fmtDateKey(Date.now())) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Single-room history modal ────────────────────────────────────────────────

window.openRoomArchive = function() {
  if (!appState.curRid) return;
  const room = cachedRooms[appState.curRid] || {};
  document.getElementById('room-archive-title').textContent = room.name + ' \u2014 Message History';

  const msgs = msgsArray(appState.curRid);
  const list = document.getElementById('room-archive-list');

  if (!msgs.length) {
    list.innerHTML = '<div class="archive-empty">No messages in this room yet.</div>';
  } else {
    const f = document.createDocumentFragment();
    msgs.forEach(msg => {
      const row = document.createElement('div');
      row.className = 'archive-msg-row';
      row.style.gridTemplateColumns = '90px 1fr auto';

      const meta = document.createElement('div'); meta.className = 'archive-msg-meta';
      meta.textContent = fmt(msg.ts);

      const body = document.createElement('div'); body.className = 'archive-msg-body';
      body.innerHTML =
          `<div class="archive-msg-sender">${esc(msg.sender === 'guest' ? 'Guest' : 'AV & Events Team')}</div>`
        + `<div class="archive-msg-text${msg.edited ? ' edited' : ''}">${esc(msg.text)}</div>`;

      const del = document.createElement('button');
      del.className      = 'archive-del-btn';
      del.title          = 'Delete';
      del.innerHTML      = '\u2715';
      del.style.opacity  = '1';
      del.onclick = () => {
        if (!confirm('Delete this message?')) return;
        deleteMessageFB(appState.curRid, msg.key).then(() => row.remove());
      };

      row.appendChild(meta); row.appendChild(body); row.appendChild(del);
      f.appendChild(row);
    });
    list.innerHTML = ''; list.appendChild(f);
  }
  document.getElementById('room-archive-modal').classList.add('open');
};

window.closeRoomArchive = () => document.getElementById('room-archive-modal').classList.remove('open');
