// ─── state.js ─────────────────────────────────────────────────────────────────
// Single source of truth for app state and derived data helpers.
// All modules import from here — no module holds its own copy of the cache.

// ─── Live Firebase cache (mutated by firebase.js listeners) ──────────────────
export const cachedRooms  = {};  // { [roomId]: { name, event } }
export const cachedMsgs   = {};  // { [roomId]: { [msgKey]: { sender, text, ts } } }
export const cachedReadTs = {};  // { [roomId]: timestamp }

// ─── Navigation state ─────────────────────────────────────────────────────────
export const appState = {
  curView: null,   // 'setup' | 'guest' | 'staff'
  curRid:  null,   // currently open room ID (staff chat) or active room (guest)
};

// ─── Alert tracking ───────────────────────────────────────────────────────────
export const alertState = {
  lastAlertTs:   0,
  prevMsgCounts: {},  // { [roomId]: number } — used to detect new messages for chime
};

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** All rooms as a flat array */
export function roomsArray() {
  return Object.entries(cachedRooms).map(([id, r]) => ({ id, ...r }));
}

/** Rooms sorted by most recent message timestamp, descending */
export function roomsSorted() {
  return roomsArray().slice().sort((a, b) => {
    const aT = Object.values(cachedMsgs[a.id] || {}).reduce((mx, m) => Math.max(mx, m.ts || 0), 0);
    const bT = Object.values(cachedMsgs[b.id] || {}).reduce((mx, m) => Math.max(mx, m.ts || 0), 0);
    return bT - aT;
  });
}

/** Messages for a room as a sorted array with the Firebase key attached */
export function msgsArray(rid) {
  return Object.entries(cachedMsgs[rid] || {})
    .map(([key, m]) => ({ key, ...m }))
    .sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

/** Number of unread guest messages in a room */
export function unreadCount(rid) {
  const readTs = cachedReadTs[rid] || 0;
  return msgsArray(rid).filter(m => m.sender === 'guest' && (m.ts || 0) > readTs).length;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function fmt(ts) {
  const d  = new Date(ts);
  let h = d.getHours(), m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function fmtDateKey(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function scrollBottom(el) {
  if (el) el.scrollTop = el.scrollHeight;
}
