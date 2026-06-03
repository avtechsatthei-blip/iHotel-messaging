// ─── rooms.js ─────────────────────────────────────────────────────────────────
// Room management: add, edit, delete rooms from the staff dashboard.
// All functions exposed as window.* because they're called from inline HTML.

import {
  saveRoom, updateRoom, deleteRoomFB, clearChatFB, setReadTsFB, getRoomOnce,
} from './firebase.js';
import { appState, cachedRooms, roomsArray, slug } from './state.js';
import { showDashUI, renderSB, updatePills }        from './staff.js';

// ─── Add room modal ───────────────────────────────────────────────────────────

window.openAddModal  = () => document.getElementById('add-modal').classList.add('open');
window.closeAddModal = () => document.getElementById('add-modal').classList.remove('open');

window.addRoom = function() {
  const name  = document.getElementById('new-room').value.trim();
  const event = document.getElementById('new-event').value.trim();
  if (!name) { alert('Please enter a room name.'); return; }

  const id = slug(name);
  getRoomOnce(id).then(snap => {
    if (snap.exists()) { alert(name + ' already exists.'); return; }
    saveRoom(id, name, event).then(() => {
      closeAddModal();
      document.getElementById('new-room').value  = '';
      document.getElementById('new-event').value = '';
    });
  });
};

// ─── Edit room modal ──────────────────────────────────────────────────────────

window.openEditModal = function() {
  if (!appState.curRid) return;
  const room = cachedRooms[appState.curRid] || {};
  document.getElementById('edit-room-name').value  = room.name  || '';
  document.getElementById('edit-event-name').value = room.event || '';
  document.getElementById('edit-modal').classList.add('open');
};
window.closeEditModal = () => document.getElementById('edit-modal').classList.remove('open');

window.saveEditRoom = function() {
  const name  = document.getElementById('edit-room-name').value.trim();
  const event = document.getElementById('edit-event-name').value.trim();
  if (!name) { alert('Room name cannot be empty.'); return; }
  updateRoom(appState.curRid, { name, event }).then(() => {
    closeEditModal();
    document.getElementById('tb-title').textContent = name;
    document.getElementById('tb-sub').textContent   = event || 'No event assigned';
  });
};

// ─── Delete room ──────────────────────────────────────────────────────────────

window.confirmDeleteRoom = function() {
  const room = cachedRooms[appState.curRid] || {};
  if (!confirm('Delete "' + (room.name || appState.curRid) + '" and all its messages? This cannot be undone.')) return;
  deleteRoomFB(appState.curRid).then(() => showDashUI());
};

// ─── Clear chat ───────────────────────────────────────────────────────────────

window.confirmDeleteChat = function() {
  const room = cachedRooms[appState.curRid] || {};
  if (!confirm('Clear all messages in "' + (room.name || appState.curRid) + '"? This cannot be undone.')) return;
  clearChatFB(appState.curRid);
};

// ─── Mark all rooms read ──────────────────────────────────────────────────────

window.markAllRead = function() {
  roomsArray().forEach(r => setReadTsFB(r.id));
};
