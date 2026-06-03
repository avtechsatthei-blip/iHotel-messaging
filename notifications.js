// ─── notifications.js ─────────────────────────────────────────────────────────
// Audio chime (Web Audio API — no sound file required) and
// browser push notification helpers.
//
// Push notifications work on:
//   - Chrome / Edge desktop (any version)
//   - Safari iOS 16.4+ when installed as a home screen PWA
//   - iPadOS 15.8: NOT supported (Apple restriction)

// ─── Audio chime ──────────────────────────────────────────────────────────────

let audioCtx = null;

/** Play a three-note ascending chime */
export function playChime() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    // [frequency, start delay, duration]
    [[880, 0, 0.15], [1108, 0.12, 0.15], [1318, 0.22, 0.2]].forEach(([freq, delay, dur]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type            = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0,      ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur + 0.05);
    });
  } catch(e) {}
}

// Unlock audio context on the first user interaction (browser requirement)
['click', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }, { once: true });
});

// ─── Push notification permission ─────────────────────────────────────────────

/** Request browser notification permission (called from the Archive toolbar button) */
window.requestNotifPermission = async function() {
  if (!('Notification' in window)) {
    alert('Notifications are not supported in this browser.');
    return;
  }
  const perm = await Notification.requestPermission();
  updateNotifBtn(perm);
  if (perm === 'granted') playChime(); // confirmation sound
};

/** Update the notification button appearance based on current permission */
export function updateNotifBtn(perm) {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;
  if (perm === 'granted') {
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg> Notifications on`;
    btn.classList.add('granted');
  } else if (perm === 'denied') {
    btn.textContent = 'Notifications blocked';
    btn.disabled    = true;
  }
}

/** Show a browser notification if permission is granted */
export function showBrowserNotification(title, body) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon:      'icon-192.png',
      tag:       'ihotel-msg',
      renotify:  true,
    });
  } catch(e) {}
}
