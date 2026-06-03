// ─── firebase.js ──────────────────────────────────────────────────────────────
// All Firebase Realtime Database operations.
// Exports: listener setup functions, write helpers, and listener teardown.
//
// Data structure in Firebase:
//   /rooms/{roomId}            → { name, event }
//   /messages/{roomId}/{msgId} → { sender, text, ts, edited? }
//   /readTs/{roomId}           → timestamp (last read by staff)

import { db }                                          from './config.js';
import { ref, set, get, push, remove, update, onValue, off }
                                                       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { cachedRooms, cachedMsgs, cachedReadTs }       from './state.js';

// ─── Active listener references (kept so we can detach cleanly) ───────────────
let roomsListener   = null;
let msgsListener    = null;
let readTsListener  = null;

// ─── Listeners ────────────────────────────────────────────────────────────────

export function listenRooms(cb) {
  const r = ref(db, 'rooms');
  if (roomsListener) off(r, 'value', roomsListener);
  roomsListener = onValue(r, snap => {
    Object.assign(cachedRooms, {});
    const val = snap.val() || {};
    Object.keys(cachedRooms).forEach(k => delete cachedRooms[k]);
    Object.assign(cachedRooms, val);
    cb();
  });
}

export function listenMsgs(roomId, curRid, cb) {
  const r = ref(db, 'messages/' + roomId);
  if (msgsListener) off(ref(db, 'messages/' + (curRid || roomId)), 'value', msgsListener);
  msgsListener = onValue(r, snap => {
    cachedMsgs[roomId] = snap.val() || {};
    cb();
  });
}

export function listenAllMsgs(cb) {
  const r = ref(db, 'messages');
  if (msgsListener) off(ref(db, 'messages'), 'value', msgsListener);
  msgsListener = onValue(r, snap => {
    const val = snap.val() || {};
    Object.keys(cachedMsgs).forEach(k => delete cachedMsgs[k]);
    Object.assign(cachedMsgs, val);
    cb();
  });
}

export function listenReadTs(cb) {
  const r = ref(db, 'readTs');
  if (readTsListener) off(ref(db, 'readTs'), 'value', readTsListener);
  readTsListener = onValue(r, snap => {
    const val = snap.val() || {};
    Object.keys(cachedReadTs).forEach(k => delete cachedReadTs[k]);
    Object.assign(cachedReadTs, val);
    cb();
  });
}

export function detachListeners() {
  try { if (roomsListener)  off(ref(db, 'rooms'),    'value', roomsListener); }   catch(e) {}
  try { if (msgsListener)   off(ref(db, 'messages'), 'value', msgsListener); }    catch(e) {}
  try { if (readTsListener) off(ref(db, 'readTs'),   'value', readTsListener); }  catch(e) {}
  roomsListener = msgsListener = readTsListener = null;
}

// ─── Write operations ─────────────────────────────────────────────────────────

export const writeMsg         = (rid, sender, text) => push(ref(db, 'messages/' + rid), { sender, text, ts: Date.now() });
export const deleteMessageFB  = (rid, key)          => remove(ref(db, 'messages/' + rid + '/' + key));
export const editMessageFB    = (rid, key, text)    => update(ref(db, 'messages/' + rid + '/' + key), { text, edited: true });
export const clearChatFB      = (rid)               => set(ref(db, 'messages/' + rid), null);
export const saveRoom         = (id, name, event)   => set(ref(db, 'rooms/' + id), { name, event: event || '' });
export const updateRoom       = (id, data)          => update(ref(db, 'rooms/' + id), data);
export const getRoomOnce      = (id)                => get(ref(db, 'rooms/' + id));
export const getAllRoomsOnce   = ()                  => get(ref(db, 'rooms'));

export function deleteRoomFB(rid) {
  return Promise.all([
    remove(ref(db, 'rooms/'    + rid)),
    remove(ref(db, 'messages/' + rid)),
    remove(ref(db, 'readTs/'   + rid)),
  ]);
}

export function setReadTsFB(rid) {
  const msgs = cachedMsgs[rid] || {};
  const keys = Object.keys(msgs);
  if (!keys.length) return Promise.resolve();
  const latest = Math.max(...keys.map(k => msgs[k].ts || 0));
  return set(ref(db, 'readTs/' + rid), latest);
}
