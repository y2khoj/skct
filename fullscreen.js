/**
 * SKCT Tablet & Desktop Fullscreen Engine
 * Supports standard HTML5 Fullscreen API, Webkit (iPadOS/Safari), and Home Screen PWA guidance.
 */
(function () {
  'use strict';

  function isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  function toggleFullscreen() {
    const doc = document;
    const docEl = doc.documentElement;

    if (!isFullscreen()) {
      const requestFs =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;

      if (requestFs) {
        requestFs.call(docEl).catch(err => {
          console.warn('Fullscreen request rejected:', err);
          showFullscreenNotice();
        });
      } else {
        showFullscreenNotice();
      }
    } else {
      const exitFs =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;

      if (exitFs) {
        exitFs.call(doc).catch(err => console.warn('Exit fullscreen failed:', err));
      }
    }
  }

  function updateButtons() {
    const active = isFullscreen();
    document.querySelectorAll('.fullscreen-toggle-btn, #fullscreen-btn').forEach(btn => {
      btn.classList.toggle('active', active);
      const icon = btn.querySelector('.fullscreen-icon');
      const text = btn.querySelector('.fullscreen-text');
      if (icon) icon.textContent = active ? '🗗' : '⛶';
      if (text) text.textContent = active ? '창모드' : '전체화면';
      btn.title = active ? '전체화면 종료 (창모드로 복귀)' : '태블릿/PC 전체화면 몰입 모드 (F11)';
    });
  }

  function showFullscreenNotice() {
    // Show friendly guide toast for iOS/iPadOS Safari or restricted browsers
    let toast = document.getElementById('fs-notice-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'fs-notice-toast';
      toast.className = 'fullscreen-toast';
      toast.innerHTML = `
        <div class="fs-toast-content">
          <span class="fs-toast-icon">📱</span>
          <div class="fs-toast-text">
            <strong>태블릿 전체화면 안내</strong>
            <span>아이패드/태블릿 사파리에서는 브라우저 <b>[공유 버튼(↑) → 홈 화면에 추가]</b>를 하시면 상단 주소창이 없는 100% 전체화면 앱으로 편리하게 쓰실 수 있습니다!</span>
          </div>
          <button type="button" class="fs-toast-close" aria-label="닫기">&times;</button>
        </div>
      `;
      document.body.appendChild(toast);
      const closeBtn = toast.querySelector('.fs-toast-close');
      if (closeBtn) closeBtn.addEventListener('click', () => toast.remove());
      setTimeout(() => { if (toast && toast.parentNode) toast.remove(); }, 6000);
    }
  }

  function init() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.fullscreen-toggle-btn, #fullscreen-btn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        toggleFullscreen();
      }
    });

    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
      document.addEventListener(evt, updateButtons);
    });

    // F11 keyboard hotkey
    window.addEventListener('keydown', e => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    });

    updateButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SKCTFullscreen = {
    toggle: toggleFullscreen,
    isFullscreen: isFullscreen,
    showNotice: showFullscreenNotice
  };
})();
