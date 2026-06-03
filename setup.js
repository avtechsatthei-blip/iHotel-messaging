// ─── setup.js ─────────────────────────────────────────────────────────────────
// Setup screen: populates the existing-rooms dropdown, handles
// "Open Staff Dashboard" and "Launch Room Kiosk" button actions.

import { detachListeners }         from './firebase.js';
import { getAllRoomsOnce, saveRoom, updateRoom } from './firebase.js';
import { slug }                    from './state.js';
import { showView }                from './router.js';
import { appState }                from './state.js';

export function activateSetup() {
  detachListeners();
  showView('view-setup');
  appState.curView = 'setup';
  appState.curRid  = null;
  populateExistingRooms();
}

/** Fill the "sign into existing room" dropdown from Firebase */
function populateExistingRooms() {
  getAllRoomsOnce().then(snap => {
    const rooms = snap.val() || {};
    const sel   = document.getElementById('kiosk-existing');
    sel.innerHTML = '<option value="">— Select a room —</option>';
    Object.entries(rooms)
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .forEach(([id, r]) => {
        const opt       = document.createElement('option');
        opt.value       = id;
        opt.textContent = r.name + (r.event ? ' · ' + r.event : '');
        sel.appendChild(opt);
      });
    document.getElementById('kiosk-room').value  = '';
    document.getElementById('kiosk-event').value = '';
  });
}

/** When user selects an existing room, pre-fill the name/event fields */
window.onExistingRoomChange = function() {
  const rid = document.getElementById('kiosk-existing').value;
  if (!rid) {
    document.getElementById('kiosk-room').value  = '';
    document.getElementById('kiosk-event').value = '';
    return;
  }
  import('./firebase.js').then(({ getRoomOnce }) => {
    getRoomOnce(rid).then(snap => {
      const r = snap.val();
      if (r) {
        document.getElementById('kiosk-room').value  = r.name;
        document.getElementById('kiosk-event').value = r.event || '';
      }
    });
  });
};

/** Navigate to the staff dashboard */
window.openStaff = function() {
  window.location.hash = '#staff';
};

/** Launch the guest kiosk — creates the room in Firebase if new */
window.openGuestFromSetup = function() {
  const existingSel = document.getElementById('kiosk-existing').value;
  const rn          = document.getElementById('kiosk-room').value.trim();
  const en          = document.getElementById('kiosk-event').value.trim();

  if (existingSel) {
    // Optionally update the event name if the tech edited it
    if (en) updateRoom(existingSel, { event: en });
    window.location.hash = '#guest?room=' + encodeURIComponent(existingSel);
    return;
  }

  if (!rn) {
    alert('Please select an existing room or enter a new room name.');
    return;
  }

  const id = slug(rn);
  saveRoom(id, rn, en).then(() => {
    window.location.hash = '#guest?room=' + encodeURIComponent(id);
  });
};
