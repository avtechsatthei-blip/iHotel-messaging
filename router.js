// ─── router.js ────────────────────────────────────────────────────────────────
// Hash-based router. Maps URL fragment to a view activation function.
//
// Routes:
//   (empty)              → setup screen
//   #staff               → staff dashboard
//   #guest?room=ROOM_ID  → guest kiosk for the given room

import { activateSetup }  from './setup.js';
import { activateGuest }  from './guest.js';
import { activateStaff }  from './staff.js';

/** Switch which top-level view div is visible */
export function showView(id) {
  ['view-setup', 'view-guest', 'view-staff'].forEach(v =>
    document.getElementById(v).classList.toggle('active', v === id)
  );
}

/** Parse the current URL hash and activate the matching view */
export function route() {
  const hash = window.location.hash;
  if (hash.startsWith('#guest')) {
    const qs  = hash.replace(/^#guest\??/, '');
    const rid = new URLSearchParams(qs).get('room');
    activateGuest(rid);
  } else if (hash === '#staff') {
    activateStaff();
  } else {
    activateSetup();
  }
}
