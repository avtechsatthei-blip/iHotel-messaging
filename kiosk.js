// ─── kiosk.js ─────────────────────────────────────────────────────────────────
// Kiosk settings panel: logo long-press to open, PIN entry, settings actions.
// Accessed by the tech by holding the logo in the guest header for 600ms.

import { STAFF_PIN }               from './config.js';
import { clearChatFB, detachListeners } from './firebase.js';
import { appState }                from './state.js';
import { activateSetup }           from './setup.js';
import { showView }                from './router.js';
import { goFS }                    from './ui.js';

// ─── Logo long-press setup ────────────────────────────────────────────────────

export function initLogoLongPress() {
  const trigger = document.getElementById('kiosk-logo-trigger');
  if (!trigger) return;

  // Add the visual hold-feedback ring (only once)
  if (!document.getElementById('kiosk-hold-ring')) {
    const ring = document.createElement('div');
    ring.className = 'kiosk-hold-ring';
    ring.id        = 'kiosk-hold-ring';
    trigger.appendChild(ring);
  }
  const ring = document.getElementById('kiosk-hold-ring');

  let holdTimer = null;

  function startHold(e) {
    e.preventDefault();
    ring.classList.add('holding');
    holdTimer = setTimeout(() => {
      ring.classList.remove('holding');
      openKioskSettings();
    }, 600);
  }
  function cancelHold() {
    clearTimeout(holdTimer);
    holdTimer = null;
    ring.classList.remove('holding');
  }

  // Touch events (iPad)
  trigger.addEventListener('touchstart',  startHold,  { passive: false });
  trigger.addEventListener('touchend',    cancelHold);
  trigger.addEventListener('touchcancel', cancelHold);
  trigger.addEventListener('touchmove',   cancelHold);
  // Mouse events (desktop testing)
  trigger.addEventListener('mousedown',  startHold);
  trigger.addEventListener('mouseup',    cancelHold);
  trigger.addEventListener('mouseleave', cancelHold);
}

// ─── Panel open / close ───────────────────────────────────────────────────────

let kioskPinEntry = '';

window.openKioskSettings = openKioskSettings;
function openKioskSettings() {
  kioskPinEntry = '';
  updatePinDots('pd', '');
  document.getElementById('kiosk-pin-err').textContent       = '';
  document.getElementById('kiosk-pin-state').style.display    = 'block';
  document.getElementById('kiosk-actions-state').style.display = 'none';
  document.getElementById('kiosk-overlay').classList.add('open');
  // Exit fullscreen so the panel is visible
  try {
    if (document.exitFullscreen)        document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch(e) {}
}

window.closeKioskSettings = function() {
  document.getElementById('kiosk-overlay').classList.remove('open');
  setTimeout(goFS, 300); // Re-enter fullscreen after panel closes
};

// ─── PIN entry ────────────────────────────────────────────────────────────────

function updatePinDots(prefix, entry) {
  for (let i = 0; i < 4; i++) {
    document.getElementById(prefix + i).classList.toggle('filled', i < entry.length);
  }
}

window.kioskKey = function(d) {
  if (kioskPinEntry.length >= 4) return;
  kioskPinEntry += d;
  updatePinDots('pd', kioskPinEntry);

  if (kioskPinEntry.length === 4) {
    if (kioskPinEntry === STAFF_PIN) {
      setTimeout(showKioskActions, 150);
    } else {
      document.getElementById('kiosk-pin-err').textContent = 'Incorrect PIN. Try again.';
      setTimeout(() => {
        kioskPinEntry = '';
        updatePinDots('pd', '');
        document.getElementById('kiosk-pin-err').textContent = '';
      }, 900);
    }
  }
};

window.kioskBackspace = function() {
  kioskPinEntry = kioskPinEntry.slice(0, -1);
  updatePinDots('pd', kioskPinEntry);
};

function showKioskActions() {
  document.getElementById('kiosk-pin-state').style.display     = 'none';
  document.getElementById('kiosk-actions-state').style.display = 'block';
}
window.showKioskActions = showKioskActions;

// ─── Settings actions ─────────────────────────────────────────────────────────

/** Reload the page — stays on the same room */
window.kioskReload = function() {
  document.getElementById('kiosk-overlay').classList.remove('open');
  setTimeout(() => location.reload(), 350);
};

/** Return to the setup screen to reassign this tablet */
window.kioskGoSetup = function() {
  document.getElementById('kiosk-overlay').classList.remove('open');
  detachListeners();
  window.location.hash = '';
  showView('view-setup');
  appState.curView = 'setup';
  activateSetup();
};

/** Clear all messages from the current room */
window.kioskClearRoom = function() {
  if (!appState.curRid) return;
  clearChatFB(appState.curRid).then(() => {
    window.closeKioskSettings();
  });
};
