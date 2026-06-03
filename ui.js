// ─── ui.js ────────────────────────────────────────────────────────────────────
// Miscellaneous UI utilities:
//   - Fullscreen request and re-entry on loss
//   - Tech "go fullscreen" button handler
//   - Textarea auto-grow on input
//   - Modal overlay click-to-close

// ─── Fullscreen ───────────────────────────────────────────────────────────────

/** Request fullscreen on the document element */
export function goFS() {
  const el = document.documentElement;
  try { (el.requestFullscreen || el.webkitRequestFullscreen || function(){}).call(el); }
  catch(e) {}
}
window.goFS = goFS;

/**
 * Attach a persistent fullscreen re-entry listener.
 * When the guest accidentally swipes out of fullscreen, this pushes back in
 * after a short delay — unless the kiosk settings panel is open.
 */
export function attachFSReentry() {
  const handler = () => {
    const { appState } = window._appState || {};
    const isFS      = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const panelOpen = document.getElementById('kiosk-overlay')?.classList.contains('open');
    // Import lazily to avoid circular dependency at module load time
    import('./state.js').then(({ appState }) => {
      if (!isFS && appState.curView === 'guest' && !panelOpen) {
        setTimeout(goFS, 300);
      }
    });
  };
  document.addEventListener('fullscreenchange',       handler);
  document.addEventListener('webkitfullscreenchange', handler);
}

/** Called by the tech setup bar "go full screen" button */
window.techGoFullscreen = function() {
  goFS();
  document.getElementById('tech-bar').classList.add('hidden');
  const warn = document.getElementById('standalone-warn');
  if (warn) warn.classList.remove('show');
};

// ─── Textarea auto-grow ───────────────────────────────────────────────────────

document.addEventListener('input', e => {
  if (e.target.tagName === 'TEXTAREA') {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 108) + 'px';
  }
});

// ─── Modal overlay click-to-close ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-modal')
    .addEventListener('click', function(e) { if (e.target === this) window.closeAddModal?.(); });
  document.getElementById('edit-modal')
    .addEventListener('click', function(e) { if (e.target === this) window.closeEditModal?.(); });
  document.getElementById('room-archive-modal')
    .addEventListener('click', function(e) { if (e.target === this) window.closeRoomArchive?.(); });
});
