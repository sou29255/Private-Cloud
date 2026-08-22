/**
 * Private Photo Cloud — Isolated PWA Installation Controller
 * Zero Impact on Existing Website Design, Structure, or Animations
 */
(function () {
  'use strict';

  let _deferredInstallPrompt = null;

  // 1. Service Worker Registration (Safe & Non-Intrusive)
  function initServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js')
          .then(function (registration) {
            console.log('[PWA] Service Worker registered with scope:', registration.scope);
          })
          .catch(function (error) {
            // Fallback attempt to service-worker.js
            navigator.serviceWorker.register('/service-worker.js')
              .then(function (reg) {
                console.log('[PWA] Fallback Service Worker registered:', reg.scope);
              })
              .catch(function (err) {
                console.warn('[PWA] Service Worker registration skipped:', err);
              });
          });
      });
    }
  }

  // 2. Standalone Mode Detection (Detect if already installed)
  function isRunningStandalone() {
    return Boolean(
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) ||
      (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) ||
      (window.navigator && window.navigator.standalone === true) ||
      document.referrer.includes('android-app://')
    );
  }

  // 3. Capture Native Browser Install Prompt Event
  window.addEventListener('beforeinstallprompt', function (event) {
    // Prevent the mini-infobar from appearing on mobile
    event.preventDefault();
    _deferredInstallPrompt = event;

    // Show the existing install button if present in topbar
    var topbarBtn = document.getElementById('pwa-install-btn');
    if (topbarBtn) {
      topbarBtn.style.display = 'inline-flex';
    }
    console.log('[PWA] Ready for native installation prompt.');
  });

  // 4. Handle Successful Installation Event
  window.addEventListener('appinstalled', function () {
    _deferredInstallPrompt = null;
    var topbarBtn = document.getElementById('pwa-install-btn');
    if (topbarBtn) {
      topbarBtn.style.display = 'none';
    }
    if (typeof window.showToast === 'function') {
      window.showToast('🎉 Memora installed successfully as an App!', 'success');
    }
    console.log('[PWA] Application successfully installed.');
  });

  // 5. Trigger Native Installation Logic
  function executeInstall() {
    if (isRunningStandalone()) {
      if (typeof window.showToast === 'function') {
        window.showToast('✅ Memora is already installed and running in App Mode!', 'success');
      }
      return;
    }

    if (_deferredInstallPrompt) {
      _deferredInstallPrompt.prompt();
      _deferredInstallPrompt.userChoice.then(function (choiceResult) {
        if (choiceResult && choiceResult.outcome === 'accepted') {
          if (typeof window.showToast === 'function') {
            window.showToast('Memora app installed! 📲✨', 'success');
          }
          if (typeof window.playSuccessSound === 'function') {
            window.playSuccessSound();
          }
        }
        _deferredInstallPrompt = null;
        var topbarBtn = document.getElementById('pwa-install-btn');
        if (topbarBtn) topbarBtn.style.display = 'none';
      }).catch(function (err) {
        console.warn('[PWA] Install prompt error:', err);
      });
    } else {
      // Safe fallback instructions for iOS Safari / desktop browsers without beforeinstallprompt
      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        if (typeof window.showToast === 'function') {
          window.showToast('📲 On iPhone/iPad: Tap the Share button (⎋) and select "Add to Home Screen" ➕', 'info');
        }
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast('📲 To install: Click the (⊕ / Install) icon in your browser address bar or Menu (⋮) -> "Install App"', 'info');
        }
      }
    }
  }

  // 6. Global Exposure (Preserve Compatibility with any existing onclick)
  window.triggerPwaInstall = executeInstall;
  window.isPwaStandalone = isRunningStandalone;

  // 7. Auto-bind to existing install buttons when DOM is ready
  function bindInstallButtons() {
    var topbarBtn = document.getElementById('pwa-install-btn');
    if (topbarBtn) {
      topbarBtn.onclick = function (e) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        executeInstall();
      };
    }

    var sidebarBtn = document.getElementById('sidebar-pwa-install-btn');
    if (sidebarBtn) {
      sidebarBtn.onclick = function (e) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        executeInstall();
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initServiceWorker();
      bindInstallButtons();
    });
  } else {
    initServiceWorker();
    bindInstallButtons();
  }
})();
