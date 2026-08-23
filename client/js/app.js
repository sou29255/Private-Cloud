// Private Photo Cloud SPA Master Application Controller (Two-Stage Profile Auth, Multi-User Attribution & Upload Engine)
const API_ORIGIN = (window.location.protocol === 'file:' || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port && window.location.port !== '5000')) ? 'http://localhost:5000' : '';

let currentUser = null;
let authToken = localStorage.getItem('vault_auth_token') || '';
let currentPhotos = [];
let selectedPhotoIds = new Set();
let currentViewerIndex = 0;
let currentView = 'dashboard';
let currentMemberFilter = ''; // '' = all members, or 'Soumya', 'Sumana', etc.
let selectedAvatar = '👨‍💻';
let selectedUploadFiles = [];
let deferredPwaPrompt = null;
let touchStartX = 0;
let touchStartY = 0;

async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
  const headers = { ...(options.headers || {}) };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    headers['X-Auth-Token'] = authToken;
  }
  return fetch(url, {
    credentials: 'include',
    ...options,
    headers
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupAuthForms();
  setupUploadListeners();
  setupGlobalListeners();
  setupCommandPalette();
  registerServiceWorker();
  initRealtimeEvents();
  setupTouchGestures();
  checkAuth();
});

// ==========================================================================
// PWA & SERVICE WORKER
// ==========================================================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('[PWA] Service Worker registered successfully'))
      .catch((err) => console.warn('[PWA] SW registration failed:', err));

    // Handle background / lockscreen push notification action clicks
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data || {};
      if (data.type === 'CALL_ANSWER_ACTION' && data.callId) {
        incomingCallData = {
          callId: data.callId,
          caller: data.caller,
          callType: data.callType || 'video'
        };
        acceptIncomingCall();
      } else if (data.type === 'CALL_DECLINE_ACTION' && data.callId) {
        incomingCallData = {
          callId: data.callId,
          caller: data.caller,
          callType: data.callType || 'video'
        };
        declineIncomingCall();
      }
    });
  }

  // Handle URL query action from notification click if opened in new tab
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'answer_call' && urlParams.get('callId')) {
      const paramCallId = urlParams.get('callId');
      const paramCaller = urlParams.get('caller') || '';
      const paramCallType = urlParams.get('callType') || 'video';
      setTimeout(() => {
        incomingCallData = {
          callId: paramCallId,
          caller: paramCaller,
          callType: paramCallType
        };
        acceptIncomingCall();
        // Clean URL without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 800);
    }
  } catch (e) {}

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'flex';
  });
}

function triggerPwaInstall() {
  if (deferredPwaPrompt) {
    deferredPwaPrompt.prompt();
    deferredPwaPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        playSuccessSound();
        showToast('Memora app installed successfully! 📲✨', 'success');
      }
      deferredPwaPrompt = null;
      const btn = document.getElementById('pwa-install-btn');
      if (btn) btn.style.display = 'none';
    });
  } else {
    // Check if already running in standalone PWA window
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      showToast('✅ App is already installed and running in Standalone App Mode!', 'success');
    } else {
      showToast('📲 To install: Click the (⊕ / Install) icon in your browser address bar or browser menu (⋮) ➔ "Install Private Cloud"', 'info');
    }
  }
}

// ==========================================================================
// TACTILE WEB AUDIO SOUND EFFECTS ENGINE (Zero-Latency Micro-Audio FX)
// ==========================================================================
let audioCtx = null;
let soundFXEnabled = true;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// 1. Subtle Tactile Micro-Click Sound (Buttons, chips, small controls)
function playClickSound() {
  if (!soundFXEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch (e) {}
}

// 2. View Switch / Navigation Whoosh / Sliding Chime
function playNavSound() {
  if (!soundFXEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.08);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {}
}

// 3. Heart / Like Sparkling Bubble Chime
function playLikeSound() {
  if (!soundFXEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [587.33, 880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = i * 0.04;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + delay + 0.08);

      gain.gain.setValueAtTime(0.06, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.09);
    });
  } catch (e) {}
}

// 4. Modal Open Glass Chime
function playModalOpenSound() {
  if (!soundFXEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = i * 0.035;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.05, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.13);
    });
  } catch (e) {}
}

// 5. Modal Close / Dismiss Soft Pop
function playModalCloseSound() {
  if (!soundFXEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.055);
  } catch (e) {}
}

// 6. Success / Upload / Toast Chime
function playSuccessSound() {
  if (!soundFXEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = i * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.07, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.19);
    });
  } catch (e) {}
}

// Alias for success chime
function playSuccessChime() {
  playSuccessSound();
}

// 7. Dual Heartbeat Sound FX (Lub-Dub)
function playHeartbeatSound() {
  if (!soundFXEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Pulse 1: "Lub"
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.exponentialRampToValueAtTime(45, now + 0.12);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.13);

    // Pulse 2: "Dub"
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(105, now + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(50, now + 0.32);
    gain2.gain.setValueAtTime(0.24, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.33);
  } catch (e) {}
}

// 8. Crystal Heart Shattering & Particle Explosion Sound FX
function playHeartShatterSound() {
  if (!soundFXEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Glass / Crystal Crack noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // Shimmering crystalline chime harmonics
    [1046.5, 1318.5, 1567.98, 2093.0, 2637.0, 3135.96].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = idx * 0.035;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.4, now + delay + 0.35);

      gain.gain.setValueAtTime(0.09, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.36);
    });
  } catch (e) {}
}

function setupGlobalListeners() {
  // Resume AudioContext on first gesture
  const resumeAudio = () => {
    getAudioContext();
    document.removeEventListener('click', resumeAudio);
    document.removeEventListener('touchstart', resumeAudio);
  };
  document.addEventListener('click', resumeAudio, { once: true });
  document.addEventListener('touchstart', resumeAudio, { once: true });

  // Delegated sound effect for interactive buttons, chips, tabs, cards
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, .nav-item, .mobile-nav-item, .member-filter-chip, .profile-nav-tab, .user-social-card, .aspect-card');
    if (target) {
      if (target.classList.contains('fav-btn') || target.classList.contains('card-stat-chip') || target.id === 'viewer-like-btn') {
        // Handled specifically by like handlers
        return;
      }
      playClickSound();
    }
  }, true);
}

// ==========================================================================
// MODAL CONTROLLERS (OPEN / CLOSE / SYNC)
// ==========================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('active');
  playModalOpenSound();

  if (modalId === 'upload-modal') {
    const avatarEl = document.getElementById('upload-user-avatar');
    const nameEl = document.getElementById('upload-user-name');
    const isSoumya = (currentUser?.username?.toLowerCase() === 'soumya' || currentUser?.role === 'HEAD_ADMIN');
    if (avatarEl) avatarEl.innerText = isSoumya ? '👑' : (currentUser?.avatar || '👤');
    if (nameEl) nameEl.innerText = currentUser?.displayName || currentUser?.username || 'Soumya';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('active');
  playModalCloseSound();
}

function toggleModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  if (modal.classList.contains('active')) {
    closeModal(modalId);
  } else {
    openModal(modalId);
  }
}

// ==========================================================================
// TOUCH GESTURES
// ==========================================================================
function setupTouchGestures() {
  const viewerModal = document.getElementById('viewer-modal');
  if (!viewerModal) return;

  viewerModal.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  viewerModal.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;

      if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
        if (deltaX < 0) nextPhoto();
        else prevPhoto();
      } else if (deltaY > 100 && Math.abs(deltaX) < 50) {
        closeViewer();
      }
    }
  }, { passive: true });
}

// ==========================================================================
// REAL-TIME SERVER-SENT EVENTS & PUSH NOTIFICATIONS
// ==========================================================================
function initRealtimeEvents() {
  if (typeof EventSource !== 'undefined') {
    const evtSource = new EventSource(`${API_ORIGIN}/api/realtime/stream`, { withCredentials: true });

    evtSource.addEventListener('STORAGE_UPDATE', () => {
      loadStorageStats();
      loadMembersFilter();
    });

    evtSource.addEventListener('PHOTO_UPLOADED', (e) => {
      try {
        const data = JSON.parse(e.data);
        playNotificationChime();
        showToast(`📲 [Alert 9239425276] ${data.title}: ${data.message}`, 'success');

        // Trigger native phone / browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title, {
            body: data.message,
            icon: './manifest.json'
          });
        }

        // Live refresh gallery
        loadGallery(currentView);
        loadStorageStats();
        loadMembersFilter();
      } catch (err) {}
    });

    // Real-Time Direct Message Listener
    evtSource.addEventListener('NEW_DIRECT_MESSAGE', (e) => {
      try {
        const parsed = JSON.parse(e.data);
        const msg = parsed.payload || parsed;
        const currentU = (currentUser?.username || '').toLowerCase();
        const sender = (msg.sender || '').toLowerCase();
        const receiver = (msg.receiver || '').toLowerCase();

        if (receiver === currentU || sender === currentU) {
          if (activeChatUsername && (activeChatUsername.toLowerCase() === sender || activeChatUsername.toLowerCase() === receiver)) {
            pollDirectMessages(activeChatUsername);
          } else if (receiver === currentU) {
            playNotificationChime();
            showToast(`💬 New message from @${msg.sender}`, 'info');
          }
          loadMessengerInbox();
          checkPendingRequestsBadge();
        }
      } catch (err) {}
    });

    // Real-Time Incoming Call Listener (Voice & Video)
    evtSource.addEventListener('INCOMING_CALL', (e) => {
      try {
        const parsed = JSON.parse(e.data);
        const call = parsed.payload || parsed;
        const currentU = (currentUser?.username || '').toLowerCase();
        if ((call.target || '').toLowerCase() === currentU) {
          handleIncomingCallEvent(call);
        }
      } catch (err) {}
    });

    // Real-Time Call Response Listener (Accept/Reject/End)
    evtSource.addEventListener('CALL_RESPONSE', (e) => {
      try {
        const parsed = JSON.parse(e.data);
        const resp = parsed.payload || parsed;
        handleCallResponseEvent(resp);
      } catch (err) {}
    });

    // Real-Time WebRTC Audio & Video Signaling (Offer/Answer/ICE)
    evtSource.addEventListener('CALL_WEBRTC_SIGNAL', (e) => {
      try {
        const parsed = JSON.parse(e.data);
        const signal = parsed.payload || parsed;
        const currentU = (currentUser?.username || '').toLowerCase();
        if ((signal.target || '').toLowerCase() === currentU) {
          handleWebRTCSignalEvent(signal);
        }
      } catch (err) {}
    });

    // Real-Time Message Request Listener
    evtSource.addEventListener('NEW_CHAT_REQUEST', (e) => {
      try {
        const parsed = JSON.parse(e.data);
        const req = parsed.payload || parsed;
        const currentU = (currentUser?.username || '').toLowerCase();
        if ((req.to || '').toLowerCase() === currentU) {
          playNotificationChime();
          showToast(`✉️ New message request from @${req.from}`, 'info');
          checkPendingRequestsBadge();
        }
      } catch (err) {}
    });

    evtSource.onerror = () => {};
  }
}

// Subtle Audio Chime for Notifications
function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {}
}

// Request Browser & Phone Push Notification Permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showToast('Phone & Browser Push Alerts Enabled! 🔔', 'success');
      }
    });
  }
}

// Network Status
window.addEventListener('online', () => {
  const badge = document.getElementById('network-badge');
  const text = document.getElementById('network-status-text');
  if (badge) {
    badge.className = 'network-badge';
    text.innerText = 'ONLINE';
  }
  showToast('Network connection restored. Online mode active 🌐', 'success');
});

window.addEventListener('offline', () => {
  const badge = document.getElementById('network-badge');
  const text = document.getElementById('network-status-text');
  if (badge) {
    badge.className = 'network-badge offline';
    text.innerText = 'OFFLINE';
  }
  showToast('You are offline. Offline cache shell active 📡', 'warning');
});

// Toast notification display helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'ℹ️';
  if (type === 'success') {
    icon = '✅';
    playSuccessSound();
  } else if (type === 'warning') {
    icon = '⚠️';
    playClickSound();
  } else if (type === 'error') {
    icon = '❌';
    playClickSound();
  }

  toast.innerHTML = `<span style="font-size:18px">${icon}</span> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================================================
// TWO-STAGE AUTHENTICATION LOGIC (GATEKEEPER -> PROFILE)
// ==========================================================================
async function checkAuth() {
  const isGatewayUnlocked = sessionStorage.getItem('vault_gateway_unlocked') === 'true';
  const isProfileAuthenticated = sessionStorage.getItem('vault_profile_authenticated') === 'true';

  if (!isGatewayUnlocked) {
    showLoginStep1();
    return;
  }

  // If gateway is unlocked and profile was explicitly authenticated in this session, verify session
  if (isProfileAuthenticated && authToken) {
    try {
      const headers = { 'Authorization': `Bearer ${authToken}` };
      const res = await fetch(`${API_ORIGIN}/api/auth/me`, { credentials: 'include', headers });
      const data = await res.json();

      if (data.success && data.user) {
        currentUser = data.user;
        currentMemberFilter = currentUser.username || '';
        updateUserProfileUI();
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('app-view').style.display = 'flex';
        initDashboard();
        return;
      }
    } catch (err) {}
  }

  // Gateway unlocked but no active profile session -> show Step 2 profile selection screen
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('app-view').style.display = 'none';
  document.getElementById('vault-step1-card').style.display = 'none';
  document.getElementById('vault-step2-card').style.display = 'block';
  const passInput = document.getElementById('profile-login-password');
  if (passInput) passInput.value = '';
  loadAvailableProfiles();
  if (typeof startThreeAnimation === 'function') startThreeAnimation();
}

function showLoginStep1() {
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('app-view').style.display = 'none';
  document.getElementById('vault-step1-card').style.display = 'block';
  document.getElementById('vault-step2-card').style.display = 'none';
  const pwdInput = document.getElementById('vault-master-password');
  if (pwdInput) {
    pwdInput.value = '';
    pwdInput.focus();
  }
}

function backToStep1() {
  document.getElementById('vault-step1-card').style.display = 'block';
  document.getElementById('vault-step2-card').style.display = 'none';
}

function promptSwitchProfile() {
  currentUser = null;
  authToken = '';
  sessionStorage.removeItem('vault_profile_authenticated');
  localStorage.removeItem('vault_auth_token');
  document.body.classList.remove('user-is-soumya', 'user-is-sumana');

  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('app-view').style.display = 'none';
  document.getElementById('vault-step1-card').style.display = 'none';
  document.getElementById('vault-step2-card').style.display = 'block';
  const passInput = document.getElementById('profile-login-password');
  if (passInput) passInput.value = '';
  loadAvailableProfiles();
  if (typeof startThreeAnimation === 'function') startThreeAnimation();
}

function toggleSidebar(forceState) {
  const sidebar = document.getElementById('main-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;

  const isOpen = typeof forceState === 'boolean' ? forceState : !sidebar.classList.contains('open');
  if (isOpen) {
    sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
    playModalOpenSound();
  } else {
    sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    playModalCloseSound();
  }
}

async function handleLogout() {
  try {
    await fetch(`${API_ORIGIN}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    });
  } catch (e) {}

  currentUser = null;
  authToken = '';
  document.body.classList.remove('user-is-soumya', 'user-is-sumana');
  localStorage.removeItem('vault_auth_token');
  sessionStorage.removeItem('vault_gateway_unlocked');
  sessionStorage.removeItem('vault_profile_authenticated');
  sessionStorage.removeItem('pradhan_guide_shown_session');
  currentMemberFilter = '';
  currentView = 'photos';

  // Close any open modals and sidebar
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  const sidebar = document.getElementById('main-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');

  // Completely reset & purge AI Chatbot history silently for fresh session
  if (typeof clearChatHistory === 'function') {
    clearChatHistory(true);
  }
  if (typeof endCurrentCall === 'function') {
    endCurrentCall();
  }
  if (typeof closeProfileMessenger === 'function') {
    closeProfileMessenger();
  }

  if (typeof startThreeAnimation === 'function') startThreeAnimation();
  showToast('Logged out securely. 👋', 'info');
  if (typeof animateLogoutTransition === 'function') {
    animateLogoutTransition();
  } else {
    showLoginStep1();
  }
}

function updateHeroGreeting() {
  if (!currentUser) return;
  const greetingPill = document.getElementById('hero-greeting-pill');
  const heroHeading = document.getElementById('hero-heading');

  const hour = new Date().getHours();
  let timeOfDay = 'Good day';
  let emoji = '☀️';
  if (hour >= 5 && hour < 12) { timeOfDay = 'Good morning'; emoji = '🌅'; }
  else if (hour >= 12 && hour < 17) { timeOfDay = 'Good afternoon'; emoji = '☀️'; }
  else if (hour >= 17 && hour < 21) { timeOfDay = 'Good evening'; emoji = '🌆'; }
  else { timeOfDay = 'Good night'; emoji = '🌙'; }

  const name = currentUser.displayName || currentUser.username || 'User';
  if (greetingPill) greetingPill.innerHTML = `${emoji} ${timeOfDay}, <strong>${name}</strong>! ✨`;
  if (heroHeading) heroHeading.innerText = 'YOUR MEMORIES VAULT';
}

function renderHeroSpotlight(photos) {
  const container = document.getElementById('hero-cards-container');
  if (!container) return;

  const validPhotos = (photos || []).filter(p => p && (p._id || p.id));

  // If we have photos, spotlight the top 3 (or latest 3)
  if (validPhotos.length > 0) {
    const spotlight = validPhotos.slice(0, 3);
    container.innerHTML = spotlight.map((p) => {
      const photoId = p._id || p.id;
      const uploaderName = p.uploadedBy?.displayName || p.uploadedBy?.username || 'Member';
      const likes = typeof p.likes === 'number' ? p.likes : (p.likedBy?.length || 0);
      const realIdx = currentPhotos.findIndex(cp => (cp._id === photoId || cp.id === photoId));

      const isVideo = Boolean(
        p.isVideo || 
        p.mimeType?.startsWith('video/') ||
        ['.mp4', '.mov', '.avi', '.webm', '.mkv'].some(ext => (p.filename || p.originalName || '').toLowerCase().endsWith(ext))
      );

      // Resolve high-res / medium URL
      let mediaSrc = p.storagePaths?.medium || p.storagePaths?.thumbnail || p.storagePaths?.original || p.url || '';
      if (!mediaSrc || !mediaSrc.startsWith('http')) {
        mediaSrc = `${API_ORIGIN}/api/photos/file/${photoId}/${isVideo ? 'original' : 'medium'}`;
      }

      let mediaHtml = '';
      if (isVideo) {
        mediaHtml = `
          <video class="floating-card-media" src="${mediaSrc}" muted loop playsinline preload="metadata" onmouseover="this.play().catch(()=>{})" onmouseout="this.pause()"></video>
          <div class="floating-card-play-icon">▶</div>
          <span class="floating-card-tag tag-video">🎬 Video</span>
        `;
      } else {
        mediaHtml = `
          <img class="floating-card-media" src="${mediaSrc}" alt="${p.originalName || 'Memory'}" loading="lazy" />
          <span class="floating-card-tag tag-photo">🖼️ Photo</span>
        `;
      }

      return `
        <div class="floating-card-3d" 
             style="background-image: url('${mediaSrc}');"
             onclick="openViewer(${realIdx >= 0 ? realIdx : 0})"
             title="Click to view ${isVideo ? 'video' : 'photo'} by ${uploaderName}">
          ${mediaHtml}
          <div class="floating-card-overlay">
            <div class="floating-card-badge">
              <span>👤 ${uploaderName}</span>
              <span>❤️ ${likes}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // If less than 3 photos, fill the rest with quick action cards
    if (spotlight.length < 3) {
      if (spotlight.length === 1) {
        container.innerHTML += `
          <div class="floating-card-3d quick-action-card" onclick="openModal('upload-modal')" title="Upload New Memory">
            <div class="quick-card-inner">
              <span class="quick-card-icon">➕</span>
              <span class="quick-card-title">Add Photo</span>
            </div>
          </div>
          <div class="floating-card-3d quick-action-card" onclick="switchView('music', 'Music Vault 🎵')" title="Play Music Vault">
            <div class="quick-card-inner">
              <span class="quick-card-icon">🎵</span>
              <span class="quick-card-title">Music Vault</span>
            </div>
          </div>
        `;
      } else if (spotlight.length === 2) {
        container.innerHTML += `
          <div class="floating-card-3d quick-action-card" onclick="openModal('upload-modal')" title="Upload New Memory">
            <div class="quick-card-inner">
              <span class="quick-card-icon">➕</span>
              <span class="quick-card-title">Add Photo</span>
            </div>
          </div>
        `;
      }
    }
  } else {
    // Default interactive quick action hub cards
    container.innerHTML = `
      <div class="floating-card-3d quick-action-card" onclick="openModal('upload-modal')" title="Upload New Memory">
        <div class="quick-card-inner">
          <span class="quick-card-icon">📸</span>
          <span class="quick-card-title">Upload Photo</span>
          <span class="quick-card-subtitle">Store in 4K</span>
        </div>
      </div>
      <div class="floating-card-3d quick-action-card" onclick="switchView('music', 'Music Vault 🎵')" title="Play Music Vault">
        <div class="quick-card-inner">
          <span class="quick-card-icon">🎵</span>
          <span class="quick-card-title">Music Vault</span>
          <span class="quick-card-subtitle">14 Songs</span>
        </div>
      </div>
      <div class="floating-card-3d quick-action-card" onclick="openProfileHub(currentUser?.username)" title="My Profile Hub">
        <div class="quick-card-inner">
          <span class="quick-card-icon">👑</span>
          <span class="quick-card-title">Profile Hub</span>
          <span class="quick-card-subtitle">Timeline</span>
        </div>
      </div>
    `;
  }
}

function updateUserProfileUI() {
  if (!currentUser) return;
  window.currentUser = currentUser;
  const avatarEl = document.getElementById('topbar-user-avatar');
  const nameEl = document.getElementById('topbar-user-name');
  const sidebarAvatarEl = document.getElementById('sidebar-user-avatar');
  const sidebarNameEl = document.getElementById('sidebar-user-name');
  const headAdminNav = document.getElementById('nav-head-admin');
  const headAdminBtn = document.getElementById('topbar-admin-btn');
  const onlyForYouNav = document.getElementById('nav-only-for-you');
  const mobileOnlyForYouNav = document.getElementById('mobile-nav-only-for-you');

  const isSoumya = (currentUser.username?.toLowerCase() === 'soumya' || currentUser.role === 'HEAD_ADMIN');
  const isSumana = (currentUser.username?.toLowerCase() === 'sumana' || currentUser.username?.toLowerCase() === 'sumona');
  const canAccessSpecialVault = isSumana; // Strictly exclusive to Sumana account only (Soumya & other users cannot view)

  const displayName = currentUser.displayName || currentUser.username || (isSoumya ? 'Soumya' : (isSumana ? 'Sumana' : 'User'));
  if (nameEl) nameEl.innerText = displayName;

  if (avatarEl) {
    if (currentUser.customAvatarUrl) {
      avatarEl.innerHTML = `<img src="${API_ORIGIN}${currentUser.customAvatarUrl}" style="width:24px; height:24px; border-radius:50%; object-fit:cover; display:inline-block; vertical-align:middle;" />`;
    } else {
      avatarEl.innerHTML = isSoumya ? '👑' : (isSumana ? '👩‍🦰' : (currentUser.avatar || '👤'));
    }
  }

  if (sidebarAvatarEl) {
    if (currentUser.customAvatarUrl) {
      sidebarAvatarEl.innerHTML = `<img src="${API_ORIGIN}${currentUser.customAvatarUrl}" style="width:20px; height:20px; border-radius:50%; object-fit:cover; display:inline-block; vertical-align:middle;" />`;
    } else {
      sidebarAvatarEl.innerText = isSoumya ? '👑' : (isSumana ? '👩‍🦰' : (currentUser.avatar || '👤'));
    }
  }
  if (sidebarNameEl) {
    sidebarNameEl.innerText = `${displayName}'s Hub`;
  }

  document.body.classList.toggle('user-is-soumya', isSoumya);
  document.body.classList.toggle('user-is-sumana', isSumana);

  // Show / Hide Head Admin privileged controls (Strictly Authorized for Soumya Only)
  if (headAdminNav) headAdminNav.style.setProperty('display', isSoumya ? 'flex' : 'none', 'important');
  if (headAdminBtn) headAdminBtn.style.setProperty('display', isSoumya ? 'inline-flex' : 'none', 'important');

  // Show / Hide Special "Only For You" VIP Option (Strictly and Exclusively for Sumana)
  if (onlyForYouNav) onlyForYouNav.style.setProperty('display', canAccessSpecialVault ? 'flex' : 'none', 'important');
  if (mobileOnlyForYouNav) mobileOnlyForYouNav.style.setProperty('display', canAccessSpecialVault ? 'flex' : 'none', 'important');

  updateHeroGreeting();
}

function setupAuthForms() {
  // Step 1: Vault Master Password Submit
  document.getElementById('vault-step1-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('vault-master-password').value;

    try {
      const res = await fetch(`${API_ORIGIN}/api/auth/vault-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('vault_gateway_unlocked', 'true');
        showToast('Vault Gateway Unlocked! 🔓 Please select your profile.', 'success');
        document.getElementById('vault-step1-card').style.display = 'none';
        document.getElementById('vault-step2-card').style.display = 'block';
        loadAvailableProfiles();
      } else {
        showToast(data.error?.message || 'Incorrect master password.', 'error');
      }
    } catch (err) {
      showToast('Failed to connect to authentication server.', 'error');
    }
  });

  // Step 2: Profile Login Submit
  document.getElementById('profile-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('profile-login-username').value;
    const password = document.getElementById('profile-login-password').value;
    const rememberMe = document.getElementById('profile-remember')?.checked || false;

    try {
      const res = await fetch(`${API_ORIGIN}/api/auth/profile/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, rememberMe })
      });

      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        authToken = data.token;
        currentMemberFilter = currentUser.username || '';
        sessionStorage.setItem('vault_profile_authenticated', 'true');
        if (data.token) localStorage.setItem('vault_auth_token', data.token);
        updateUserProfileUI();
        showToast(`Welcome back, ${currentUser.displayName || currentUser.username}! 🌟`, 'success');
        animateLoginTransition(() => initDashboard());
      } else {
        showToast(data.error?.message || 'Invalid username or profile password.', 'error');
      }
    } catch (err) {
      showToast('Failed to log in to profile.', 'error');
    }
  });

  // Step 2: Profile Registration Submit
  document.getElementById('profile-register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('reg-username')?.value || '').trim();
    const displayName = (document.getElementById('reg-displayname')?.value || '').trim();
    const password = (document.getElementById('reg-password')?.value || '').trim();
    const birthday = (document.getElementById('reg-birthday')?.value || '').trim();
    const rawPhone = (document.getElementById('reg-phone')?.value || '').trim();
    
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.substring(2);
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }

    if (!username || !password) {
      showToast('Please enter both username and password.', 'warning');
      return;
    }

    if (password.length < 3) {
      showToast('Password must be at least 3 characters.', 'warning');
      return;
    }

    if (!birthday) {
      showToast('Please select your Date of Birth (Birthday) 🎂', 'warning');
      const bdayInput = document.getElementById('reg-birthday');
      if (bdayInput) bdayInput.focus();
      return;
    }

    // Strict 10-digit validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone) || /^(\d)\1{9}$/.test(cleanPhone) || cleanPhone === '1234567890') {
      showToast('Please enter a valid 10-digit mobile number (e.g. 9876543210).', 'warning');
      const phoneInput = document.getElementById('reg-phone');
      if (phoneInput) phoneInput.focus();
      return;
    }

    const submitBtn = document.getElementById('reg-submit-btn') || e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerText : 'CREATE ACCOUNT & ENTER 🚀';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'CREATING ACCOUNT... ⏳';
    }

    try {
      const res = await fetch(`${API_ORIGIN}/api/auth/profile/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username,
          displayName: displayName || username,
          password,
          avatar: selectedAvatar || '👨‍💻',
          phoneNumber: cleanPhone,
          birthday
        })
      });

      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        authToken = data.token;
        currentMemberFilter = currentUser.username || '';
        sessionStorage.setItem('vault_profile_authenticated', 'true');
        if (data.token) localStorage.setItem('vault_auth_token', data.token);
        updateUserProfileUI();
        playSuccessSound();
        showToast(`Profile "${currentUser.displayName}" created! Welcome to your Private Cloud! 🚀`, 'success');
        animateLoginTransition(() => initDashboard());
      } else {
        showToast(data.error?.message || 'Could not create profile.', 'error');
      }
    } catch (err) {
      showToast('Failed to register new profile. Check network connection.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
      }
    }
  });
}

function skipToStep2Signup() {
  playNavSound();
  const step1Card = document.getElementById('vault-step1-card');
  const step2Card = document.getElementById('vault-step2-card');
  if (step1Card) step1Card.style.display = 'none';
  if (step2Card) step2Card.style.display = 'block';
  loadAvailableProfiles();
  toggleRegisterMode(true);
}

let isSecretVipProfileRevealed = false;

// Load ONLY Soumya by default, and keep Sumana hidden until secret trigger clicked
async function loadAvailableProfiles() {
  const container = document.getElementById('quick-profiles-grid');
  if (!container) return;

  try {
    const res = await fetch(`${API_ORIGIN}/api/auth/profiles`, { credentials: 'include' });
    const data = await res.json();

    if (data.success && data.profiles && data.profiles.length > 0) {
      // Strictly ONLY Soumya and Sumana
      const allowed = ['soumya', 'sumana', 'sumona'];
      const filtered = data.profiles.filter(p => allowed.includes(p.username.toLowerCase()));

      container.innerHTML = filtered.map(p => {
        const isSoumya = (p.username.toLowerCase() === 'soumya');
        const icon = isSoumya ? '👑' : '👩‍🦰';
        const roleText = isSoumya ? '👑 Head Admin' : '💖 Protected VIP';
        const isHidden = !isSoumya && !isSecretVipProfileRevealed;

        return `
          <div class="quick-profile-card ${isSoumya ? 'selected' : ''}" 
               id="card-profile-${p.username.toLowerCase()}" 
               onclick="selectQuickProfile('${p.username}', '${p.displayName}')"
               style="${isHidden ? 'display:none; opacity:0;' : 'display:block; opacity:1; animation:fadeInCard 0.35s ease forwards;'}">
            <div style="font-size:30px; margin-bottom:6px;">${icon}</div>
            <div style="font-weight:800; font-size:14px; color:var(--text-primary);">${p.displayName || p.username}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${roleText}</div>
          </div>
        `;
      }).join('');

      if (isSecretVipProfileRevealed) {
        container.style.gridTemplateColumns = 'repeat(2, 1fr)';
      } else {
        container.style.gridTemplateColumns = '1fr';
        // Auto-select Soumya
        const userInput = document.getElementById('profile-login-username');
        if (userInput && (!userInput.value || userInput.value.toLowerCase() === 'soumya')) {
          userInput.value = 'Soumya';
        }
      }
    }
  } catch (e) {}
}

function toggleSecretVipProfile() {
  isSecretVipProfileRevealed = !isSecretVipProfileRevealed;
  playNavSound();

  const triggerBtn = document.getElementById('btn-secret-vip-reveal');
  const sumanaCard = document.getElementById('card-profile-sumana') || document.getElementById('card-profile-sumona');
  const grid = document.getElementById('quick-profiles-grid');

  if (isSecretVipProfileRevealed) {
    if (triggerBtn) {
      triggerBtn.innerHTML = '💖';
      triggerBtn.style.color = '#ff4081';
      triggerBtn.style.filter = 'drop-shadow(0 0 8px rgba(255,64,129,0.8))';
    }
    if (grid) grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    if (sumanaCard) {
      sumanaCard.style.display = 'block';
      setTimeout(() => {
        sumanaCard.style.opacity = '1';
        sumanaCard.style.animation = 'scaleUpSumana 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
      }, 30);
    }
    showToast('Secret VIP profile unlocked ✨', 'success');
  } else {
    if (triggerBtn) {
      triggerBtn.innerHTML = '🔒';
      triggerBtn.style.color = 'rgba(255,255,255,0.3)';
      triggerBtn.style.filter = 'none';
    }
    if (sumanaCard) {
      sumanaCard.style.opacity = '0';
      sumanaCard.style.display = 'none';
    }
    if (grid) grid.style.gridTemplateColumns = '1fr';
    // Re-select Soumya
    selectQuickProfile('Soumya', 'Soumya (Head Admin)');
  }
}

function selectQuickProfile(username, displayName) {
  playClickSound();
  const userInput = document.getElementById('profile-login-username');
  const passInput = document.getElementById('profile-login-password');
  if (userInput) userInput.value = username;
  if (passInput) passInput.focus();

  document.querySelectorAll('.quick-profile-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById(`card-profile-${username.toLowerCase()}`);
  if (card) card.classList.add('selected');

  toggleRegisterMode(false);
  showToast(`Account "${displayName || username}" selected. Enter password.`, 'info');
}

function toggleRegisterMode(isRegister) {
  playNavSound();
  const loginForm = document.getElementById('profile-login-form');
  const registerForm = document.getElementById('profile-register-form');
  const quickProfiles = document.getElementById('quick-profiles-container');
  const tabLogin = document.getElementById('tab-btn-login');
  const tabSignup = document.getElementById('tab-btn-signup');

  if (isRegister) {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (quickProfiles) quickProfiles.style.display = 'none';
    if (tabLogin) tabLogin.classList.remove('active');
    if (tabSignup) tabSignup.classList.add('active');
    const regUserInput = document.getElementById('reg-username');
    if (regUserInput) regUserInput.focus();
  } else {
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (quickProfiles) quickProfiles.style.display = 'block';
    if (tabLogin) tabLogin.classList.add('active');
    if (tabSignup) tabSignup.classList.remove('active');
  }
}

function selectAvatar(avatarEmoji, el) {
  selectedAvatar = avatarEmoji;
  document.querySelectorAll('.avatar-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
}

// ==========================================================================
// UPLOAD ENGINE (DRAG & DROP, MULTI-FILE, PROGRESS BAR)
// ==========================================================================
function setupUploadListeners() {
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('file-input-element');
  const browseBtn = document.getElementById('browse-files-btn');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    if (browseBtn) {
      browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    // Highlight dropzone on drag
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.remove('drag-over'), false);
    });

    // Handle dropped files
    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleFilesSelected(dt.files);
      }
    });

    // Handle files selected via file dialog
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFilesSelected(e.target.files);
      }
    });
  }

  // Setup Album Create Dropzone Drag & Drop
  const albumDropzone = document.getElementById('album-files-dropzone');
  if (albumDropzone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      albumDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      albumDropzone.addEventListener(eventName, () => albumDropzone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      albumDropzone.addEventListener(eventName, () => albumDropzone.classList.remove('drag-over'), false);
    });

    albumDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleAlbumInitialFilesSelected({ target: { files: dt.files } });
      }
    });
  }
}

function handleFilesSelected(fileList) {
  if (!fileList || fileList.length === 0) return;

  const isVideoOnlyMode = (currentUploadModalMode === 'video' || currentView === 'videos');
  const maxVideoBytes = 30 * 1024 * 1024; // 30 MB

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const isVideo = file.type.startsWith('video/') || ['.mp4', '.mov', '.avi', '.webm', '.mkv'].some(ext => file.name.toLowerCase().endsWith(ext));

    if (isVideoOnlyMode) {
      if (!isVideo) {
        showToast(`⚠️ "${file.name}" একটি ছবি! ভিডিও সেকশনে শুধুমাত্র ভিডিও আপলোড করা যাবে।`, 'warning');
        continue;
      }
      if (file.size > maxVideoBytes) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        showToast(`❌ "${file.name}" (${sizeMB} MB) ভিডিও সাইজ লিমিট (সর্বোচ্চ 30 MB) অতিক্রম করেছে!`, 'error');
        continue;
      }
    } else {
      if (isVideo && file.size > maxVideoBytes) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        showToast(`❌ ভিডিও "${file.name}" (${sizeMB} MB) সর্বোচ্চ 30 MB লিমিট অতিক্রম করেছে!`, 'error');
        continue;
      }
    }

    selectedUploadFiles.push(file);
  }

  renderUploadQueue();
}

function renderUploadQueue() {
  const queueContainer = document.getElementById('upload-queue-container');
  const queueCount = document.getElementById('upload-queue-count');
  const fileListEl = document.getElementById('upload-file-list');
  const startBtn = document.getElementById('start-upload-btn');

  if (!queueContainer || !fileListEl) return;

  if (selectedUploadFiles.length === 0) {
    queueContainer.style.display = 'none';
    if (startBtn) startBtn.innerText = 'Upload to Vault 🚀';
    return;
  }

  queueContainer.style.display = 'block';
  if (queueCount) queueCount.innerText = `${selectedUploadFiles.length} File(s) Ready to Upload`;
  if (startBtn) startBtn.innerText = `Upload ${selectedUploadFiles.length} File(s) 🚀`;

  fileListEl.innerHTML = selectedUploadFiles.map((file, idx) => {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const isVideo = file.type.startsWith('video/');
    const icon = isVideo ? '🎬' : '📷';

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0;">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80%;">
          ${icon} ${file.name} (${sizeMB} MB)
        </span>
        <button type="button" style="background:none; border:none; color:var(--status-danger); cursor:pointer; font-size:12px;" onclick="removeUploadFile(${idx})">✖</button>
      </div>
    `;
  }).join('');
}

function removeUploadFile(index) {
  selectedUploadFiles.splice(index, 1);
  renderUploadQueue();
}

function clearUploadQueue() {
  selectedUploadFiles = [];
  const fileInput = document.getElementById('file-input-element');
  if (fileInput) fileInput.value = '';
  renderUploadQueue();
}

// Start Upload Execution via XHR (with live progress tracking)
function startUpload() {
  if (selectedUploadFiles.length === 0) {
    // If no files selected yet, trigger file picker
    document.getElementById('file-input-element')?.click();
    return;
  }

  const progressContainer = document.getElementById('upload-progress-container');
  const progressBar = document.getElementById('upload-progress-bar');
  const percentageText = document.getElementById('upload-percentage-text');
  const statusText = document.getElementById('upload-status-text');
  const startBtn = document.getElementById('start-upload-btn');

  if (progressContainer) progressContainer.style.display = 'block';
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.style.opacity = '0.5';
    startBtn.innerText = 'Uploading...';
  }

  const formData = new FormData();
  selectedUploadFiles.forEach(file => {
    formData.append('photos', file);
  });
  if (authToken) formData.append('token', authToken);
  if (currentUser?.username) formData.append('uploaderUsername', currentUser.username);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API_ORIGIN}/api/photos/upload`, true);
  xhr.withCredentials = true;

  if (authToken) {
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.setRequestHeader('X-Auth-Token', authToken);
  }

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percentComplete = Math.round((e.loaded / e.total) * 100);
      if (progressBar) progressBar.style.width = `${percentComplete}%`;
      if (percentageText) percentageText.innerText = `${percentComplete}%`;
      if (statusText) statusText.innerText = `Transferring files (${(e.loaded / (1024 * 1024)).toFixed(1)} / ${(e.total / (1024 * 1024)).toFixed(1)} MB)...`;
    }
  };

  xhr.onload = () => {
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      startBtn.innerText = 'Upload to Vault 🚀';
    }

    if (xhr.status === 200 || xhr.status === 201) {
      try {
        const data = JSON.parse(xhr.responseText);
        const uploadedCount = data.uploadedCount || selectedUploadFiles.length;
        showToast(`🎉 Successfully uploaded ${uploadedCount} memory item(s) to vault!`, 'success');

        if (data.duplicatesCount > 0) {
          showToast(`ℹ️ ${data.duplicatesCount} duplicate photo(s) skipped.`, 'info');
        }

        const hasUploadedVideo = selectedUploadFiles.some(f => f.type && f.type.startsWith('video/'));
        clearUploadQueue();
        if (progressContainer) progressContainer.style.display = 'none';
        closeModal('upload-modal');

        // Instant refresh
        loadGallery(currentView).then(() => {
          if (hasUploadedVideo) {
            const firstVideoCard = document.querySelector('#gallery-grid .photo-card.is-video-card');
            if (firstVideoCard) {
              firstVideoCard.classList.add('videos-upload-reveal');
            }
          }
        });
        loadMembersFilter();
        loadStorageStats();
      } catch (e) {
        showToast('Photos uploaded successfully!', 'success');
        clearUploadQueue();
        closeModal('upload-modal');
        loadGallery(currentView);
      }
    } else {
      let errMsg = 'Failed to upload files.';
      try {
        const errData = JSON.parse(xhr.responseText);
        errMsg = errData.error?.message || errMsg;
      } catch (e) {}
      showToast(`Upload Error: ${errMsg}`, 'error');
      if (statusText) statusText.innerText = 'Upload failed. Please retry.';
    }
  };

  xhr.onerror = () => {
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      startBtn.innerText = 'Upload to Vault 🚀';
    }
    showToast('Network error during file upload.', 'error');
    if (statusText) statusText.innerText = 'Connection error.';
  };

  xhr.send(formData);
}

// ==========================================================================
// HEAD ADMIN USER MANAGEMENT
// ==========================================================================
let allAdminUsersCache = [];

async function openUserManagerModal() {
  openModal('user-manager-modal');
  if (allAdminUsersCache && allAdminUsersCache.length > 0) {
    renderAdminUserList(allAdminUsersCache);
  }
  await loadUserManagerList();
}

async function loadUserManagerList() {
  const wrap = document.getElementById('admin-user-list-wrap');
  if (!wrap) return;
  
  if (!allAdminUsersCache || allAdminUsersCache.length === 0) {
    wrap.innerHTML = '<div class="skeleton" style="height:80px; background:rgba(255,255,255,0.08); border-radius:8px;"></div>';
  }

  try {
    const res = await apiFetch('/api/auth/users');
    const data = await res.json();

    if (data.success && data.users) {
      allAdminUsersCache = data.users;
      renderAdminUserList(allAdminUsersCache);
    }
  } catch (e) {
    if (!allAdminUsersCache || allAdminUsersCache.length === 0) {
      wrap.innerHTML = '<p style="color:var(--status-danger); padding:20px; text-align:center;">Failed to load user profiles.</p>';
    }
  }
}

function renderAdminUserList(users) {
  const wrap = document.getElementById('admin-user-list-wrap');
  if (!wrap) return;

  if (!users || users.length === 0) {
    wrap.innerHTML = '<p style="color:var(--text-muted); padding:20px; text-align:center;">No matching member profiles found.</p>';
    return;
  }

  wrap.innerHTML = users.map(u => {
    const isSoumya = (u.username.toLowerCase() === 'soumya');
    const isSumana = (u.username.toLowerCase() === 'sumana' || u.username.toLowerCase() === 'sumona');

    let badgeHtml = `<span style="font-size:11px; font-weight:700; background:rgba(0,229,255,0.2); color:var(--accent-cyan); padding:3px 8px; border-radius:12px;">👤 MEMBER</span>`;
    if (isSoumya) {
      badgeHtml = `<span style="font-size:11px; font-weight:800; background:rgba(255,215,0,0.25); color:#ffd700; padding:3px 8px; border-radius:12px;">👑 HEAD ADMIN</span>`;
    } else if (isSumana) {
      badgeHtml = `<span style="font-size:11px; font-weight:800; background:rgba(255,64,129,0.25); color:#ff4081; padding:3px 8px; border-radius:12px;">💖 PROTECTED VIP</span>`;
    }

    let deleteBtnHtml = '';
    if (isSoumya) {
      deleteBtnHtml = `<span style="font-size:11px; color:#ffd700; font-weight:700; background:rgba(255,215,0,0.15); padding:6px 10px; border-radius:6px;">🔒 Head Admin</span>`;
    } else if (isSumana) {
      deleteBtnHtml = `<span style="font-size:11px; color:#ff4081; font-weight:700; background:rgba(255,64,129,0.15); padding:6px 10px; border-radius:6px;">🛡️ Immune</span>`;
    } else {
      deleteBtnHtml = `<button class="btn-primary-3d" style="background:#ff1744; padding:6px 10px; font-size:11px; border-radius:6px;" onclick="deleteUserProfile('${u.username}', '${u.displayName || u.username}')">🗑️ Delete</button>`;
    }

    const avatarHtml = u.customAvatarUrl ? 
      `<img src="${API_ORIGIN}${u.customAvatarUrl}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" />` : 
      `<span style="font-size:28px;">${u.avatar || (isSoumya ? '👑' : (isSumana ? '👩‍🦰' : '👤'))}</span>`;

    return `
      <div class="admin-user-row">
        <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="closeModal('user-manager-modal'); openProfileHub('${u.username}')" title="Click to view @${u.username}'s Profile Hub">
          <div style="width:36px; height:36px; display:flex; align-items:center; justify-content:center;">${avatarHtml}</div>
          <div>
            <div style="font-weight:700; font-size:14px; color:#ffffff; display:flex; align-items:center; gap:8px;">
              <span>${u.displayName || u.username}</span>
              ${badgeHtml}
            </div>
            <div style="font-size:12px; color:var(--accent-cyan); margin-top:2px;">@${u.username} • 📸 <strong>${u.photoCount || 0}</strong> Memories</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn-primary-3d" style="background:rgba(124,77,255,0.3); border:1px solid rgba(124,77,255,0.6); padding:6px 10px; font-size:11px; border-radius:6px;" onclick="closeModal('user-manager-modal'); openProfileHub('${u.username}')">
            👤 Profile Hub
          </button>
          <button class="btn-primary-3d" style="background:var(--accent-gradient); padding:6px 10px; font-size:11px; border-radius:6px;" onclick="viewUserPhotos('${u.username}')">
            🔍 Photos (${u.photoCount || 0})
          </button>
          ${deleteBtnHtml}
        </div>
      </div>
    `;
  }).join('');
}

function filterAdminUserList(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    renderAdminUserList(allAdminUsersCache);
    return;
  }
  const filtered = allAdminUsersCache.filter(u => {
    const name = (u.displayName || '').toLowerCase();
    const user = (u.username || '').toLowerCase();
    return name.includes(q) || user.includes(q);
  });
  renderAdminUserList(filtered);
}

function viewUserPhotos(username) {
  closeModal('user-manager-modal');
  filterByMember(username);
  switchView('dashboard');
  showToast(`Showing photos uploaded by "${username}" 📸`, 'info');
}

async function deleteUserProfile(username, displayName) {
  if (!confirm(`⚠️ Are you sure you want to permanently delete profile "${displayName}" (@${username}) and all photos they uploaded?`)) {
    return;
  }

  try {
    const res = await apiFetch(`/api/auth/users/${encodeURIComponent(username)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || `User "${displayName}" deleted by Head Admin.`, 'success');
      loadUserManagerList();
      loadMembersFilter();
      loadGallery(currentView);
    } else {
      showToast(data.error?.message || 'Failed to delete user.', 'error');
    }
  } catch (e) {
    showToast('Failed to delete user profile.', 'error');
  }
}

// Move Photo to Trash (Recycle Bin) with Smooth Transitions
async function trashPhoto(photoId, e) {
  if (e) e.stopPropagation();

  // Find card in DOM and add smooth fade out
  const cards = document.querySelectorAll('.photo-card');
  const targetCard = Array.from(cards).find(c => {
    const cb = c.querySelector('.photo-checkbox');
    return cb && cb.getAttribute('onclick')?.includes(photoId);
  });
  if (targetCard) targetCard.classList.add('photo-card-fading');

  try {
    const res = await apiFetch(`/api/photos/${photoId}/trash`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      showToast('Photo moved to Trash 🗑️ (You can restore it anytime)', 'info');
      currentPhotos = currentPhotos.filter(p => (p._id !== photoId && p.id !== photoId));
      if (targetCard) targetCard.remove();
      if (currentPhotos.length === 0) {
        renderGallery(currentPhotos);
      }
      loadMembersFilter();
      loadStorageStats();
      if (currentView === 'profile-hub' && activeProfileUsername) {
        loadProfileData(activeProfileUsername);
      }
    } else {
      if (targetCard) targetCard.classList.remove('photo-card-fading');
      showToast(data.error?.message || 'Failed to move to Trash.', 'error');
    }
  } catch (err) {
    if (targetCard) targetCard.classList.remove('photo-card-fading');
    showToast('Error moving photo to Trash.', 'error');
  }
}

// Restore Photo from Trash with Smooth Transitions
async function restorePhoto(photoId, e) {
  if (e) e.stopPropagation();

  const cards = document.querySelectorAll('.photo-card');
  const targetCard = Array.from(cards).find(c => {
    const cb = c.querySelector('.photo-checkbox');
    return cb && cb.getAttribute('onclick')?.includes(photoId);
  });
  if (targetCard) targetCard.classList.add('photo-card-fading');

  try {
    const res = await apiFetch(`/api/photos/${photoId}/restore`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      showToast('Photo restored back to your Cloud Library! ✨', 'success');
      currentPhotos = currentPhotos.filter(p => (p._id !== photoId && p.id !== photoId));
      if (targetCard) targetCard.remove();
      if (currentPhotos.length === 0) {
        renderGallery(currentPhotos);
      }
      loadMembersFilter();
      loadStorageStats();
      if (currentView === 'profile-hub' && activeProfileUsername) {
        loadProfileData(activeProfileUsername);
      }
    } else {
      if (targetCard) targetCard.classList.remove('photo-card-fading');
      showToast(data.error?.message || 'Failed to restore photo.', 'error');
    }
  } catch (err) {
    if (targetCard) targetCard.classList.remove('photo-card-fading');
    showToast('Error restoring photo.', 'error');
  }
}

// Permanently Purge Photo from Vault
async function permanentlyDeletePhoto(photoId, e) {
  if (e) e.stopPropagation();
  if (!confirm('Are you sure you want to permanently delete this photo? This cannot be undone!')) return;

  const cards = document.querySelectorAll('.photo-card');
  const targetCard = Array.from(cards).find(c => {
    const cb = c.querySelector('.photo-checkbox');
    return cb && cb.getAttribute('onclick')?.includes(photoId);
  });
  if (targetCard) targetCard.classList.add('photo-card-fading');

  try {
    const res = await apiFetch(`/api/photos/${photoId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      showToast('Photo permanently deleted from vault.', 'success');
      currentPhotos = currentPhotos.filter(p => (p._id !== photoId && p.id !== photoId));
      if (targetCard) targetCard.remove();
      if (currentPhotos.length === 0) {
        renderGallery(currentPhotos);
      }
      loadMembersFilter();
      loadStorageStats();
      if (currentView === 'profile-hub' && activeProfileUsername) {
        loadProfileData(activeProfileUsername);
      }
    } else {
      if (targetCard) targetCard.classList.remove('photo-card-fading');
      showToast(data.error?.message || 'Failed to delete photo.', 'error');
    }
  } catch (err) {
    if (targetCard) targetCard.classList.remove('photo-card-fading');
    showToast('Error deleting photo permanently.', 'error');
  }
}

// Viewer Modal: Move to Trash
async function trashPhotoFromViewer() {
  const photo = currentPhotos[currentViewerIndex];
  if (!photo) return;
  const photoId = photo._id || photo.id;
  await trashPhoto(photoId);
  closeViewer();
}

// Viewer Modal: Restore Photo
async function restorePhotoFromViewer() {
  const photo = currentPhotos[currentViewerIndex];
  if (!photo) return;
  const photoId = photo._id || photo.id;
  await restorePhoto(photoId);
  closeViewer();
}

// Viewer Modal: Delete Permanently
async function permanentlyDeletePhotoFromViewer() {
  const photo = currentPhotos[currentViewerIndex];
  if (!photo) return;
  const photoId = photo._id || photo.id;
  await permanentlyDeletePhoto(photoId);
  closeViewer();
}

// Legacy alias
async function deletePhotoFromViewer() {
  await trashPhotoFromViewer();
}

// Global Dashboard Initializer (Default to Logged-in User's Isolated Profile)
async function initDashboard() {
  if (currentUser && currentUser.username) {
    currentMemberFilter = currentUser.username;
  }
  updateSearchPlaceholderForView('dashboard');

  // Launch Pradhan Interactive Virtual Guide immediately upon successful login
  if (typeof initPradhanGuide === 'function') {
    initPradhanGuide();
  }

  await Promise.all([
    loadGallery('all'),
    loadStorageStats(),
    loadMembersFilter(),
    loadMusicList(),
    checkNotificationPermissions()
  ]).catch(err => console.warn('[InitDashboard]:', err));
}

// Load Members Filter Pills (100% Isolated by Member - No 'All Memories')
async function loadMembersFilter() {
  const container = document.getElementById('member-chips-container');
  if (!container) return;

  try {
    const res = await apiFetch('/api/photos/members');
    const data = await res.json();

    if (data.success && data.members) {
      let membersList = [...data.members];

      // Ensure currentUser is included in the list even if they have 0 uploads
      if (currentUser && !membersList.some(m => m.username.toLowerCase() === currentUser.username.toLowerCase())) {
        membersList.unshift({
          username: currentUser.username,
          displayName: currentUser.displayName || currentUser.username,
          avatar: currentUser.avatar || '👤',
          count: 0
        });
      }

      if (!currentMemberFilter && currentUser?.username) {
        currentMemberFilter = currentUser.username;
      }

      const memberChips = membersList.map(m => {
        const isSoumya = (m.username.toLowerCase() === 'soumya');
        const isSumana = (m.username.toLowerCase() === 'sumana' || m.username.toLowerCase() === 'sumona');
        const isSelf = (currentUser && currentUser.username.toLowerCase() === m.username.toLowerCase());
        const icon = isSoumya ? '👑' : (isSumana ? '👩‍🦰' : (m.avatar || '👤'));
        const label = isSelf ? `${m.displayName || m.username} (You)` : (m.displayName || m.username);
        const privText = (m.privacy === 'PRIVATE') ? '🔒 Private' : '🌐 Public';

        return `
          <div class="member-account-card" onclick="openProfileHub('${m.username}')" title="Click to view @${m.username}'s Profile Hub">
            <span style="font-size:16px;">${icon}</span>
            <span style="font-weight:700; font-size:12px;">${label}</span>
            <span style="font-size:10px; color:var(--accent-cyan); opacity:0.85; margin-left:4px;">${privText}</span>
            ${!isSelf ? `<button type="button" class="btn-icon" style="width:24px; height:24px; font-size:11px; margin-left:6px; background:rgba(0,245,212,0.15); border:1px solid rgba(0,245,212,0.3); border-radius:50%;" onclick="event.stopPropagation(); openProfileMessenger('${m.username}')" title="Direct Message @${m.username}">💬</button>` : ''}
          </div>
        `;
      }).join('');

      container.innerHTML = memberChips;
    }
  } catch (e) {}
}

// Filter Gallery by Member Profile (Strict Isolation)
function filterByMember(username) {
  if (!username && currentUser?.username) {
    username = currentUser.username;
  }
  currentMemberFilter = username;
  loadMembersFilter();
  loadGallery(currentView);
  if (username) {
    const isSelf = (currentUser && currentUser.username.toLowerCase() === username.toLowerCase());
    showToast(isSelf ? `Viewing your private memory vault 👤` : `Viewing memories uploaded by "${username}" 👤`, 'info');
  }
}

function filterByViewerUploader() {
  const photo = currentPhotos[currentViewerIndex];
  if (photo && photo.uploadedBy?.username) {
    closeViewer();
    filterByMember(photo.uploadedBy.username);
  }
}

let currentProfileData = null;
let activeProfileUsername = '';
let activeProfileTab = 'grid';

// Navigation View Switcher
function switchView(viewName, title = '') {
  currentView = viewName;
  updateSearchPlaceholderForView(viewName);
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));

  const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (activeNav) activeNav.classList.add('active');

  const activeMobileNav = document.querySelector(`.mobile-nav-item[data-mobile-view="${viewName}"]`);
  if (activeMobileNav) activeMobileNav.classList.add('active');

  const heroSection = document.getElementById('hero-section');
  const widgetGrid = document.getElementById('widget-grid');
  const viewTitle = document.getElementById('view-title');
  const sidebar = document.getElementById('main-sidebar');
  const musicSection = document.getElementById('music-section-wrap');
  const photosSection = document.getElementById('photos-section-wrap');
  const profileSection = document.getElementById('profile-hub-section-wrap');
  const onlyForYouSection = document.getElementById('only-for-you-section-wrap');
  const albumsList = document.getElementById('albums-list');
  const galleryGrid = document.getElementById('gallery-grid');

  if (typeof toggleSidebar === 'function') {
    toggleSidebar(false);
  } else {
    if (sidebar) sidebar.classList.remove('open');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.remove('active');
  }

  if (viewName === 'profile-hub') {
    if (heroSection) heroSection.style.display = 'none';
    if (widgetGrid) widgetGrid.style.display = 'none';
    if (musicSection) musicSection.style.display = 'none';
    if (photosSection) photosSection.style.display = 'none';
    if (onlyForYouSection) onlyForYouSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    playNavSound();
    return;
  }

  if (viewName === 'only-for-you') {
    if (currentUser?.username?.toLowerCase() !== 'sumana' && currentUser?.username?.toLowerCase() !== 'sumona') {
      showToast('🔒 Access Restricted: This VIP section is exclusively reserved for Sumana.', 'error');
      switchView('gallery', 'All Photos 🖼️');
      return;
    }
    if (heroSection) heroSection.style.display = 'none';
    if (widgetGrid) widgetGrid.style.display = 'none';
    if (musicSection) musicSection.style.display = 'none';
    if (photosSection) photosSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (onlyForYouSection) onlyForYouSection.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadOnlyForYouSection();
    playOnlyForYouAudio();
    playNavSound();
    return;
  }

  if (profileSection) profileSection.style.display = 'none';
  if (onlyForYouSection) onlyForYouSection.style.display = 'none';

  const albumsSectionWrap = document.getElementById('albums-section-wrap');
  const favoritesSectionWrap = document.getElementById('favorites-section-wrap');
  const videosSectionWrap = document.getElementById('videos-section-wrap');
  const memberFilterBar = document.getElementById('member-filter-bar');

  if (favoritesSectionWrap && viewName !== 'favorites') {
    favoritesSectionWrap.style.display = 'none';
    if (heartParticlesAnimId) {
      cancelAnimationFrame(heartParticlesAnimId);
      heartParticlesAnimId = null;
    }
  }

  if (videosSectionWrap && viewName !== 'videos') {
    videosSectionWrap.style.display = 'none';
  }

  if (viewName === 'dashboard') {
    if (heroSection) heroSection.style.display = 'flex';
    if (widgetGrid) widgetGrid.style.display = 'grid';
    if (musicSection) musicSection.style.display = 'none';
    if (photosSection) photosSection.style.display = 'block';
    if (albumsSectionWrap) albumsSectionWrap.style.display = 'none';
    if (galleryGrid) galleryGrid.style.display = 'grid';
    if (memberFilterBar) memberFilterBar.style.display = 'flex';
    viewTitle.innerText = '📸 Photo Library';
    loadGallery('all');
  } else if (viewName === 'music') {
    if (heroSection) heroSection.style.display = 'none';
    if (widgetGrid) widgetGrid.style.display = 'none';
    if (musicSection) musicSection.style.display = 'block';
    if (photosSection) photosSection.style.display = 'none';
    if (!musicTracks || musicTracks.length === 0) {
      loadMusicList();
    } else {
      renderMusicVault();
    }
  } else if (viewName === 'albums') {
    if (heroSection) heroSection.style.display = 'none';
    if (widgetGrid) widgetGrid.style.display = 'none';
    if (musicSection) musicSection.style.display = 'none';
    if (photosSection) photosSection.style.display = 'block';
    if (albumsSectionWrap) albumsSectionWrap.style.display = 'block';
    if (galleryGrid) galleryGrid.style.display = 'none';
    if (memberFilterBar) memberFilterBar.style.display = 'none';
    viewTitle.innerText = '✨ Interactive 3D Albums';
    loadAlbums();
  } else if (viewName === 'favorites') {
    if (heroSection) heroSection.style.display = 'none';
    if (widgetGrid) widgetGrid.style.display = 'none';
    if (musicSection) musicSection.style.display = 'none';
    if (photosSection) photosSection.style.display = 'block';
    if (albumsSectionWrap) albumsSectionWrap.style.display = 'none';
    if (memberFilterBar) memberFilterBar.style.display = 'none';
    if (favoritesSectionWrap) favoritesSectionWrap.style.display = 'block';
    viewTitle.innerText = '💖 Favorite Memories';

    const heartStage = document.getElementById('favorites-heart-stage');
    const unlockedToolbar = document.getElementById('favorites-unlocked-toolbar');

    if (!favoritesHeartShattered) {
      if (galleryGrid) galleryGrid.style.display = 'none';
      if (unlockedToolbar) unlockedToolbar.style.display = 'none';
      if (heartStage) {
        heartStage.style.display = 'flex';
        initHeartAmbientParticles();
      }
    } else {
      if (heartStage) heartStage.style.display = 'none';
      if (unlockedToolbar) {
        unlockedToolbar.style.display = 'flex';
        window.FavoriteMemoryEffects?.renderToolbar(document.getElementById('favorites-fx-selector-container'));
      }
      if (galleryGrid) galleryGrid.style.display = 'grid';
      loadGallery('favorites');
    }
  } else if (viewName === 'videos') {
    if (heroSection) heroSection.style.display = 'none';
    if (widgetGrid) widgetGrid.style.display = 'none';
    if (musicSection) musicSection.style.display = 'none';
    if (photosSection) photosSection.style.display = 'block';
    if (albumsSectionWrap) albumsSectionWrap.style.display = 'none';
    if (favoritesSectionWrap) favoritesSectionWrap.style.display = 'none';
    if (videosSectionWrap) videosSectionWrap.style.display = 'block';
    if (galleryGrid) galleryGrid.style.display = 'grid';
    if (memberFilterBar) memberFilterBar.style.display = 'flex';
    viewTitle.innerText = '🎬 Video Vault';
    loadGallery('videos');
  } else {
    if (heroSection) heroSection.style.display = 'none';
    if (widgetGrid) widgetGrid.style.display = 'none';
    if (musicSection) musicSection.style.display = 'none';
    if (photosSection) photosSection.style.display = 'block';
    if (albumsSectionWrap) albumsSectionWrap.style.display = 'none';
    if (galleryGrid) galleryGrid.style.display = 'grid';
    if (memberFilterBar) memberFilterBar.style.display = 'flex';
    viewTitle.innerText = title || viewName.charAt(0).toUpperCase() + viewName.slice(1);
    loadGallery(viewName);
  }

  playNavSound();
}

// Load Storage Stats
async function loadStorageStats() {
  try {
    const res = await apiFetch('/api/storage/analytics');
    const data = await res.json();
    if (data.success) {
      const usedGB = (data.usedBytes / (1024 * 1024 * 1024)).toFixed(1);
      const totalTB = (data.totalBytes / (1024 * 1024 * 1024 * 1024)).toFixed(1);

      document.getElementById('storage-text').innerText = `${usedGB} GB Used of ${totalTB} TB Total`;
      document.getElementById('storage-fill').style.width = `${Math.max(2, data.usedPercentage)}%`;

      document.getElementById('widget-photo-count').innerText = data.counts.photos || '0';
      document.getElementById('widget-video-count').innerText = data.counts.videos || '0';
      document.getElementById('widget-storage-used').innerText = `${usedGB} GB`;
      document.getElementById('hero-photo-count').innerText = `${data.counts.totalItems || 0} Memories Stored`;
    }
  } catch (e) {}
}

// Load Gallery Photos with Multi-User Attribution Filter
async function loadGallery(view = 'all') {
  const container = document.getElementById('gallery-grid');
  if (!container) return;

  try {
    const searchVal = document.getElementById('global-search-input')?.value || '';
    const uploaderParam = currentMemberFilter ? `&uploadedBy=${encodeURIComponent(currentMemberFilter)}` : '';
    const res = await apiFetch(`/api/photos?view=${view}&search=${encodeURIComponent(searchVal)}${uploaderParam}`);
    const data = await res.json();

    if (data.success) {
      currentPhotos = data.photos || [];
      renderGallery(currentPhotos);
    }
  } catch (err) {
    container.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1;">Failed to load photos.</p>`;
  }
}

// Render Photo Cards with Clean Uploader Badges & Engagement Stats (No Ugly Filenames)
function renderGallery(photos) {
  renderHeroSpotlight(photos);

  const container = document.getElementById('gallery-grid');
  if (!container) return;
  container.innerHTML = '';

  if (photos.length === 0) {
    if (currentView === 'trash') {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🗑️</div>
          <h3 style="font-size: 20px; font-weight: 600;">Trash is Empty</h3>
          <p style="color: var(--text-secondary); margin-top: 8px;">Deleted photos will be safely stored here. You can restore them anytime!</p>
        </div>
      `;
    } else if (currentView === 'favorites') {
      const countLabel = document.getElementById('favorites-count-label');
      if (countLabel) countLabel.innerText = '0 Loved Memories';

      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: radial-gradient(circle, rgba(255,64,129,0.12), rgba(255,255,255,0.02)); border-radius: 20px; border: 1.5px dashed rgba(255,64,129,0.4);">
          <div style="font-size: 56px; margin-bottom: 16px; animation: floatHeartSparkle 2s infinite ease-in-out;">💖</div>
          <h3 style="font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 8px;">No Favorite Memories Yet</h3>
          <p style="color: #ffb2d1; max-width: 480px; margin: 0 auto 20px auto; line-height: 1.6; font-size: 13.5px;">
            গ্যালারির যেকোনো ছবির ওপর ❤️ <strong>Like / Favorite</strong> বাটনে ক্লিক করলেই সেটি সরাসরি এই হৃদয়ের মাঝে সংরক্ষিত হবে!
          </p>
          <button class="btn-primary-3d" style="background: linear-gradient(135deg, #ff4081, #7c4dff); display: inline-flex; align-items: center; gap: 8px; padding: 11px 24px; border-radius: 14px; font-size: 13px;" onclick="switchView('all', 'Photo Library')">
            <span>🖼️</span> <span>Browse Photos & Add Favorites</span>
          </button>
        </div>
      `;
    } else if (currentView === 'videos') {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: radial-gradient(circle, rgba(124,77,255,0.12), rgba(0,229,255,0.04)); border-radius: 20px; border: 1.5px dashed rgba(124,77,255,0.4);">
          <div style="font-size: 56px; margin-bottom: 16px;">🎬</div>
          <h3 style="font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 8px;">Video Vault is Empty</h3>
          <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 20px auto; line-height: 1.6; font-size: 13.5px;">
            এখানে শুধুমাত্র ভিডিও ফাইল (MP4, WEBM, MOV, MKV — সর্বোচ্চ 30 MB) আপলোড করা যাবে। আপনার ফোনের বা ডিভাইসের প্রিয় ভিডিও ক্লিপগুলো এখানে ক্লাউডে সুরক্ষিত রাখুন!
          </p>
          <button class="btn-primary-3d" style="background: linear-gradient(135deg, #7c4dff, #00e5ff); display: inline-flex; align-items: center; gap: 8px; padding: 11px 24px; border-radius: 14px; font-size: 13px;" onclick="openModal('upload-modal', 'video')">
            <span>📹</span> <span>Upload First Video (Max 30 MB)</span>
          </button>
        </div>
      `;
    } else {
      const isSelf = (currentUser && currentMemberFilter && currentUser.username.toLowerCase() === currentMemberFilter.toLowerCase());
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1);">
          <div style="font-size: 48px; margin-bottom: 16px;">📸</div>
          <h3 style="font-size: 20px; font-weight: 700; color: #fff;">${isSelf ? 'Your memory vault is empty' : `No memories uploaded by @${currentMemberFilter} yet`}</h3>
          <p style="color: var(--text-secondary); margin-top: 8px;">${isSelf ? 'You have not uploaded any photos yet. Upload your photos to start your private cloud collection!' : 'This member has not shared any memories yet.'}</p>
          ${isSelf ? `<button class="btn-upload" style="margin: 20px auto 0 auto;" onclick="openModal('upload-modal')"><span>➕</span> <span>Upload Your First Memory</span></button>` : ''}
        </div>
      `;
    }
    return;
  }

  if (currentView === 'favorites') {
    const countLabel = document.getElementById('favorites-count-label');
    if (countLabel) countLabel.innerText = `${photos.length} Loved Memory Photos Unlocked 💖`;
  }

  const currentIdentifier = currentUser?.username || 'Guest';
  const isTrashView = (currentView === 'trash');

  photos.forEach((photo, index) => {
    const card = document.createElement('div');
    card.className = photo.isVideo ? 'photo-card is-video-card' : 'photo-card';
    if (isTrashView) card.classList.add('is-trash-card');
    if (photo.isVideo) {
      card.style.animationDelay = `${Math.min(index * 0.05, 0.6)}s`;
    }

    const photoId = photo._id || photo.id;
    const mediaSrc = `${API_ORIGIN}/api/photos/file/${photoId}/thumbnail`;
    const isSelected = selectedPhotoIds.has(photoId);

    const isSoumya = (photo.uploadedBy?.username?.toLowerCase() === 'soumya');
    const isSumana = (photo.uploadedBy?.username?.toLowerCase() === 'sumana' || photo.uploadedBy?.username?.toLowerCase() === 'sumona');
    const uploaderAvatar = isSoumya ? '👑' : (isSumana ? '👩‍🦰' : (photo.uploadedBy?.avatar || '👤'));
    const uploaderName = photo.uploadedBy?.displayName || photo.uploadedBy?.username || 'Soumya';
    const uploaderUsername = photo.uploadedBy?.username || 'Soumya';

    const likesCount = typeof photo.likes === 'number' ? photo.likes : (Array.isArray(photo.likedBy) ? photo.likedBy.length : 0);
    const isLikedByUser = Array.isArray(photo.likedBy) && photo.likedBy.some(u => u.toLowerCase() === currentIdentifier.toLowerCase());
    const commentsCount = Array.isArray(photo.comments) ? photo.comments.length : 0;

    card.innerHTML = `
      ${photo.isVideo ? `
        <div class="video-card-thumb-wrapper" style="position:relative; width:100%; height:100%; min-height:180px; display:flex; align-items:center; justify-content:center; background:#050712; border-radius:inherit; overflow:hidden;">
          <video src="${mediaSrc}#t=0.5" muted loop preload="metadata" playsinline style="width:100%; height:100%; object-fit:cover; pointer-events:none;" onmouseenter="this.play().catch(()=>{})" onmouseleave="this.pause()"></video>
          <div class="video-card-light-sweep"></div>
          <div class="video-play-wave-ring"></div>
          <div class="video-play-wave-ring w2"></div>
          <div class="video-play-badge">▶</div>
          <div class="video-hd-badge">
            <span class="video-live-dot"></span>
            <span>4K CINEMA</span>
          </div>
        </div>
      ` : `<img src="${mediaSrc}" alt="Cloud Memory" loading="lazy" />`}
      <div class="photo-card-overlay">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <input type="checkbox" class="photo-checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleSelectPhoto('${photoId}')" />
          ${isTrashView ? `
            <div style="display:flex; gap:6px; z-index:10;">
              <button class="btn-icon" style="width:34px; height:34px; font-size:14px; background:rgba(0,230,118,0.35); border:1px solid rgba(0,230,118,0.8); color:#00e676; box-shadow:0 2px 8px rgba(0,230,118,0.4);" onclick="event.stopPropagation(); restorePhoto('${photoId}', event)" title="Restore to Gallery">🔄</button>
              <button class="btn-icon" style="width:34px; height:34px; font-size:14px; background:rgba(255,23,68,0.35); border:1px solid rgba(255,23,68,0.8); color:#ff1744; box-shadow:0 2px 8px rgba(255,23,68,0.4);" onclick="event.stopPropagation(); permanentlyDeletePhoto('${photoId}', event)" title="Permanently Delete">💥</button>
            </div>
          ` : `
            <button class="fav-btn ${photo.favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${photoId}', this)" title="Favorite">
              ${photo.favorite ? '❤️' : '🤍'}
            </button>
          `}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:6px;">
          <!-- Uploader Profile Badge (Click opens Personal Profile Hub) -->
          <div class="photo-uploader-badge" title="View @${uploaderUsername}'s Profile Hub"
            onclick="event.stopPropagation(); openProfileHub('${uploaderUsername}')">
            <span>${uploaderAvatar}</span> <span>${uploaderName}</span>
          </div>

          ${isTrashView ? `
            <span style="font-size:11px; font-weight:700; color:#ff9100; background:rgba(255,145,0,0.25); padding:2px 8px; border-radius:10px; border:1px solid rgba(255,145,0,0.5);">🗑️ In Trash</span>
          ` : `
            <!-- Likes & Comments Counters -->
            <div class="card-stats-row">
              <span class="card-stat-chip ${isLikedByUser ? 'liked' : ''}" title="Likes: ${likesCount}" onclick="event.stopPropagation(); quickToggleCardLike('${photoId}', this)">
                <span>❤️</span> <span>${likesCount}</span>
              </span>
              <span class="card-stat-chip" title="Comments: ${commentsCount}">
                <span>💬</span> <span>${commentsCount}</span>
              </span>
            </div>
          `}
        </div>
      </div>
    `;

    card.onclick = () => openViewer(index);
    container.appendChild(card);
  });
}

// Single Photo Viewer Modal
function openViewer(indexOrId) {
  let photo = null;
  if (typeof indexOrId === 'number') {
    currentViewerIndex = indexOrId;
    photo = currentPhotos[indexOrId];
  } else if (typeof indexOrId === 'string') {
    const idx = currentPhotos.findIndex(p => p._id === indexOrId || p.id === indexOrId);
    if (idx !== -1) {
      currentViewerIndex = idx;
      photo = currentPhotos[idx];
    } else {
      photo = (activeStageAlbum?.photos || []).find(p => p._id === indexOrId || p.id === indexOrId);
      currentViewerIndex = 0;
    }
  }

  if (!photo) return;

  const modal = document.getElementById('viewer-modal');
  const imgEl = document.getElementById('viewer-img');
  const videoEl = document.getElementById('viewer-video');
  const dateEl = document.getElementById('viewer-date');
  const cameraEl = document.getElementById('viewer-camera');
  const resEl = document.getElementById('viewer-resolution');
  const sizeEl = document.getElementById('viewer-size');
  const hashEl = document.getElementById('viewer-hash');

  const uploaderAvatarEl = document.getElementById('viewer-uploader-avatar');
  const uploaderNameEl = document.getElementById('viewer-uploader-name');
  const uploaderUserEl = document.getElementById('viewer-uploader-username');

  const photoId = photo._id || photo.id;
  const fullMediaSrc = `${API_ORIGIN}/api/photos/file/${photoId}/original`;

  if (photo.isVideo) {
    if (imgEl) {
      imgEl.style.display = 'none';
      imgEl.src = '';
    }
    if (videoEl) {
      videoEl.style.display = 'block';
      videoEl.classList.remove('videos-playback-active');
      void videoEl.offsetWidth; // trigger reflow
      videoEl.classList.add('videos-playback-active');

      const viewerMain = document.querySelector('.viewer-main');
      if (viewerMain) {
        const oldFlare = viewerMain.querySelector('.videos-cinema-lens-flare');
        if (oldFlare) oldFlare.remove();
        const flare = document.createElement('div');
        flare.className = 'videos-cinema-lens-flare';
        viewerMain.appendChild(flare);
        setTimeout(() => flare.remove(), 750);
      }

      videoEl.src = fullMediaSrc;
      videoEl.load();
      videoEl.play().catch(() => {});
    }
  } else {
    if (videoEl) {
      videoEl.pause();
      videoEl.classList.remove('videos-playback-active');
      videoEl.style.display = 'none';
      videoEl.src = '';
    }
    if (imgEl) {
      imgEl.style.display = 'block';
      imgEl.onerror = null;
      imgEl.src = `${API_ORIGIN}/api/photos/file/${photoId}/medium`;
    }
  }
  
  if (dateEl) {
    const d = new Date(photo.createdAt || Date.now());
    dateEl.innerText = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const isSoumya = (photo.uploadedBy?.username?.toLowerCase() === 'soumya');
  const isSumana = (photo.uploadedBy?.username?.toLowerCase() === 'sumana' || photo.uploadedBy?.username?.toLowerCase() === 'sumona');

  if (uploaderAvatarEl) uploaderAvatarEl.innerText = isSoumya ? '👑' : (isSumana ? '👩‍🦰' : (photo.uploadedBy?.avatar || '👤'));
  if (uploaderNameEl) uploaderNameEl.innerText = photo.uploadedBy?.displayName || photo.uploadedBy?.username || 'Soumya';
  if (uploaderUserEl) uploaderUserEl.innerText = `@${photo.uploadedBy?.username || 'Soumya'}`;

  const uploaderCard = document.querySelector('.viewer-uploader-card') || uploaderAvatarEl?.parentElement;
  if (uploaderCard) {
    uploaderCard.style.cursor = 'pointer';
    uploaderCard.title = 'View profile hub';
    uploaderCard.onclick = () => {
      closeViewer();
      openProfileHub(photo.uploadedBy?.username || 'Soumya');
    };
  }

  if (cameraEl) cameraEl.innerText = photo.exif?.camera || 'Digital Camera';
  if (resEl) resEl.innerText = `${photo.width || 1920} x ${photo.height || 1080} px`;
  if (sizeEl) sizeEl.innerText = `${(photo.size / (1024 * 1024)).toFixed(2)} MB`;
  if (hashEl) hashEl.innerText = photo.hash ? photo.hash.substring(0, 16) + '...' : 'SHA-256 Validated';

  // Update Likes in Viewer
  updateViewerLikeUI(photo);

  // Load and render comments
  loadViewerComments(photoId);

  // Handle Trash View vs Normal View Buttons
  const isTrashPhoto = (currentView === 'trash' || photo.trash === true);
  const trashBtn = document.getElementById('viewer-trash-btn');
  const trashRow = document.getElementById('viewer-trash-actions-row');
  const isHeadAdmin = (currentUser?.username?.toLowerCase() === 'soumya' || currentUser?.role === 'HEAD_ADMIN');
  const isOwner = (photo.uploadedBy?.username?.toLowerCase() === currentUser?.username?.toLowerCase());
  const canManage = isHeadAdmin || isOwner;

  if (trashBtn) {
    trashBtn.style.display = (!isTrashPhoto && canManage) ? 'block' : 'none';
  }
  if (trashRow) {
    trashRow.style.display = (isTrashPhoto && canManage) ? 'flex' : 'none';
  }
  modal.classList.add('active');

  // Trigger Favorite Memory Animation Effect if viewing a favorite
  if (currentView === 'favorites' || photo.favorite) {
    const viewerMain = document.querySelector('.viewer-main');
    if (viewerMain) {
      setTimeout(() => {
        window.FavoriteMemoryEffects?.trigger(null, viewerMain, 'open');
      }, 60);
    }
  }
}

// Update Viewer Like State
function updateViewerLikeUI(photo) {
  const likeBtn = document.getElementById('viewer-like-btn');
  const likeIcon = document.getElementById('viewer-like-icon');
  const likeText = document.getElementById('viewer-like-text');
  const likeCount = document.getElementById('viewer-like-count');
  const likeStatus = document.getElementById('viewer-like-status');

  const currentIdentifier = currentUser?.username || 'Guest';
  const isLiked = Array.isArray(photo.likedBy) && photo.likedBy.some(u => u.toLowerCase() === currentIdentifier.toLowerCase());
  const count = typeof photo.likes === 'number' ? photo.likes : (Array.isArray(photo.likedBy) ? photo.likedBy.length : 0);

  if (likeBtn) {
    if (isLiked) {
      likeBtn.classList.add('liked');
      if (likeIcon) likeIcon.innerText = '❤️';
      if (likeText) likeText.innerText = 'Liked';
    } else {
      likeBtn.classList.remove('liked');
      if (likeIcon) likeIcon.innerText = '🤍';
      if (likeText) likeText.innerText = 'Like';
    }
  }

  if (likeCount) likeCount.innerText = count;
  if (likeStatus) likeStatus.innerText = count === 0 ? 'Be the first to like! ❤️' : `${count} person(s) loved this memory 💖`;
}

// Toggle Like in Photo Viewer Modal
async function toggleViewerLike() {
  const photo = currentPhotos[currentViewerIndex];
  if (!photo) return;
  const photoId = photo._id || photo.id;

  try {
    const res = await apiFetch(`/api/photos/${photoId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser?.username || 'Guest' })
    });
    const data = await res.json();
    if (data.success) {
      photo.likes = data.likes;
      photo.likedBy = data.likedBy;
      updateViewerLikeUI(photo);
      playLikeSound();
      showToast(data.isLiked ? 'You liked this memory! ❤️' : 'Removed like', 'info');
      if (data.isLiked) {
        const viewerMain = document.querySelector('.viewer-main');
        window.FavoriteMemoryEffects?.trigger('wave', viewerMain, 'like');
      }
      // Refresh gallery background item
      loadGallery(currentView);
    }
  } catch (e) {
    showToast('Failed to toggle like.', 'error');
  }
}

// Quick Toggle Like on Gallery Card
async function quickToggleCardLike(photoId, el) {
  try {
    const res = await apiFetch(`/api/photos/${photoId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser?.username || 'Guest' })
    });
    const data = await res.json();
    if (data.success) {
      const photo = currentPhotos.find(p => (p._id === photoId || p.id === photoId));
      if (photo) {
        photo.likes = data.likes;
        photo.likedBy = data.likedBy;
        photo.favorite = data.isLiked;
      }
      if (el) {
        if (data.isLiked) el.classList.add('liked');
        else el.classList.remove('liked');
        const countSpan = el.querySelector('span:nth-child(2)');
        if (countSpan) countSpan.innerText = data.likes;
      }
      const card = el?.closest('.photo-card');
      if (card) {
        const favBtn = card.querySelector('.fav-btn');
        if (favBtn) favBtn.innerHTML = data.isLiked ? '❤️' : '🤍';
        if (data.isLiked) {
          window.FavoriteMemoryEffects?.trigger('pulse', card, 'heart');
        }
      }
      playLikeSound();
      showToast(data.isLiked ? 'Liked & Added to Favorites! ❤️' : 'Removed from Favorites', 'info');
      if (currentView === 'favorites') {
        loadGallery('favorites');
      }
    }
  } catch (e) {}
}

// Comments Feed Loader
async function loadViewerComments(photoId) {
  const listEl = document.getElementById('viewer-comments-list');
  const countEl = document.getElementById('viewer-comments-count');
  if (!listEl) return;

  try {
    const res = await apiFetch(`/api/photos/${photoId}/comments`);
    const data = await res.json();
    if (data.success && Array.isArray(data.comments)) {
      renderViewerComments(data.comments, photoId);
      if (countEl) countEl.innerText = data.comments.length;
      const photo = currentPhotos.find(p => (p._id === photoId || p.id === photoId));
      if (photo) photo.comments = data.comments;
    }
  } catch (e) {}
}

function renderViewerComments(comments, photoId) {
  const listEl = document.getElementById('viewer-comments-list');
  if (!listEl) return;

  if (!comments || comments.length === 0) {
    listEl.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:12px;">No comments yet. Be the first to say something sweet! 💖</div>`;
    return;
  }

  const isHeadAdmin = (currentUser?.username?.toLowerCase() === 'soumya' || currentUser?.role === 'HEAD_ADMIN');

  listEl.innerHTML = comments.map(c => {
    const isOwner = (currentUser?.username && c.username && currentUser.username.toLowerCase() === c.username.toLowerCase());
    const canDelete = isHeadAdmin || isOwner;
    const timeStr = c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';

    return `
      <div class="comment-bubble">
        <span class="comment-avatar" style="cursor:pointer;" title="View Profile" onclick="closeViewer(); openProfileHub('${c.username || 'Soumya'}')">${c.avatar || '💖'}</span>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-author-name" style="cursor:pointer;" title="View Profile" onclick="closeViewer(); openProfileHub('${c.username || 'Soumya'}')">${c.authorName || 'Guest'}</span>
            <div style="display:flex; align-items:center; gap:4px;">
              <span class="comment-time">${timeStr}</span>
              ${canDelete ? `<button class="comment-del-btn" onclick="deleteViewerComment('${photoId}', '${c.id}')" title="Delete comment">✖</button>` : ''}
            </div>
          </div>
          <div class="comment-message-text">${escapeHtml(c.text)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Scroll to bottom
  listEl.scrollTop = listEl.scrollHeight;
}

// Submit Comment Handler
async function handleCommentSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('viewer-comment-input');
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  const photo = currentPhotos[currentViewerIndex];
  if (!photo) return;
  const photoId = photo._id || photo.id;

  const authorName = currentUser?.displayName || currentUser?.username || 'Guest';
  const avatar = currentUser?.username?.toLowerCase() === 'soumya' ? '👑' : ((currentUser?.username?.toLowerCase() === 'sumana' || currentUser?.username?.toLowerCase() === 'sumona') ? '👩‍🦰' : (currentUser?.avatar || '💖'));

  input.value = '';

  try {
    const res = await apiFetch(`/api/photos/${photoId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        authorName,
        avatar
      })
    });
    const data = await res.json();
    if (data.success && data.comments) {
      renderViewerComments(data.comments, photoId);
      const countEl = document.getElementById('viewer-comments-count');
      if (countEl) countEl.innerText = data.comments.length;
      photo.comments = data.comments;
      showToast('Comment posted! 💬', 'success');
      loadGallery(currentView);
    }
  } catch (err) {
    showToast('Failed to post comment.', 'error');
  }
}

// Quick Emoji Insert / Send
function quickCommentEmoji(emoji) {
  const input = document.getElementById('viewer-comment-input');
  if (input) {
    input.value += (input.value ? ' ' : '') + emoji;
    input.focus();
  }
}

// Delete Comment
async function deleteViewerComment(photoId, commentId) {
  try {
    const res = await apiFetch(`/api/photos/${photoId}/comments/${commentId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success && data.comments) {
      renderViewerComments(data.comments, photoId);
      const countEl = document.getElementById('viewer-comments-count');
      if (countEl) countEl.innerText = data.comments.length;
      const photo = currentPhotos.find(p => (p._id === photoId || p.id === photoId));
      if (photo) photo.comments = data.comments;
      showToast('Comment deleted.', 'info');
      loadGallery(currentView);
    }
  } catch (e) {
    showToast('Failed to delete comment.', 'error');
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================================
// DEDICATED PERSONAL PROFILE HUB & SOCIAL TIMELINE CONTROLLER
// ==========================================================================
async function openProfileHub(username) {
  if (typeof toggleSidebar === 'function') toggleSidebar(false);
  if (!username) username = currentUser?.username || 'Soumya';
  activeProfileUsername = username;

  try {
    const res = await apiFetch(`/api/users/profile/${encodeURIComponent(username)}`);
    const data = await res.json();
    if (!data.success || !data.user) {
      showToast(`User @${username} profile not found.`, 'warning');
      return;
    }

    currentProfileData = data;
    renderProfileHub(data);
    switchView('profile-hub');
    showToast(`Welcome to @${data.user.username}'s Personal Profile Hub! 🌟`, 'info');
  } catch (err) {
    showToast('Failed to load user profile.', 'error');
  }
}

let selectedProfilePrivacy = 'PUBLIC';

function selectPrivacyOption(privacy) {
  selectedProfilePrivacy = (privacy === 'PRIVATE') ? 'PRIVATE' : 'PUBLIC';
  const pubCard = document.getElementById('pop-public');
  const privCard = document.getElementById('pop-private');
  const radPub = document.getElementById('rad-privacy-public');
  const radPriv = document.getElementById('rad-privacy-private');

  if (selectedProfilePrivacy === 'PRIVATE') {
    if (pubCard) {
      pubCard.style.borderColor = 'var(--glass-border)';
      pubCard.style.background = 'rgba(255,255,255,0.03)';
    }
    if (privCard) {
      privCard.style.borderColor = '#ff9100';
      privCard.style.background = 'rgba(255,145,0,0.12)';
    }
    if (radPriv) radPriv.checked = true;
  } else {
    if (pubCard) {
      pubCard.style.borderColor = 'var(--accent-cyan)';
      pubCard.style.background = 'rgba(0,229,255,0.08)';
    }
    if (privCard) {
      privCard.style.borderColor = 'var(--glass-border)';
      privCard.style.background = 'rgba(255,255,255,0.03)';
    }
    if (radPub) radPub.checked = true;
  }
}

function openEditProfileModal() {
  if (!currentProfileData || !currentProfileData.user) return;
  const u = currentProfileData.user;

  const nameInput = document.getElementById('edit-displayname');
  const bioInput = document.getElementById('edit-bio');
  const preview = document.getElementById('edit-avatar-preview');

  if (nameInput) nameInput.value = u.displayName || u.username || '';
  if (bioInput) bioInput.value = u.bio || '';
  if (preview) {
    if (u.customAvatarUrl) {
      preview.innerHTML = `<img src="${API_ORIGIN}${u.customAvatarUrl}" style="width:100%; height:100%; object-fit:cover;" alt="Avatar" />`;
    } else {
      preview.innerHTML = u.avatar || '👤';
    }
  }

  selectPrivacyOption(u.privacy || 'PUBLIC');
  openModal('edit-profile-modal');
}

async function handleProfileEditSubmit(e) {
  if (e) e.preventDefault();
  if (!activeProfileUsername) return;

  const displayName = document.getElementById('edit-displayname')?.value?.trim();
  const bio = document.getElementById('edit-bio')?.value?.trim();
  const privacy = selectedProfilePrivacy || 'PUBLIC';

  try {
    const res = await apiFetch(`/api/users/profile/${encodeURIComponent(activeProfileUsername)}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName,
        bio,
        privacy
      })
    });

    const data = await res.json();
    if (data.success) {
      closeModal('edit-profile-modal');
      showToast(privacy === 'PRIVATE' ? 'Profile saved as Private (Only you & Soumya have access) 🔒' : 'Profile updated as Public 🌐', 'success');

      if (currentUser && currentUser.username.toLowerCase() === activeProfileUsername.toLowerCase()) {
        currentUser.displayName = displayName;
        currentUser.privacy = privacy;
        updateUserProfileUI();
      }

      openProfileHub(activeProfileUsername);
      loadMembersFilter();
    } else {
      showToast(data.error?.message || 'Failed to update profile.', 'error');
    }
  } catch (err) {
    showToast('Failed to save profile changes.', 'error');
  }
}

async function quickTogglePrivacy(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  if (!currentProfileData || !currentProfileData.user) return;
  const u = currentProfileData.user;
  const newPrivacy = (u.privacy === 'PRIVATE') ? 'PUBLIC' : 'PRIVATE';

  try {
    const res = await apiFetch(`/api/users/profile/${encodeURIComponent(activeProfileUsername)}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: u.displayName || u.username,
        bio: u.bio,
        privacy: newPrivacy
      })
    });

    const data = await res.json();
    if (data.success) {
      u.privacy = newPrivacy;
      if (currentUser && currentUser.username.toLowerCase() === activeProfileUsername.toLowerCase()) {
        currentUser.privacy = newPrivacy;
      }
      playSuccessSound();
      showToast(newPrivacy === 'PRIVATE' ? 'Account Permission: PRIVATE 🔒 (Only you & Soumya can view)' : 'Account Permission: PUBLIC 🌐 (Anyone can view & search)', 'success');
      renderProfileHub(currentProfileData);
      loadMembersFilter();
    } else {
      showToast(data.error?.message || 'Failed to update privacy.', 'error');
    }
  } catch (e) {
    showToast('Failed to toggle privacy.', 'error');
  }
}

function renderProfileHub(data) {
  const u = data.user;
  const s = data.stats || {};

  // Basic Details
  const nameEl = document.getElementById('ph-display-name');
  const userEl = document.getElementById('ph-username');
  const roleEl = document.getElementById('ph-role-badge');
  const privacyBadge = document.getElementById('ph-privacy-badge');
  const privacyToggleBtn = document.getElementById('ph-privacy-toggle-btn');
  const dateEl = document.getElementById('ph-joined-date');
  const bioEl = document.getElementById('ph-bio');
  const avatarEl = document.getElementById('ph-avatar');
  const avatarBtn = document.getElementById('ph-avatar-upload-btn');
  const followBtn = document.getElementById('ph-follow-btn');
  const editBtn = document.getElementById('ph-edit-btn');

  if (nameEl) nameEl.innerText = u.displayName || u.username;
  if (userEl) userEl.innerText = `@${u.username}`;
  if (roleEl) {
    roleEl.innerText = u.role || 'MEMBER';
    if (u.role === 'HEAD_ADMIN') roleEl.className = 'genre-tag enjoyful';
    else if (u.role === 'PROTECTED_VIP') roleEl.className = 'genre-tag romantic';
    else roleEl.className = 'genre-tag sad';
  }

  // Privacy Badge
  const isPrivate = (u.privacy === 'PRIVATE');
  if (privacyBadge) {
    if (isPrivate) {
      privacyBadge.className = 'genre-tag sad';
      privacyBadge.style.background = 'rgba(255,145,0,0.2)';
      privacyBadge.style.borderColor = 'rgba(255,145,0,0.6)';
      privacyBadge.style.color = '#ff9100';
      privacyBadge.innerText = '🔒 Private (Soumya Only)';
    } else {
      privacyBadge.className = 'genre-tag enjoyful';
      privacyBadge.style.background = '';
      privacyBadge.style.borderColor = '';
      privacyBadge.style.color = '';
      privacyBadge.innerText = '🌐 Public';
    }
  }

  if (dateEl) {
    const d = new Date(u.createdAt || Date.now());
    dateEl.innerText = `Joined ${d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
  }
  if (bioEl) bioEl.innerText = u.bio || 'Living life, capturing every single memory. ✨';

  // Render Avatar (Custom Image or Emoji)
  if (avatarEl) {
    if (u.customAvatarUrl) {
      avatarEl.innerHTML = `<img src="${API_ORIGIN}${u.customAvatarUrl}" alt="${u.displayName}" />`;
    } else {
      avatarEl.innerHTML = u.avatar || '👤';
    }
  }

  // Phone Number (Visible only to Soumya Head Admin and Profile Owner)
  const phoneRow = document.getElementById('ph-phone-row');
  const phoneVal = document.getElementById('ph-phone-val');
  if (phoneRow && phoneVal) {
    if (u.phoneNumber) {
      phoneRow.style.display = 'flex';
      phoneVal.innerText = `+91 ${u.phoneNumber}`;
    } else {
      phoneRow.style.display = 'none';
    }
  }

  // Birthday & Birthday Badge
  const bdayRow = document.getElementById('ph-birthday-row');
  const bdayVal = document.getElementById('ph-birthday-val');
  const bdayTag = document.getElementById('ph-birthday-tag');
  if (bdayRow && bdayVal) {
    if (u.birthday) {
      bdayRow.style.display = 'flex';
      bdayVal.innerText = u.birthday;
    } else {
      bdayRow.style.display = 'none';
    }
  }
  if (bdayTag) {
    bdayTag.style.display = u.hasBirthdayToday ? 'inline-block' : 'none';
  }

  // Permissions (Owner or Head Admin can change avatar and edit profile)
  const isOwner = currentUser && (currentUser.username.toLowerCase() === u.username.toLowerCase());
  const isHeadAdmin = currentUser && (currentUser.username.toLowerCase() === 'soumya' || currentUser.role === 'HEAD_ADMIN');
  const canEdit = isOwner || isHeadAdmin;

  if (avatarBtn) avatarBtn.style.display = canEdit ? 'flex' : 'none';
  if (editBtn) editBtn.style.display = canEdit ? 'inline-flex' : 'none';
  const changePhoneBtn = document.getElementById('ph-change-phone-btn');
  if (changePhoneBtn) changePhoneBtn.style.display = canEdit ? 'inline-flex' : 'none';

  const messageBtn = document.getElementById('ph-message-btn');
  if (messageBtn) {
    messageBtn.style.display = isOwner ? 'none' : 'inline-flex';
  }

  const logoutBtn = document.getElementById('ph-logout-btn');
  if (logoutBtn) {
    logoutBtn.style.display = isOwner ? 'inline-flex' : 'none';
  }

  if (privacyToggleBtn) {
    privacyToggleBtn.style.display = canEdit ? 'inline-flex' : 'none';
    privacyToggleBtn.innerHTML = isPrivate ? '🛡️ Permission: <span style="color:#ff9100; margin-left:4px; font-weight:700;">🔒 Private</span>' : '🛡️ Permission: <span style="color:var(--accent-cyan); margin-left:4px; font-weight:700;">🌐 Public</span>';
  }

  // Follow Button State
  if (followBtn) {
    if (isOwner) {
      followBtn.style.display = 'none';
    } else {
      followBtn.style.display = 'inline-flex';
      updateFollowButtonUI(u.isFollowing);
    }
  }

  // Handle Birthday Celebration on Owner Login / Open
  if (isOwner && u.hasBirthdayToday) {
    checkBirthdayCelebration(u);
  }

  // Handle Locked Profile View (When visitor does not have permission)
  const lockScreen = document.getElementById('ph-lock-screen');
  const lockedUsername = document.getElementById('ph-locked-username');
  const lockReqBtn = document.getElementById('ph-lock-request-btn');
  const metricsBar = document.getElementById('ph-metrics-bar');
  const navTabs = document.getElementById('ph-nav-tabs');
  const gridTab = document.getElementById('ptab-content-grid');
  const timelineTab = document.getElementById('ptab-content-timeline');
  const followersTab = document.getElementById('ptab-content-followers');
  const followingTab = document.getElementById('ptab-content-following');

  if (data.locked === true) {
    if (lockScreen) lockScreen.style.display = 'block';
    if (lockedUsername) lockedUsername.innerText = `@${u.username}`;
    if (lockReqBtn) {
      if (data.requestStatus === 'PENDING') {
        lockReqBtn.innerHTML = '<span>⏳</span> <span>Request Pending Approval</span>';
        lockReqBtn.disabled = true;
        lockReqBtn.style.opacity = '0.7';
      } else {
        lockReqBtn.innerHTML = '<span>➕</span> <span>Send Follow & Message Request</span>';
        lockReqBtn.disabled = false;
        lockReqBtn.style.opacity = '1';
      }
    }
    if (metricsBar) metricsBar.style.display = 'none';
    if (navTabs) navTabs.style.display = 'none';
    if (gridTab) gridTab.style.display = 'none';
    if (timelineTab) timelineTab.style.display = 'none';
    if (followersTab) followersTab.style.display = 'none';
    if (followingTab) followingTab.style.display = 'none';
    return;
  } else {
    if (lockScreen) lockScreen.style.display = 'none';
    if (metricsBar) metricsBar.style.display = 'flex';
    if (navTabs) navTabs.style.display = 'flex';
  }

  // Metrics
  document.getElementById('ph-stat-uploads').innerText = s.totalUploads || '0';
  document.getElementById('ph-stat-likes').innerText = s.totalLikes || '0';
  document.getElementById('ph-stat-followers').innerText = u.followersCount || '0';
  document.getElementById('ph-stat-following').innerText = u.followingCount || '0';

  document.getElementById('ph-tab-grid-count').innerText = s.totalUploads || '0';
  document.getElementById('ph-tab-followers-count').innerText = u.followersCount || '0';
  document.getElementById('ph-tab-following-count').innerText = u.followingCount || '0';

  // Default to grid tab
  switchProfileTab(activeProfileTab || 'grid');
}

function updateFollowButtonUI(isFollowing) {
  const followBtn = document.getElementById('ph-follow-btn');
  const icon = document.getElementById('ph-follow-icon');
  const text = document.getElementById('ph-follow-text');
  if (!followBtn) return;

  if (isFollowing) {
    followBtn.classList.add('following');
    if (icon) icon.innerText = '✔️';
    if (text) text.innerText = 'Following';
  } else {
    followBtn.classList.remove('following');
    if (icon) icon.innerText = '➕';
    if (text) text.innerText = 'Follow';
  }
}

async function toggleProfileFollow() {
  if (!currentUser) {
    showToast('Please log in to follow profiles.', 'warning');
    return;
  }

  try {
    const res = await apiFetch(`/api/users/profile/${encodeURIComponent(activeProfileUsername)}/follow`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      updateFollowButtonUI(data.isFollowing);
      document.getElementById('ph-stat-followers').innerText = data.followerCount;
      document.getElementById('ph-tab-followers-count').innerText = data.followerCount;
      if (data.isFollowing) playLikeSound();
      showToast(data.isFollowing ? `Now following @${activeProfileUsername}! 💖` : `Unfollowed @${activeProfileUsername}.`, 'info');
    } else {
      showToast(data.error?.message || 'Failed to update follow status.', 'error');
    }
  } catch (err) {
    showToast('Error updating follow status.', 'error');
  }
}

// Profile Tab Switcher
function switchProfileTab(tabName) {
  activeProfileTab = tabName;
  playNavSound();
  ['grid', 'timeline', 'followers', 'following'].forEach(t => {
    const btn = document.getElementById(`ptab-btn-${t}`);
    const content = document.getElementById(`ptab-content-${t}`);
    if (btn) {
      if (t === tabName) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    if (content) {
      if (t === tabName) content.style.display = 'block';
      else content.style.display = 'none';
    }
  });

  if (tabName === 'grid') {
    renderProfileUploadsGrid(currentProfileData?.photos || []);
  } else if (tabName === 'timeline') {
    renderProfileTimeline(currentProfileData?.photos || []);
  } else if (tabName === 'followers') {
    loadProfileFollowers();
  } else if (tabName === 'following') {
    loadProfileFollowing();
  }
}

function renderProfileUploadsGrid(photos) {
  const container = document.getElementById('profile-gallery-grid');
  if (!container) return;

  if (!photos || photos.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 12px;">📷</div>
        <h4>No uploaded memories yet</h4>
        <p style="font-size: 13px; margin-top: 6px;">Photos uploaded by @${activeProfileUsername} will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  photos.forEach((photo, index) => {
    const card = document.createElement('div');
    card.className = 'photo-card';

    const photoId = photo._id || photo.id;
    const mediaSrc = `${API_ORIGIN}/api/photos/file/${photoId}/thumbnail`;
    const likesCount = typeof photo.likes === 'number' ? photo.likes : 0;
    const commentsCount = Array.isArray(photo.comments) ? photo.comments.length : 0;

    card.innerHTML = `
      ${photo.isVideo ? `<video src="${mediaSrc}" muted loop preload="metadata"></video>` : `<img src="${mediaSrc}" alt="Memory" loading="lazy" />`}
      <div class="photo-card-overlay">
        <div style="display:flex; justify-content:flex-end; width:100%;">
          <button class="fav-btn ${photo.favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${photoId}', this)">
            ${photo.favorite ? '❤️' : '🤍'}
          </button>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <span style="font-size:11px; color:#fff; font-weight:700;">${new Date(photo.createdAt || Date.now()).toLocaleDateString()}</span>
          <div class="card-stats-row">
            <span class="card-stat-chip"><span>❤️</span> <span>${likesCount}</span></span>
            <span class="card-stat-chip"><span>💬</span> <span>${commentsCount}</span></span>
          </div>
        </div>
      </div>
    `;

    card.onclick = () => {
      currentPhotos = photos;
      openViewer(index);
    };
    container.appendChild(card);
  });
}

function renderProfileTimeline(photos) {
  const container = document.getElementById('profile-timeline-stream');
  if (!container) return;

  if (!photos || photos.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 12px;">📅</div>
        <h4>No timeline memories yet</h4>
      </div>
    `;
    return;
  }

  // Sort photos descending by createdAt
  const sorted = [...photos].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  container.innerHTML = sorted.map((p, idx) => {
    const photoId = p._id || p.id;
    const fullMediaSrc = `${API_ORIGIN}/api/photos/file/${photoId}/medium`;
    const dateStr = new Date(p.createdAt || Date.now()).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = new Date(p.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="timeline-card">
        <div class="timeline-node-icon">✨</div>
        <div class="timeline-header">
          <div>
            <span class="timeline-date-chip">📅 ${dateStr}</span>
            <span style="font-size:11px; color:var(--text-muted); margin-left:8px;">${timeStr}</span>
          </div>
          <div class="card-stats-row">
            <span class="card-stat-chip" title="Likes">❤️ ${p.likes || 0}</span>
            <span class="card-stat-chip" title="Comments">💬 ${p.comments?.length || 0}</span>
          </div>
        </div>

        <div class="timeline-media-box" onclick="currentPhotos=currentProfileData.photos; openViewer(${idx})">
          ${p.isVideo ? `<video src="${fullMediaSrc}" controls preload="metadata"></video>` : `<img src="${fullMediaSrc}" alt="Memory" loading="lazy" />`}
        </div>
      </div>
    `;
  }).join('');
}

async function loadProfileFollowers() {
  const container = document.getElementById('profile-followers-list');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">Loading followers...</div>`;

  try {
    const res = await apiFetch(`/api/users/profile/${encodeURIComponent(activeProfileUsername)}/followers`);
    const data = await res.json();
    if (data.success && Array.isArray(data.followers)) {
      renderProfileSocialList(data.followers, 'profile-followers-list', 'Followers');
    }
  } catch (e) {}
}

async function loadProfileFollowing() {
  const container = document.getElementById('profile-following-list');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">Loading following...</div>`;

  try {
    const res = await apiFetch(`/api/users/profile/${encodeURIComponent(activeProfileUsername)}/following`);
    const data = await res.json();
    if (data.success && Array.isArray(data.following)) {
      renderProfileSocialList(data.following, 'profile-following-list', 'Following');
    }
  } catch (e) {}
}

function renderProfileSocialList(users, containerId, label) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!users || users.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);">No ${label} yet.</div>`;
    return;
  }

  container.innerHTML = users.map(u => {
    const avatarHtml = u.customAvatarUrl ? 
      `<img src="${API_ORIGIN}${u.customAvatarUrl}" alt="${u.displayName}" />` : 
      (u.avatar || '👤');

    return `
      <div class="user-social-card" onclick="openProfileHub('${u.username}')">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="user-social-avatar">${avatarHtml}</div>
          <div>
            <div style="font-weight:700; font-size:14px; color:#fff;">${u.displayName || u.username}</div>
            <div style="font-size:12px; color:var(--accent-cyan);">@${u.username}</div>
          </div>
        </div>
        <span class="genre-tag romantic" style="font-size:11px;">View Hub ➔</span>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// INTERACTIVE AVATAR CROPPER & FIT SCREEN ENGINE
// ==========================================================================
let cropperImage = null;
let cropperX = 0, cropperY = 0;
let cropperScale = 1;
let cropperBaseScale = 1;
let cropperRotation = 0;
let isCropperDragging = false;
let cropperDragStartX = 0, cropperDragStartY = 0;
let cropperInitialX = 0, cropperInitialY = 0;
let cropperEventsBound = false;

// Triggered when a user picks an avatar photo file
function handleAvatarFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file (JPG, PNG, WebP).', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    cropperImage = new Image();
    cropperImage.onload = function() {
      openAvatarCropper();
    };
    cropperImage.src = evt.target.result;
  };
  reader.readAsDataURL(file);

  // Clear input so same file can be chosen again
  e.target.value = '';
}

function openAvatarCropper() {
  if (!cropperImage) return;

  const modal = document.getElementById('avatar-crop-modal');
  if (!modal) return;
  modal.classList.add('active');

  const canvas = document.getElementById('cropper-canvas');
  const viewport = document.getElementById('cropper-viewport-wrap');
  if (!canvas || !viewport) return;

  // Set canvas coordinate space to matching viewport container
  const rect = viewport.getBoundingClientRect();
  canvas.width = rect.width || 480;
  canvas.height = rect.height || 320;

  // Circle mask size (240px)
  const maskRadius = 120;
  const minDim = Math.min(cropperImage.width, cropperImage.height);
  cropperBaseScale = (maskRadius * 2) / minDim;
  cropperScale = 1.0;
  cropperRotation = 0;
  cropperX = canvas.width / 2;
  cropperY = canvas.height / 2;

  const slider = document.getElementById('cropper-zoom-slider');
  if (slider) slider.value = "1";
  const zoomText = document.getElementById('cropper-zoom-val');
  if (zoomText) zoomText.innerText = '100%';

  if (!cropperEventsBound) {
    bindCropperEvents(viewport);
    cropperEventsBound = true;
  }

  drawCropperCanvas();
}

function closeAvatarCropper() {
  const modal = document.getElementById('avatar-crop-modal');
  if (modal) modal.classList.remove('active');
  cropperImage = null;
}

function bindCropperEvents(viewport) {
  // Mouse Drag Events
  viewport.addEventListener('mousedown', (e) => {
    isCropperDragging = true;
    cropperDragStartX = e.clientX;
    cropperDragStartY = e.clientY;
    cropperInitialX = cropperX;
    cropperInitialY = cropperY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isCropperDragging) return;
    const dx = e.clientX - cropperDragStartX;
    const dy = e.clientY - cropperDragStartY;
    cropperX = cropperInitialX + dx;
    cropperY = cropperInitialY + dy;
    drawCropperCanvas();
  });

  window.addEventListener('mouseup', () => {
    isCropperDragging = false;
  });

  // Touch Events (Mobile Drag & Pan)
  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isCropperDragging = true;
      cropperDragStartX = e.touches[0].clientX;
      cropperDragStartY = e.touches[0].clientY;
      cropperInitialX = cropperX;
      cropperInitialY = cropperY;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (!isCropperDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - cropperDragStartX;
    const dy = e.touches[0].clientY - cropperDragStartY;
    cropperX = cropperInitialX + dx;
    cropperY = cropperInitialY + dy;
    drawCropperCanvas();
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    isCropperDragging = false;
  });

  // Mouse Wheel Zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    adjustCropperZoom(delta);
  }, { passive: false });
}

function onCropperZoomChange(val) {
  cropperScale = parseFloat(val);
  const zoomText = document.getElementById('cropper-zoom-val');
  if (zoomText) zoomText.innerText = `${Math.round(cropperScale * 100)}%`;
  drawCropperCanvas();
}

function adjustCropperZoom(delta) {
  const slider = document.getElementById('cropper-zoom-slider');
  if (!slider) return;
  let newVal = Math.min(3.5, Math.max(0.2, cropperScale + delta));
  slider.value = newVal.toFixed(2);
  onCropperZoomChange(newVal);
}

function rotateCropper(deg) {
  cropperRotation = (cropperRotation + deg) % 360;
  drawCropperCanvas();
}

function resetCropperTransform() {
  const canvas = document.getElementById('cropper-canvas');
  if (!canvas) return;
  cropperX = canvas.width / 2;
  cropperY = canvas.height / 2;
  cropperScale = 1.0;
  cropperRotation = 0;
  const slider = document.getElementById('cropper-zoom-slider');
  if (slider) slider.value = "1";
  const zoomText = document.getElementById('cropper-zoom-val');
  if (zoomText) zoomText.innerText = '100%';
  drawCropperCanvas();
}

function drawCropperCanvas() {
  const canvas = document.getElementById('cropper-canvas');
  if (!canvas || !cropperImage) return;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(cropperX, cropperY);
  ctx.rotate((cropperRotation * Math.PI) / 180);
  const totalScale = cropperBaseScale * cropperScale;
  ctx.scale(totalScale, totalScale);

  ctx.drawImage(
    cropperImage,
    -cropperImage.width / 2,
    -cropperImage.height / 2
  );
  ctx.restore();

  // Render Mini Preview
  drawMiniPreview(canvas);
}

function drawMiniPreview(mainCanvas) {
  const previewCanvas = document.getElementById('cropper-preview-canvas');
  if (!previewCanvas) return;
  const pCtx = previewCanvas.getContext('2d');

  pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  // Circular mask radius is 120px (240px diameter) centered at mainCanvas.width/2, mainCanvas.height/2
  const cx = mainCanvas.width / 2;
  const cy = mainCanvas.height / 2;
  const cropSize = 240;

  pCtx.save();
  pCtx.beginPath();
  pCtx.arc(previewCanvas.width / 2, previewCanvas.height / 2, previewCanvas.width / 2, 0, Math.PI * 2);
  pCtx.clip();

  pCtx.drawImage(
    mainCanvas,
    cx - cropSize / 2,
    cy - cropSize / 2,
    cropSize,
    cropSize,
    0,
    0,
    previewCanvas.width,
    previewCanvas.height
  );
  pCtx.restore();
}

// Generate high-resolution 512x512 canvas slice & upload
async function applyAndUploadCroppedAvatar() {
  const saveBtn = document.getElementById('save-cropper-avatar-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerText = '⏳ Processing...';
  }

  try {
    const mainCanvas = document.getElementById('cropper-canvas');
    if (!mainCanvas || !cropperImage) throw new Error('No image loaded');

    // Create high-res 512x512 export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 512;
    exportCanvas.height = 512;
    const eCtx = exportCanvas.getContext('2d', { alpha: false });

    // Fill white/clean background
    eCtx.fillStyle = '#12141d';
    eCtx.fillRect(0, 0, 512, 512);

    const cx = mainCanvas.width / 2;
    const cy = mainCanvas.height / 2;
    const cropSize = 240;

    // High resolution render of the transformed image
    eCtx.save();
    eCtx.translate(256, 256);
    eCtx.rotate((cropperRotation * Math.PI) / 180);

    // Calculate scale factor relative to export size
    const factor = 512 / cropSize;
    const exportScale = cropperBaseScale * cropperScale * factor;
    eCtx.scale(exportScale, exportScale);

    // Offset relative to center
    const offsetX = (cropperX - cx) * factor;
    const offsetY = (cropperY - cy) * factor;

    // Inverse rotate offset so translation aligns with screen position
    const rad = (-cropperRotation * Math.PI) / 180;
    const rotOffsetX = offsetX * Math.cos(rad) - offsetY * Math.sin(rad);
    const rotOffsetY = offsetX * Math.sin(rad) + offsetY * Math.cos(rad);

    eCtx.translate(rotOffsetX / exportScale, rotOffsetY / exportScale);

    eCtx.drawImage(
      cropperImage,
      -cropperImage.width / 2,
      -cropperImage.height / 2
    );
    eCtx.restore();

    // Export as high-quality WebP Data URL
    const imageBase64 = exportCanvas.toDataURL('image/webp', 0.95);

    showToast('Saving fitted profile photo... 📸', 'info');

    const targetUser = activeProfileUsername || currentUser?.username || 'Soumya';
    const res = await apiFetch(`/api/users/profile/${encodeURIComponent(targetUser)}/avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 })
    });

    const data = await res.json();
    if (data.success && data.customAvatarUrl) {
      showToast('Profile photo updated with crystal clarity! 📸✨', 'success');
      
      if (currentUser && currentUser.username.toLowerCase() === targetUser.toLowerCase()) {
        currentUser.customAvatarUrl = data.customAvatarUrl;
        updateUserProfileUI();
      }

      closeAvatarCropper();
      closeModal('edit-profile-modal');
      openProfileHub(targetUser);
    } else {
      showToast(data.error?.message || 'Failed to update profile picture.', 'error');
    }
  } catch (err) {
    showToast('Error processing profile picture.', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerText = '✨ Save Profile Picture';
    }
  }
}

// Edit Profile Modal Handler
function openEditProfileModal() {
  if (!currentProfileData?.user) return;
  const u = currentProfileData.user;
  document.getElementById('edit-displayname').value = u.displayName || u.username;
  document.getElementById('edit-bio').value = u.bio || '';
  
  const previewEl = document.getElementById('edit-avatar-preview');
  if (previewEl) {
    if (u.customAvatarUrl) previewEl.innerHTML = `<img src="${API_ORIGIN}${u.customAvatarUrl}" style="width:100%; height:100%; object-fit:cover;" />`;
    else previewEl.innerHTML = u.avatar || '👤';
  }

  openModal('edit-profile-modal');
}

async function handleProfileEditSubmit(e) {
  if (e) e.preventDefault();
  const displayName = document.getElementById('edit-displayname').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();

  try {
    const res = await apiFetch(`/api/users/profile/${encodeURIComponent(activeProfileUsername)}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, bio })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Profile details updated! ✨', 'success');
      closeModal('edit-profile-modal');
      if (currentUser && currentUser.username.toLowerCase() === activeProfileUsername.toLowerCase()) {
        currentUser.displayName = displayName;
        updateUserProfileUI();
      }
      openProfileHub(activeProfileUsername);
    } else {
      showToast(data.error?.message || 'Failed to update profile.', 'error');
    }
  } catch (err) {
    showToast('Failed to update profile.', 'error');
  }
}

function closeViewer() {
  const modal = document.getElementById('viewer-modal');
  if (modal) modal.classList.remove('active');
  const videoEl = document.getElementById('viewer-video');
  if (videoEl) {
    videoEl.pause();
    videoEl.classList.remove('videos-playback-active');
    videoEl.src = '';
  }
}

function nextPhoto() {
  if (currentPhotos.length === 0) return;
  currentViewerIndex = (currentViewerIndex + 1) % currentPhotos.length;
  openViewer(currentViewerIndex);
}

function prevPhoto() {
  if (currentPhotos.length === 0) return;
  currentViewerIndex = (currentViewerIndex - 1 + currentPhotos.length) % currentPhotos.length;
  openViewer(currentViewerIndex);
}

// Toggle Favorite Photo
async function toggleFavorite(id, btnEl) {
  try {
    const res = await fetch(`${API_ORIGIN}/api/photos/${id}/favorite`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      playLikeSound();
      showToast(data.favorite ? 'Added to Favorites ❤️' : 'Removed from Favorites', 'info');
      if (btnEl) btnEl.innerHTML = data.favorite ? '❤️' : '🤍';
      if (data.favorite) {
        const card = btnEl?.closest('.photo-card');
        window.FavoriteMemoryEffects?.trigger('pulse', card || btnEl, 'heart');
      }
    }
  } catch (e) {}
}

// Bulk Selection Management
function toggleSelectPhoto(id) {
  if (selectedPhotoIds.has(id)) selectedPhotoIds.delete(id);
  else selectedPhotoIds.add(id);

  const toolbar = document.getElementById('bulk-toolbar');
  if (selectedPhotoIds.size > 0) {
    toolbar.classList.add('visible');
    document.getElementById('selected-count-text').innerText = `${selectedPhotoIds.size} Selected`;

    const isTrash = (currentView === 'trash');
    const favBtn = document.getElementById('bulk-fav-btn');
    const trashBtn = document.getElementById('bulk-trash-btn');
    const restoreBtn = document.getElementById('bulk-restore-btn');
    const deleteBtn = document.getElementById('bulk-delete-btn');

    if (favBtn) favBtn.style.display = isTrash ? 'none' : 'inline-flex';
    if (trashBtn) trashBtn.style.display = isTrash ? 'none' : 'inline-flex';
    if (restoreBtn) restoreBtn.style.display = isTrash ? 'inline-flex' : 'none';
    if (deleteBtn) deleteBtn.style.display = isTrash ? 'inline-flex' : 'none';
  } else {
    toolbar.classList.remove('visible');
  }
}

async function executeBulkAction(action) {
  if (selectedPhotoIds.size === 0) return;
  const photoIds = Array.from(selectedPhotoIds);

  if (action === 'delete') {
    if (!confirm(`Are you sure you want to permanently delete ${photoIds.length} photo(s)? This cannot be undone!`)) return;
  }

  try {
    const res = await apiFetch(`/api/photos/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoIds, action })
    });
    const data = await res.json();
    if (data.success) {
      const actionMsg = action === 'trash' ? 'moved to Trash 🗑️' : (action === 'restore' ? 'restored ✨' : (action === 'delete' ? 'permanently deleted 💥' : action));
      showToast(`${photoIds.length} photo(s) ${actionMsg}.`, 'success');
      selectedPhotoIds.clear();
      document.getElementById('bulk-toolbar').classList.remove('visible');
      loadGallery(currentView);
      loadMembersFilter();
      loadStorageStats();
    } else {
      showToast(data.error?.message || 'Failed to execute bulk action.', 'error');
    }
  } catch (e) {
    showToast('Failed to execute bulk action.', 'error');
  }
}

// ==========================================================================
// WALLPAPER STUDIO & DYNAMIC QR CODE SHARING
// ==========================================================================
let currentWallpaperRatio = { name: '16:9', ratio: 16/9, width: 1920, height: 1080 };
let currentShareUrl = '';

function openWallpaperModal() {
  const photo = currentPhotos[currentViewerIndex] || (currentPhotos.length > 0 ? currentPhotos[0] : null);
  const previewImg = document.getElementById('wallpaper-preview-img');
  
  if (previewImg) {
    if (photo && (photo.url || photo.localUrl || photo.thumbnailUrl)) {
      const src = photo.url || photo.localUrl || photo.thumbnailUrl;
      previewImg.src = src.startsWith('http') ? src : `${API_ORIGIN}${src}`;
    } else {
      const activeViewerImg = document.getElementById('viewer-img');
      previewImg.src = activeViewerImg?.src || './assets/images/default-cover.jpg';
    }
  }

  // Reset to default 16:9
  selectWallpaperRatio('16:9', 16/9, document.getElementById('ratio-btn-16-9'));
  playModalOpenSound();
  openModal('wallpaper-modal');
}

function selectWallpaperRatio(ratioName, ratioVal, el) {
  playClickSound();
  const frame = document.getElementById('wallpaper-preview-frame');
  if (frame) {
    frame.className = `wallpaper-preview-frame ratio-${ratioName.replace(':', '-')}`;
  }

  document.querySelectorAll('.wallpaper-ratio-btn').forEach(btn => btn.classList.remove('active'));
  if (el) el.classList.add('active');

  let targetW = 1920;
  let targetH = 1080;
  if (ratioName === '16:10') { targetW = 1920; targetH = 1200; }
  else if (ratioName === '9:16') { targetW = 1080; targetH = 1920; }
  else if (ratioName === '1:1') { targetW = 2048; targetH = 2048; }

  currentWallpaperRatio = {
    name: ratioName,
    ratio: ratioVal,
    width: targetW,
    height: targetH
  };
}

async function downloadActiveWallpaper() {
  const previewImg = document.getElementById('wallpaper-preview-img');
  if (!previewImg || !previewImg.src) {
    showToast('No image available to generate wallpaper.', 'warning');
    return;
  }

  const btn = document.getElementById('download-wallpaper-btn');
  const originalText = btn ? btn.innerText : '📥 Download High-Res Wallpaper';
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'GENERATING ULTRA-HD WALLPAPER... ⏳';
  }

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = previewImg.src;

    await new Promise((resolve, reject) => {
      if (img.complete) return resolve();
      img.onload = resolve;
      img.onerror = () => resolve(); // proceed anyway
    });

    const canvas = document.createElement('canvas');
    canvas.width = currentWallpaperRatio.width;
    canvas.height = currentWallpaperRatio.height;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const targetRatio = currentWallpaperRatio.width / currentWallpaperRatio.height;
    const imgRatio = (img.naturalWidth || img.width || 1920) / (img.naturalHeight || img.height || 1080);

    let srcW = img.naturalWidth || img.width;
    let srcH = img.naturalHeight || img.height;
    let srcX = 0;
    let srcY = 0;

    if (imgRatio > targetRatio) {
      srcW = srcH * targetRatio;
      srcX = ((img.naturalWidth || img.width) - srcW) / 2;
    } else {
      srcH = srcW / targetRatio;
      srcY = ((img.naturalHeight || img.height) - srcH) / 2;
    }

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

    const link = document.createElement('a');
    const filename = `Wallpaper_${currentWallpaperRatio.name.replace(':', '-')}_${Date.now()}.png`;
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    playSuccessSound();
    showToast(`✨ ${currentWallpaperRatio.name} Ultra-HD Wallpaper downloaded successfully!`, 'success');
  } catch (err) {
    // Fallback: direct image download
    const link = document.createElement('a');
    link.download = `Wallpaper_${Date.now()}.jpg`;
    link.href = previewImg.src;
    link.target = '_blank';
    link.click();
    showToast('Downloaded wallpaper image!', 'success');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = originalText;
    }
  }
}

function openShareModal() {
  const photo = currentPhotos[currentViewerIndex] || (currentPhotos.length > 0 ? currentPhotos[0] : null);
  let shareUrl = window.location.href;

  if (photo && (photo.url || photo.localUrl)) {
    const src = photo.url || photo.localUrl;
    shareUrl = src.startsWith('http') ? src : `${window.location.origin}${src}`;
  } else {
    const activeViewerImg = document.getElementById('viewer-img');
    if (activeViewerImg && activeViewerImg.src) {
      shareUrl = activeViewerImg.src;
    }
  }

  currentShareUrl = shareUrl;

  const linkInput = document.getElementById('share-direct-link-input');
  if (linkInput) linkInput.value = shareUrl;

  // Render Real Scannable QR Code
  const qrContainer = document.getElementById('qr-container');
  if (qrContainer) {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=050712&margin=2`;
    qrContainer.innerHTML = `<img src="${qrApiUrl}" alt="Scan QR Code" style="width:170px; height:170px; display:block;" onerror="this.onerror=null; this.src='https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=' + encodeURIComponent('${shareUrl}');" />`;
  }

  playModalOpenSound();
  openModal('share-modal');
}

function copyShareLink() {
  const linkInput = document.getElementById('share-direct-link-input');
  const urlToCopy = linkInput ? linkInput.value : currentShareUrl || window.location.href;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(urlToCopy).then(() => {
      playClickSound();
      showToast('📋 Direct cloud link copied to clipboard!', 'success');
    }).catch(() => {
      fallbackCopyText(urlToCopy);
    });
  } else {
    fallbackCopyText(urlToCopy);
  }
}

function fallbackCopyText(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    playClickSound();
    showToast('📋 Link copied to clipboard!', 'success');
  } catch (err) {
    showToast('Link: ' + text, 'info');
  }
  document.body.removeChild(textArea);
}

async function triggerNativeShare() {
  const urlToShare = currentShareUrl || window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Private Photo Cloud Memory',
        text: 'View this memory on our Private Cloud! 📸✨',
        url: urlToShare
      });
      showToast('Shared memory successfully! 💖', 'success');
    } catch (err) {
      if (err.name !== 'AbortError') {
        copyShareLink();
      }
    }
  } else {
    copyShareLink();
  }
}

function downloadQRCodeImage() {
  const qrContainer = document.getElementById('qr-container');
  const qrImg = qrContainer ? qrContainer.querySelector('img') : null;
  if (qrImg && qrImg.src) {
    const link = document.createElement('a');
    link.download = `Memory_QRCode_${Date.now()}.png`;
    link.href = qrImg.src;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playSuccessSound();
    showToast('⬇️ QR Code downloaded successfully!', 'success');
  } else {
    copyShareLink();
  }
}

// ==========================================================================
// ROMANTIC FAVORITES ENGINE: BIG PINK CRYSTAL HEART SHATTER & REVEAL
// ==========================================================================
let favoritesHeartShattered = false;
let heartParticlesAnimId = null;
let heartAmbientParticles = [];

// Initialize Ambient Floating Sparkles for Heart Stage
function initHeartAmbientParticles() {
  const canvas = document.getElementById('heart-particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : { width: window.innerWidth, height: 480 };
  canvas.width = rect.width || window.innerWidth;
  canvas.height = rect.height || 480;

  heartAmbientParticles = [];
  const emojis = ['💖', '✨', '🌸', '💕', '💫', '🌹', '❤️', '💗'];
  for (let i = 0; i < 30; i++) {
    heartAmbientParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 14 + Math.random() * 18,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      vx: (Math.random() - 0.5) * 0.8,
      vy: -0.6 - Math.random() * 1.2,
      opacity: 0.25 + Math.random() * 0.65,
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 2.5
    });
  }

  if (heartParticlesAnimId) {
    cancelAnimationFrame(heartParticlesAnimId);
    heartParticlesAnimId = null;
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    heartAmbientParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;
      if (p.y < -30) {
        p.y = canvas.height + 20;
        p.x = Math.random() * canvas.width;
      }
      if (p.x < -30) p.x = canvas.width + 20;
      if (p.x > canvas.width + 30) p.x = -20;

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.font = `${p.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    });

    heartParticlesAnimId = requestAnimationFrame(loop);
  }
  loop();
}

// Trigger Big Pink Heart Shatter & Particle Explosion Reveal
async function triggerHeartShatterReveal() {
  const card = document.getElementById('favorites-heart-card');
  const stage = document.getElementById('favorites-heart-stage');
  if (!card || !stage || card.classList.contains('shattering')) return;

  card.classList.add('shattering');
  playHeartbeatSound();

  // Rapid heartbeat vibration
  if (window.gsap) {
    gsap.to(card, {
      scale: 1.14,
      duration: 0.16,
      yoyo: true,
      repeat: 3,
      ease: 'power2.inOut'
    });
  }

  await new Promise(r => setTimeout(r, 420));
  playHeartbeatSound();
  await new Promise(r => setTimeout(r, 360));

  // Shatter Sound & Explosion
  playHeartShatterSound();

  if (heartParticlesAnimId) {
    cancelAnimationFrame(heartParticlesAnimId);
    heartParticlesAnimId = null;
  }

  const cardRect = card.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const originX = cardRect.left + cardRect.width / 2 - stageRect.left;
  const originY = cardRect.top + cardRect.height / 2 - stageRect.top;

  const shardContainer = document.createElement('div');
  shardContainer.className = 'heart-shards-overlay';
  stage.appendChild(shardContainer);

  const shardColors = ['#ff007f', '#ff4081', '#ff1493', '#ff80ab', '#ffc1e3', '#ffd700', '#ffffff'];
  const emojis = ['💖', '💕', '✨', '🌸', '💫', '🌹', '❤️', '🌟', '💗'];

  // Spawn 50+ geometric glass shards and emoji bursts
  for (let i = 0; i < 54; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 140 + Math.random() * 480;
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance - (Math.random() * 100);
    const rotZ = (Math.random() - 0.5) * 720;
    const rotX = (Math.random() - 0.5) * 720;
    const rotY = (Math.random() - 0.5) * 720;
    const scale = 0.5 + Math.random() * 1.5;
    const isEmoji = Math.random() > 0.4;

    const el = document.createElement('div');
    el.className = 'heart-shard-piece';
    el.style.left = `${originX}px`;
    el.style.top = `${originY}px`;

    if (isEmoji) {
      el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.fontSize = `${20 + Math.random() * 26}px`;
      el.style.filter = 'drop-shadow(0 0 10px rgba(255,64,129,0.95))';
    } else {
      const color = shardColors[Math.floor(Math.random() * shardColors.length)];
      const w = 14 + Math.random() * 26;
      const h = 14 + Math.random() * 26;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.background = `linear-gradient(135deg, ${color}, rgba(255,255,255,0.9))`;
      el.style.clipPath = `polygon(${Math.random()*40}% 0%, 100% ${Math.random()*40}%, ${60+Math.random()*40}% 100%, 0% ${60+Math.random()*40}%)`;
      el.style.boxShadow = `0 0 18px ${color}`;
    }

    shardContainer.appendChild(el);

    if (window.gsap) {
      gsap.to(el, {
        x: targetX,
        y: targetY,
        rotation: rotZ,
        rotationX: rotX,
        rotationY: rotY,
        scale: scale,
        opacity: 0,
        duration: 0.9 + Math.random() * 0.85,
        ease: 'power3.out',
        onComplete: () => el.remove()
      });
    }
  }

  // Shockwave ring explosion
  const shockwave = document.createElement('div');
  shockwave.className = 'heart-shockwave';
  shockwave.style.left = `${originX}px`;
  shockwave.style.top = `${originY}px`;
  stage.appendChild(shockwave);

  // Fade out heart card
  if (window.gsap) {
    gsap.to(card, {
      scale: 0.1,
      opacity: 0,
      filter: 'blur(20px)',
      duration: 0.55,
      ease: 'power2.in'
    });
  }

  await new Promise(r => setTimeout(r, 580));
  favoritesHeartShattered = true;

  // Reveal Unlocked Toolbar and Gallery
  stage.style.display = 'none';
  shardContainer.remove();
  shockwave.remove();
  card.classList.remove('shattering');
  card.style.opacity = '1';
  card.style.transform = 'none';
  card.style.filter = 'none';

  const toolbar = document.getElementById('favorites-unlocked-toolbar');
  const galleryGrid = document.getElementById('gallery-grid');
  if (toolbar) {
    toolbar.style.display = 'flex';
    window.FavoriteMemoryEffects?.renderToolbar(document.getElementById('favorites-fx-selector-container'));
  }
  if (galleryGrid) galleryGrid.style.display = 'grid';

  playSuccessSound();
  await loadGallery('favorites');

  // Stagger bloom animation on loaded cards
  const cards = document.querySelectorAll('#gallery-grid .photo-card');
  const countLabel = document.getElementById('favorites-count-label');
  if (countLabel) countLabel.innerText = `${cards.length} Loved Memory Photos Unlocked 💖`;

  if (cards.length > 0 && window.gsap) {
    gsap.fromTo(cards, 
      { scale: 0.75, opacity: 0, y: 45, filter: 'blur(8px)' },
      { scale: 1, opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, stagger: 0.05, ease: 'back.out(1.4)' }
    );
  }
}

// Re-lock with Heart (Allows reliving the heart shatter animation anytime!)
function relockFavoritesHeart() {
  favoritesHeartShattered = false;
  const stage = document.getElementById('favorites-heart-stage');
  const toolbar = document.getElementById('favorites-unlocked-toolbar');
  const galleryGrid = document.getElementById('gallery-grid');

  if (toolbar) toolbar.style.display = 'none';
  if (galleryGrid) galleryGrid.style.display = 'none';

  if (stage) {
    stage.style.display = 'flex';
    stage.style.opacity = '0';
    if (window.gsap) {
      gsap.fromTo(stage, 
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
      );
    } else {
      stage.style.opacity = '1';
    }
    initHeartAmbientParticles();
  }
  playLikeSound();
  showToast('💖 Heart Re-locked! Tap the heart to shatter & reveal memories again ✨', 'info');
}

// ==========================================================================
// CINEMATIC 3D INTERACTIVE ALBUMS ENGINE
// ==========================================================================
let currentAlbumsCache = [];
let activeAlbumFilterStyle = 'all';
let activeStageAlbum = null;
let activeStagePageIdx = 0;
let stageSlideshowTimer = null;
let selectedAlbumInitialFiles = [];

const ALBUM_STYLE_META = {
  flipbook: { name: '3D Flipbook', icon: '📖', defaultCover: 'assets/covers/cover_flipbook.jpg' },
  tree: { name: 'Tree of Life', icon: '🌳', defaultCover: 'assets/covers/cover_tree.jpg' },
  filmstrip: { name: '35mm Film Reel', icon: '🎞️', defaultCover: 'assets/covers/cover_filmstrip.jpg' },
  orbit: { name: 'Cosmic Orbit', icon: '🌌', defaultCover: 'assets/covers/cover_orbit.jpg' },
  scrapbook: { name: 'Scrapbook Clothesline', icon: '📸', defaultCover: 'assets/covers/cover_scrapbook.jpg' },
  museum: { name: 'Royal Art Gallery', icon: '🏛️', defaultCover: 'assets/covers/cover_museum.jpg' }
};

function playPageTurnSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
}

// Load Albums from Server
async function loadAlbums() {
  try {
    const res = await apiFetch('/api/albums');
    const data = await res.json();
    if (data.success && Array.isArray(data.albums)) {
      currentAlbumsCache = data.albums;
      const countEl = document.getElementById('count-all-albums');
      if (countEl) countEl.innerText = currentAlbumsCache.length;
      renderAlbums();
    }
  } catch (e) {
    console.error('[Albums] Failed to load:', e);
  }
}

// Render 3D Album Cards
function renderAlbums() {
  const container = document.getElementById('albums-list');
  const filterBar = document.getElementById('album-style-filters');
  if (!container) return;

  if (currentAlbumsCache.length === 0) {
    if (filterBar) filterBar.style.display = 'none';
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:60px 20px; background: rgba(255,255,255,0.02); border-radius:18px; border:1px dashed rgba(255,255,255,0.15);">
        <div style="font-size:52px; margin-bottom:14px;">📁</div>
        <h3 style="font-size:22px; font-weight:800; color:var(--text-primary); margin-bottom:6px;">No Albums Created Yet</h3>
        <p style="font-size:13px; color:var(--text-secondary); max-width:440px; margin:0 auto 22px auto; line-height:1.5;">
          Click below to create your custom album and choose from 6 immersive 3D presentation styles!
        </p>
        <button class="btn-primary-3d" onclick="openCreateAlbumModal()" style="display:inline-flex; align-items:center; gap:8px; padding:12px 26px; border-radius:14px; font-size:14px; cursor:pointer;">
          <span>➕</span> <span>Create New Album</span>
        </button>
      </div>
    `;
    return;
  }

  if (filterBar) filterBar.style.display = 'flex';

  const filtered = (activeAlbumFilterStyle === 'all')
    ? currentAlbumsCache
    : currentAlbumsCache.filter(a => a.style === activeAlbumFilterStyle);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:50px 20px; color:var(--text-muted);">
        <div style="font-size:42px; margin-bottom:10px;">✨</div>
        <p style="font-weight:800; font-size:16px; color:var(--text-primary);">No Albums in this style</p>
        <button class="btn-primary-3d" onclick="openCreateAlbumModal()" style="margin-top:12px; display:inline-flex; align-items:center; gap:6px;">
          <span>➕</span> <span>Create Album in this Style</span>
        </button>
      </div>
    `;
    return;
  }

  const STYLE_CARD_CONFIG = {
    flipbook: { btn: '📖 Read Book', badge: '📖 Hardcover Book' },
    tree: { btn: '🌿 Enter Canopy', badge: '🌳 Tree of Life' },
    filmstrip: { btn: '🎬 Play Reel', badge: '🎞️ 35mm Cinema Reel' },
    orbit: { btn: '🌌 Launch Orbit', badge: '🌌 Cosmic Orbit' },
    scrapbook: { btn: '📸 Open Scrapbook', badge: '📸 Polaroid Scrapbook' },
    museum: { btn: '🏛️ Visit Gallery', badge: '🏛️ Art Gallery' }
  };

  container.innerHTML = filtered.map(album => {
    const styleKey = album.style || 'flipbook';
    const styleInfo = ALBUM_STYLE_META[styleKey] || { name: styleKey, icon: '📁' };
    const cardConfig = STYLE_CARD_CONFIG[styleKey] || { btn: 'Open 🚀', badge: styleInfo.name };
    const defaultCover = styleInfo.defaultCover || '/assets/covers/cover_tree.jpg';
    const coverUrl = album.coverPhotoUrl || defaultCover;
    const photoCount = album.photos ? album.photos.length : (album.photoCount || 0);
    const creator = album.creator || { displayName: 'Soumya', avatar: '👑' };

    const isAvatarUrl = creator.avatar && (creator.avatar.startsWith('/') || creator.avatar.startsWith('http'));
    const avatarContent = isAvatarUrl
      ? `<img src="${creator.avatar}" class="album-creator-avatar-img" onerror="this.outerHTML='👑'" alt="Avatar" />`
      : `<span style="font-size:13px;">${creator.avatar || '👤'}</span>`;

    return `
      <div class="album-card-3d style-theme-${styleKey}" onclick="openAlbumStage('${album.id}')" title="Click to Open 3D Album Stage">
        <!-- Cover Preview with Theme-Specific Artwork -->
        <div class="album-cover-box">
          <img src="${coverUrl}" alt="${album.name}" onerror="this.src='${defaultCover}'" loading="lazy" />
          <div class="album-cover-gradient"></div>
          <div class="album-floating-badge">
            <span>${cardConfig.badge}</span>
          </div>
          <div class="album-photo-counter">📸 ${photoCount} Photos</div>
        </div>

        <!-- Details -->
        <div class="album-card-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div class="album-title-text" style="margin:0;">
              <span>${album.emoji || styleInfo.icon}</span>
              <span>${album.name}</span>
            </div>
            <button type="button" class="btn-icon" style="width:26px; height:26px; font-size:11px; background:rgba(255,23,68,0.15); border:1px solid rgba(255,23,68,0.35); color:#ff1744; border-radius:8px;" onclick="event.stopPropagation(); deleteAlbumPrompt('${album.id}', '${album.name.replace(/'/g, "\\'")}')" title="Delete Album (Photos stay safe in library!)">🗑️</button>
          </div>
          <div class="album-desc-text">${album.description || 'Interactive 3D memory collection.'}</div>

          <div class="album-card-footer">
            <div class="album-creator-chip">
              ${avatarContent}
              <span>by <strong>@${creator.displayName || creator.username || 'Member'}</strong></span>
            </div>
            <button type="button" class="btn-open-album" onclick="event.stopPropagation(); openAlbumStage('${album.id}')">
              <span>${cardConfig.btn}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Delete Album Prompt with Guarantee that Photos Remain in Library
async function deleteAlbumPrompt(albumId, albumName) {
  const confirmed = confirm(`Are you sure you want to delete the album "${albumName}"?\n\n📸 Don't worry: All photos inside this album will remain 100% safe in your main Photos library!`);
  if (!confirmed) return;

  try {
    const res = await apiFetch(`/api/albums/${albumId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (res.ok && data.success) {
      playSuccessSound();
      showToast(`Album deleted! (All photos remain safe in your library 📸)`, 'success');
      await loadAlbums();
      if (activeStageAlbum && activeStageAlbum.id === albumId) {
        closeAlbumStage();
      }
    } else {
      showToast(data.error?.message || 'Failed to delete album', 'error');
    }
  } catch (err) {
    showToast('Network error deleting album.', 'error');
  }
}

// Remove Single Photo from Active Album
async function removePhotoFromActiveAlbum(photoId) {
  if (!activeStageAlbum) return;
  const confirmed = confirm('Remove this photo from this album?\n\n📸 Note: The photo will still remain 100% safe in your main Photos library!');
  if (!confirmed) return;

  try {
    const res = await apiFetch(`/api/albums/${activeStageAlbum.id}/photos/${photoId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (res.ok && data.success && data.album) {
      activeStageAlbum = data.album;
      playSuccessSound();
      showToast('Photo removed from album (remains safe in your Photos library! 📸)', 'success');
      await loadAlbums();
      renderActiveStageStyle();
    } else {
      showToast(data.error?.message || 'Failed to remove photo', 'error');
    }
  } catch (err) {
    showToast('Error removing photo from album.', 'error');
  }
}

// Filter Filter Tab Handler
function filterAlbumsByStyle(style, btnEl) {
  activeAlbumFilterStyle = style;
  document.querySelectorAll('.album-filter-pill').forEach(el => el.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  playNavSound();
  renderAlbums();
}

// Open Create Album Modal
function openCreateAlbumModal() {
  const modal = document.getElementById('create-album-modal');
  if (!modal) return;
  const form = document.getElementById('create-album-form');
  if (form) form.reset();
  selectedAlbumInitialFiles = [];
  selectAlbumCreateStyle('flipbook');

  const fileInput = document.getElementById('album-initial-files-input');
  if (fileInput) fileInput.value = '';
  
  const dropLabel = document.getElementById('album-dropzone-label');
  const dropIcon = document.getElementById('album-dropzone-icon');
  if (dropLabel) dropLabel.innerText = 'Click or Drag & Drop photos for this album';
  if (dropIcon) dropIcon.innerText = '🖼️';

  openModal('create-album-modal');
}

function selectAlbumCreateStyle(style, cardEl) {
  const input = document.getElementById('album-selected-style');
  if (input) input.value = style;

  document.querySelectorAll('.style-picker-card').forEach(c => c.classList.remove('active'));
  if (cardEl) {
    cardEl.classList.add('active');
  } else {
    const defaultCard = document.querySelector(`.style-picker-card[data-style="${style}"]`);
    if (defaultCard) defaultCard.classList.add('active');
  }
}

function handleAlbumInitialFilesSelected(e) {
  const files = Array.from(e.target?.files || e.files || []);
  if (files.length === 0) return;
  selectedAlbumInitialFiles = files;

  const dropLabel = document.getElementById('album-dropzone-label');
  const dropIcon = document.getElementById('album-dropzone-icon');
  if (dropLabel) dropLabel.innerHTML = `<strong>Selected ${files.length} Photo(s)</strong> ✅`;
  if (dropIcon) dropIcon.innerText = '📸';
}

async function handleCreateAlbumSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const nameInput = document.getElementById('album-input-name');
  const name = nameInput ? nameInput.value.trim() : '';
  const style = document.getElementById('album-selected-style')?.value || 'flipbook';
  const desc = document.getElementById('album-input-desc')?.value.trim() || '';
  const styleMeta = ALBUM_STYLE_META[style] || { name: style, icon: '📖' };

  if (!name) {
    showToast('Please enter an album title', 'error');
    if (nameInput) nameInput.focus();
    return;
  }

  const submitBtn = document.getElementById('create-album-submit-btn');
  const originalHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳</span> <span>Creating 3D Album...</span>`;
  }

  try {
    const res = await apiFetch('/api/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        style,
        emoji: styleMeta.icon,
        description: desc,
        tag: styleMeta.name
      })
    });

    const data = await res.json();
    if (res.ok && data.success && data.album) {
      const createdAlbum = data.album;
      
      // If initial photos selected, upload them now
      if (selectedAlbumInitialFiles.length > 0) {
        try {
          const formData = new FormData();
          selectedAlbumInitialFiles.forEach(f => formData.append('photos', f));
          await apiFetch(`/api/albums/${createdAlbum.id}/photos`, {
            method: 'POST',
            body: formData
          });
        } catch (uploadErr) {
          console.warn('[Album Photos Upload Warning]:', uploadErr);
        }
      }

      playSuccessSound();
      showToast(`✨ Album "${name}" created in ${styleMeta.name} style!`, 'success');
      closeModal('create-album-modal');
      
      selectedAlbumInitialFiles = [];
      const form = document.getElementById('create-album-form');
      if (form) form.reset();

      await loadAlbums();
      openAlbumStage(createdAlbum.id);
    } else {
      showToast(data.error?.message || data.error || 'Failed to create album', 'error');
    }
  } catch (err) {
    console.error('[Create Album Error]:', err);
    showToast('Network error while creating album.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    }
  }
}

// ==========================================================================
// FULLSCREEN 3D INTERACTIVE ALBUM STAGE VIEWER
// ==========================================================================
async function openAlbumStage(albumId) {
  const modal = document.getElementById('album-stage-modal');
  if (!modal) return;

  try {
    const res = await apiFetch(`/api/albums/${albumId}`);
    const data = await res.json();
    if (data.success && data.album) {
      activeStageAlbum = data.album;
    } else {
      activeStageAlbum = currentAlbumsCache.find(a => a.id === albumId) || null;
    }
  } catch (e) {
    activeStageAlbum = currentAlbumsCache.find(a => a.id === albumId) || null;
  }

  if (!activeStageAlbum) {
    showToast('Album not found', 'error');
    return;
  }

  activeStagePageIdx = 0;
  if (stageSlideshowTimer) {
    clearInterval(stageSlideshowTimer);
    stageSlideshowTimer = null;
    const slideBtn = document.getElementById('stage-slideshow-btn');
    if (slideBtn) slideBtn.innerHTML = `<span>▶</span> <span>Slideshow</span>`;
  }

  // Set Headers
  const titleEl = document.getElementById('stage-album-title');
  const badgeEl = document.getElementById('stage-album-badge');
  const styleInfo = ALBUM_STYLE_META[activeStageAlbum.style] || { name: activeStageAlbum.style, icon: '📖' };
  
  if (titleEl) titleEl.innerHTML = `${activeStageAlbum.emoji || styleInfo.icon} ${activeStageAlbum.name}`;
  if (badgeEl) badgeEl.innerText = styleInfo.name;

  modal.style.display = 'flex';
  playNavSound();
  renderActiveStageStyle();
}

function closeAlbumStage() {
  const modal = document.getElementById('album-stage-modal');
  if (modal) modal.style.display = 'none';
  if (stageSlideshowTimer) {
    clearInterval(stageSlideshowTimer);
    stageSlideshowTimer = null;
  }
  activeStageAlbum = null;
}

function renderActiveStageStyle() {
  if (!activeStageAlbum) return;
  const viewport = document.getElementById('album-stage-viewport');
  const bottombar = document.getElementById('album-stage-bottombar');
  const subtitleEl = document.getElementById('stage-album-subtitle');
  if (!viewport) return;

  const photos = activeStageAlbum.photos || [];
  const style = activeStageAlbum.style || 'flipbook';

  if (subtitleEl) {
    subtitleEl.innerText = `${photos.length} Captured Memories • ${activeStageAlbum.description || '3D Interactive Album'}`;
  }

  if (photos.length === 0) {
    viewport.innerHTML = `
      <div style="text-align:center; padding:40px; color:#ffffff;">
        <div style="font-size:48px; margin-bottom:12px;">📸</div>
        <h3 style="font-size:20px; font-weight:800; margin-bottom:8px;">No photos in this album yet</h3>
        <p style="font-size:13px; color:rgba(255,255,255,0.7); margin-bottom:18px;">Upload photos right now to experience this 3D album!</p>
        <button class="btn-primary-3d" onclick="openUploadToActiveAlbum()" style="display:inline-flex; align-items:center; gap:8px;">
          <span>➕</span> <span>Upload Photos Now</span>
        </button>
      </div>
    `;
    if (bottombar) bottombar.innerHTML = '';
    return;
  }

  switch (style) {
    case 'flipbook':
      renderFlipbookStage(photos);
      break;
    case 'tree':
      renderTreeStage(photos);
      break;
    case 'filmstrip':
      renderFilmstripStage(photos);
      break;
    case 'orbit':
      renderOrbitStage(photos);
      break;
    case 'scrapbook':
      renderScrapbookStage(photos);
      break;
    case 'museum':
      renderMuseumStage(photos);
      break;
    default:
      renderFlipbookStage(photos);
      break;
  }
}

// 1. 3D Flipbook Stage Renderer
function renderFlipbookStage(photos) {
  const viewport = document.getElementById('album-stage-viewport');
  const bottombar = document.getElementById('album-stage-bottombar');
  if (!viewport) return;

  const totalPages = Math.ceil(photos.length / 2);
  if (activeStagePageIdx >= totalPages) activeStagePageIdx = 0;
  if (activeStagePageIdx < 0) activeStagePageIdx = totalPages - 1;

  const leftPhoto = photos[activeStagePageIdx * 2];
  const rightPhoto = photos[activeStagePageIdx * 2 + 1];

  const leftUrl = leftPhoto?.url || (leftPhoto?.id || leftPhoto?._id ? `${API_ORIGIN}/api/photos/file/${leftPhoto.id || leftPhoto._id}/medium` : '');
  const rightUrl = rightPhoto ? (rightPhoto.url || (rightPhoto.id || rightPhoto._id ? `${API_ORIGIN}/api/photos/file/${rightPhoto.id || rightPhoto._id}/medium` : '')) : null;

  viewport.innerHTML = `
    <div class="flipbook-container">
      <button class="flipbook-nav-arrow prev" onclick="flipBookPrev()" title="Previous Page (←)">‹</button>
      
      <div class="flipbook-book" id="flipbook-book-body">
        <div class="flipbook-page-center-crease"></div>
        
        <!-- Left Page Spread -->
        <div class="flipbook-page left-page">
          <div class="flipbook-photo-frame" onclick="openViewer('${leftPhoto?.id || leftPhoto?._id}')" style="position:relative;">
            <button class="btn-icon" style="position:absolute; top:8px; right:8px; width:26px; height:26px; font-size:11px; background:rgba(0,0,0,0.65); border:1px solid rgba(255,255,255,0.3); color:#ff5252; z-index:5; border-radius:8px;" onclick="event.stopPropagation(); removePhotoFromActiveAlbum('${leftPhoto?.id || leftPhoto?._id}')" title="Remove from album (Photo stays safe in library!)">🗑️</button>
            <img src="${leftUrl}" alt="${leftPhoto?.originalName || 'Memory'}" />
            <div class="flipbook-caption">${leftPhoto?.originalName || 'Golden Memory'}</div>
          </div>
          <div style="font-size:11px; color:#888; font-weight:700;">Page ${activeStagePageIdx * 2 + 1}</div>
        </div>

        <!-- Right Page Spread -->
        <div class="flipbook-page right-page">
          ${rightPhoto ? `
            <div class="flipbook-photo-frame" onclick="openViewer('${rightPhoto.id || rightPhoto._id}')" style="position:relative;">
              <button class="btn-icon" style="position:absolute; top:8px; right:8px; width:26px; height:26px; font-size:11px; background:rgba(0,0,0,0.65); border:1px solid rgba(255,255,255,0.3); color:#ff5252; z-index:5; border-radius:8px;" onclick="event.stopPropagation(); removePhotoFromActiveAlbum('${rightPhoto.id || rightPhoto._id}')" title="Remove from album (Photo stays safe in library!)">🗑️</button>
              <img src="${rightUrl}" alt="${rightPhoto.originalName || 'Memory'}" />
              <div class="flipbook-caption">${rightPhoto.originalName || 'Special Moment'}</div>
            </div>
            <div style="font-size:11px; color:#888; font-weight:700;">Page ${activeStagePageIdx * 2 + 2}</div>
          ` : `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#999; font-style:italic;">
              <p style="font-size:28px; margin-bottom:8px;">✨</p>
              <p>Add more memories to complete this page spread</p>
              <button class="btn-primary-3d" onclick="openUploadToActiveAlbum()" style="margin-top:12px; font-size:12px; padding:6px 14px;">
                <span>➕</span> <span>Add Photos</span>
              </button>
            </div>
          `}
        </div>
      </div>

      <button class="flipbook-nav-arrow next" onclick="flipBookNext()" title="Next Page (→)">›</button>
    </div>
  `;

  if (bottombar) {
    bottombar.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; color:#fff; font-size:13px; font-weight:700;">
        <button class="btn-stage-action" onclick="flipBookPrev()">⬅ Previous Leaf</button>
        <span>Page Spread ${activeStagePageIdx + 1} of ${totalPages}</span>
        <button class="btn-stage-action" onclick="flipBookNext()">Next Leaf ➡</button>
      </div>
    `;
  }
}

function flipBookNext() {
  playPageTurnSound();
  const book = document.getElementById('flipbook-book-body');
  if (book) book.style.animation = 'pageFlipForward 0.35s ease';
  setTimeout(() => {
    activeStagePageIdx++;
    renderActiveStageStyle();
  }, 180);
}

function flipBookPrev() {
  playPageTurnSound();
  const book = document.getElementById('flipbook-book-body');
  if (book) book.style.animation = 'pageFlipForward 0.35s ease';
  setTimeout(() => {
    activeStagePageIdx--;
    renderActiveStageStyle();
  }, 180);
}

// 2. Botanical Tree of Life Stage Renderer
function renderTreeStage(photos) {
  const viewport = document.getElementById('album-stage-viewport');
  const bottombar = document.getElementById('album-stage-bottombar');
  if (!viewport) return;

  viewport.innerHTML = `
    <div class="tree-stage">
      <div class="tree-canopy-art"></div>
      <div class="tree-canopy-branches"></div>

      <div class="tree-hanging-grid">
        ${photos.map((p, idx) => {
          const url = p.url || (p.id || p._id ? `${API_ORIGIN}/api/photos/file/${p.id || p._id}/medium` : '');
          const photoId = p.id || p._id;
          return `
            <div class="tree-hanging-item" style="animation-delay: ${idx * 0.25}s; position:relative;" onclick="openViewer('${photoId}')" title="Click to enlarge">
              <button class="btn-icon" style="position:absolute; top:2px; right:2px; width:22px; height:22px; font-size:10px; background:rgba(0,0,0,0.7); border:1px solid rgba(255,255,255,0.3); color:#ff5252; z-index:10; border-radius:6px;" onclick="event.stopPropagation(); removePhotoFromActiveAlbum('${photoId}')" title="Remove from album">🗑️</button>
              <div class="tree-hanging-rope"></div>
              <div class="tree-crystal-frame">
                ${p.mimeType?.startsWith('video/') ? `<video src="${url}" style="width:100%; height:100%; object-fit:cover;"></video>` : `<img src="${url}" alt="${p.originalName || 'Photo'}" />`}
                <div style="font-size:11px; font-weight:700; color:#00f5d4; margin-top:6px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${p.originalName || `Memory #${idx + 1}`}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (bottombar) {
    bottombar.innerHTML = `
      <div style="color:rgba(255,255,255,0.7); font-size:12px; font-weight:600;">
        🌿 Swaying Botanical Canopy • Scroll horizontally to explore all hanging memory crystal frames
      </div>
    `;
  }
}

// 3. 35mm Vintage Film Reel Stage Renderer
function renderFilmstripStage(photos) {
  const viewport = document.getElementById('album-stage-viewport');
  const bottombar = document.getElementById('album-stage-bottombar');
  if (!viewport) return;

  viewport.innerHTML = `
    <div class="filmstrip-stage">
      <div class="filmstrip-reel-track">
        ${photos.map((p, idx) => {
          const url = p.url || (p.id || p._id ? `${API_ORIGIN}/api/photos/file/${p.id || p._id}/medium` : '');
          const photoId = p.id || p._id;
          return `
            <div class="filmstrip-cell" onclick="openViewer('${photoId}')" style="position:relative;">
              <button class="btn-icon" style="position:absolute; top:8px; right:8px; width:24px; height:24px; font-size:11px; background:rgba(0,0,0,0.75); border:1px solid rgba(255,255,255,0.3); color:#ff5252; z-index:10; border-radius:6px;" onclick="event.stopPropagation(); removePhotoFromActiveAlbum('${photoId}')" title="Remove from album">🗑️</button>
              ${p.mimeType?.startsWith('video/') ? `<video src="${url}" style="width:100%; height:100%; object-fit:cover;"></video>` : `<img src="${url}" alt="${p.originalName || 'Reel Frame'}" />`}
              <div class="film-cell-stamp">
                <span>🎞️ KODAK 400</span>
                <span>FRAME #${idx + 1}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (bottombar) {
    bottombar.innerHTML = `
      <div style="color:#ffb703; font-size:12px; font-weight:700; font-family:monospace;">
        🎞️ 35mm VINTAGE CELLULOID REEL • Scroll horizontally through turning cinematic frames
      </div>
    `;
  }
}

// 4. Cosmic Galaxy Orbit Stage Renderer
function renderOrbitStage(photos) {
  const viewport = document.getElementById('album-stage-viewport');
  const bottombar = document.getElementById('album-stage-bottombar');
  if (!viewport) return;

  const orbitPhotos = photos.slice(0, 8); // Display up to 8 cards in 3D orbit
  const angleStep = 360 / Math.max(1, orbitPhotos.length);

  viewport.innerHTML = `
    <div class="orbit-stage">
      <div class="orbit-core-sun" title="Central Pulsar Core"></div>
      <div class="orbit-rotating-ring">
        ${orbitPhotos.map((p, idx) => {
          const url = p.url || (p.id || p._id ? `${API_ORIGIN}/api/photos/file/${p.id || p._id}/medium` : '');
          const photoId = p.id || p._id;
          const angle = idx * angleStep;
          const rad = (angle * Math.PI) / 180;
          const radius = 260; // orbit radius
          const x = Math.round(Math.cos(rad) * radius);
          const y = Math.round(Math.sin(rad) * radius);

          return `
            <div class="orbit-planet-node" style="left: calc(50% + ${x}px - 70px); top: calc(50% + ${y}px - 70px); position:absolute;" onclick="openViewer('${photoId}')" title="${p.originalName || 'Constellation'}">
              <button class="btn-icon" style="position:absolute; top:4px; right:4px; width:20px; height:20px; font-size:10px; background:rgba(0,0,0,0.8); border:1px solid rgba(255,255,255,0.3); color:#ff5252; z-index:10; border-radius:50%;" onclick="event.stopPropagation(); removePhotoFromActiveAlbum('${photoId}')" title="Remove from album">🗑️</button>
              ${p.mimeType?.startsWith('video/') ? `<video src="${url}" style="width:100%; height:100%; object-fit:cover;"></video>` : `<img src="${url}" alt="${p.originalName || 'Planet'}" />`}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (bottombar) {
    bottombar.innerHTML = `
      <div style="color:var(--accent-cyan); font-size:12px; font-weight:700;">
        🌌 3D COSMIC GALAXY ORBIT • Hover over any planetary node to pause orbit & zoom into stargaze memory
      </div>
    `;
  }
}

// 5. Vintage Polaroid Scrapbook Stage Renderer
function renderScrapbookStage(photos) {
  const viewport = document.getElementById('album-stage-viewport');
  const bottombar = document.getElementById('album-stage-bottombar');
  if (!viewport) return;

  const row1 = photos.slice(0, 4);
  const row2 = photos.slice(4, 8);

  viewport.innerHTML = `
    <div class="scrapbook-stage">
      <!-- Clothesline Row 1 -->
      <div class="scrapbook-line">
        ${row1.map((p, idx) => {
          const url = p.url || (p.id || p._id ? `${API_ORIGIN}/api/photos/file/${p.id || p._id}/medium` : '');
          const photoId = p.id || p._id;
          const tilt = (idx % 2 === 0) ? -4 : 3.5;
          return `
            <div class="scrapbook-polaroid" style="transform: rotate(${tilt}deg); position:relative;" onclick="openViewer('${photoId}')">
              <button class="btn-icon" style="position:absolute; top:6px; right:6px; width:22px; height:22px; font-size:10px; background:rgba(0,0,0,0.7); border:1px solid rgba(255,255,255,0.3); color:#ff5252; z-index:10; border-radius:6px;" onclick="event.stopPropagation(); removePhotoFromActiveAlbum('${photoId}')" title="Remove from album">🗑️</button>
              <div class="scrapbook-peg"></div>
              ${p.mimeType?.startsWith('video/') ? `<video src="${url}" style="width:100%; height:100%; object-fit:cover;"></video>` : `<img src="${url}" alt="${p.originalName || 'Polaroid'}" />`}
              <div style="font-family:'Courier New', monospace; font-size:11px; color:#222; font-weight:700; text-align:center; margin-top:6px;">
                ${p.originalName || `Polaroid #${idx + 1}`}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Clothesline Row 2 (if available) -->
      ${row2.length > 0 ? `
        <div class="scrapbook-line" style="margin-top:40px;">
          ${row2.map((p, idx) => {
            const url = p.url || (p.id || p._id ? `${API_ORIGIN}/api/photos/file/${p.id || p._id}/medium` : '');
            const photoId = p.id || p._id;
            const tilt = (idx % 2 === 0) ? 3 : -3.5;
            return `
              <div class="scrapbook-polaroid" style="transform: rotate(${tilt}deg); position:relative;" onclick="openViewer('${photoId}')">
                <button class="btn-icon" style="position:absolute; top:6px; right:6px; width:22px; height:22px; font-size:10px; background:rgba(0,0,0,0.7); border:1px solid rgba(255,255,255,0.3); color:#ff5252; z-index:10; border-radius:6px;" onclick="event.stopPropagation(); removePhotoFromActiveAlbum('${photoId}')" title="Remove from album">🗑️</button>
                <div class="scrapbook-peg"></div>
                ${p.mimeType?.startsWith('video/') ? `<video src="${url}" style="width:100%; height:100%; object-fit:cover;"></video>` : `<img src="${url}" alt="${p.originalName || 'Polaroid'}" />`}
                <div style="font-family:'Courier New', monospace; font-size:11px; color:#222; font-weight:700; text-align:center; margin-top:6px;">
                  ${p.originalName || `Polaroid #${idx + 5}`}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
  `;

  if (bottombar) {
    bottombar.innerHTML = `
      <div style="color:#d4a373; font-size:12px; font-weight:700;">
        📸 RUSTIC CLOTHESLINE SCRAPBOOK • Click any pinned polaroid to inspect in full HD
      </div>
    `;
  }
}

// 6. Royal Art Museum Gallery Stage Renderer
function renderMuseumStage(photos) {
  const viewport = document.getElementById('album-stage-viewport');
  const bottombar = document.getElementById('album-stage-bottombar');
  if (!viewport) return;

  viewport.innerHTML = `
    <div class="museum-stage">
      <div class="museum-gallery-wall">
        ${photos.map((p, idx) => {
          const url = p.url || (p.id || p._id ? `${API_ORIGIN}/api/photos/file/${p.id || p._id}/medium` : '');
          const photoId = p.id || p._id;
          return `
            <div class="museum-spotlight-beam" onclick="openViewer('${photoId}')" style="position:relative;">
              <button class="btn-icon" style="position:absolute; top:8px; right:8px; width:24px; height:24px; font-size:11px; background:rgba(0,0,0,0.8); border:1px solid rgba(255,255,255,0.3); color:#ff5252; z-index:10; border-radius:6px;" onclick="event.stopPropagation(); removePhotoFromActiveAlbum('${photoId}')" title="Remove from album">🗑️</button>
              <div class="museum-gold-frame">
                <img src="${url}" alt="${p.originalName || 'Exhibition Piece'}" />
              </div>
              <div class="museum-plaque">
                <div style="font-weight:700;">${p.originalName || `Masterpiece #${idx + 1}`}</div>
                <div style="font-size:10px; opacity:0.8;">Oil & Canvas • 2026 Collection</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (bottombar) {
    bottombar.innerHTML = `
      <div style="color:#ffd700; font-size:12px; font-weight:700; font-family:serif;">
        🏛️ ROYAL ART EXHIBITION • Scroll horizontally along the spotlight gallery wall to admire artworks
      </div>
    `;
  }
}

// Direct Album Photo Upload
function openUploadToActiveAlbum() {
  const input = document.getElementById('album-stage-photo-input');
  if (input) input.click();
}

async function handleDirectAlbumPhotoUpload(e) {
  const files = Array.from(e.target.files || []);
  if (files.length === 0 || !activeStageAlbum) return;

  showToast(`Uploading ${files.length} photo(s) to "${activeStageAlbum.name}"... ⏳`, 'info');

  try {
    const formData = new FormData();
    files.forEach(f => formData.append('photos', f));

    const res = await apiFetch(`/api/albums/${activeStageAlbum.id}/photos`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (res.ok && data.success && data.album) {
      activeStageAlbum = data.album;
      playSuccessSound();
      showToast(data.message || 'Photos added successfully! 📸', 'success');
      await loadAlbums();
      renderActiveStageStyle();
    } else {
      showToast(data.error?.message || 'Failed to upload photos to album', 'error');
    }
  } catch (err) {
    console.error('[Upload to Album Error]:', err);
    showToast('Network error while uploading to album.', 'error');
  }
}

// Automatic Slideshow Mode
function toggleAlbumSlideshow() {
  const btn = document.getElementById('stage-slideshow-btn');
  if (stageSlideshowTimer) {
    clearInterval(stageSlideshowTimer);
    stageSlideshowTimer = null;
    if (btn) btn.innerHTML = `<span>▶</span> <span>Slideshow</span>`;
    showToast('⏸ Slideshow paused', 'info');
  } else {
    showToast('▶ Auto Slideshow Started (3s interval)', 'success');
    if (btn) btn.innerHTML = `<span>⏸</span> <span>Pause</span>`;
    stageSlideshowTimer = setInterval(() => {
      if (activeStageAlbum?.style === 'flipbook') {
        flipBookNext();
      } else {
        const viewport = document.getElementById('album-stage-viewport');
        const scrollable = viewport?.querySelector('.filmstrip-reel-track, .tree-hanging-grid, .museum-stage');
        if (scrollable) {
          scrollable.scrollBy({ left: 300, behavior: 'smooth' });
          if (scrollable.scrollLeft + scrollable.clientWidth >= scrollable.scrollWidth - 10) {
            scrollable.scrollTo({ left: 0, behavior: 'smooth' });
          }
        }
      }
    }, 3500);
  }
}

// Download Active Album Photos
function downloadActiveAlbumPhotos() {
  if (!activeStageAlbum || !activeStageAlbum.photos || activeStageAlbum.photos.length === 0) {
    showToast('No photos in album to download.', 'warning');
    return;
  }
  showToast(`⬇ Downloading ${activeStageAlbum.photos.length} photos from "${activeStageAlbum.name}"...`, 'success');
  activeStageAlbum.photos.forEach((p, idx) => {
    setTimeout(() => {
      const url = p.url || p.localUrl;
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeStageAlbum.name}_${idx + 1}_${p.originalName || 'photo.jpg'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }, idx * 400);
  });
}

// System Health Indicators
async function loadSystemHealth() {
  try {
    const res = await fetch(`${API_ORIGIN}/api/admin/health`, { credentials: 'include' });
    const data = await res.json();
  } catch (e) {}
}

// Command Palette (Ctrl + K & Keyboard Navigation)
function setupCommandPalette() {
  const modal = document.getElementById('command-palette-modal');

  document.addEventListener('keydown', (e) => {
    // Open / Toggle Palette with Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleModal('command-palette-modal');
      return;
    }

    // Escape closes modals/viewers
    if (e.key === 'Escape') {
      closeViewer();
      closeModal('command-palette-modal');
      closeModal('upload-modal');
      closeModal('wallpaper-modal');
      closeModal('share-modal');
      closeModal('user-manager-modal');
      return;
    }

    // Photo viewer navigation
    if (document.getElementById('viewer-modal')?.classList.contains('active')) {
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
      return;
    }

    // Command palette active keyboard navigation (ArrowUp, ArrowDown, Enter)
    if (modal?.classList.contains('active')) {
      const visibleItems = Array.from(document.querySelectorAll('#cmd-list .cmd-item')).filter(
        item => item.style.display !== 'none'
      );
      if (visibleItems.length === 0) return;

      let activeIndex = visibleItems.findIndex(item => item.classList.contains('active-cmd'));

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeIndex >= 0) visibleItems[activeIndex].classList.remove('active-cmd');
        activeIndex = (activeIndex + 1) % visibleItems.length;
        visibleItems[activeIndex].classList.add('active-cmd');
        visibleItems[activeIndex].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeIndex >= 0) visibleItems[activeIndex].classList.remove('active-cmd');
        activeIndex = (activeIndex - 1 + visibleItems.length) % visibleItems.length;
        visibleItems[activeIndex].classList.add('active-cmd');
        visibleItems[activeIndex].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && visibleItems[activeIndex]) {
          visibleItems[activeIndex].click();
        } else if (visibleItems[0]) {
          visibleItems[0].click();
        }
      }
    }
  });
}

// ==========================================================================
// LUXURY THEME SWITCHER (SMOOTH TRANSITIONS & PERSISTENCE)
// ==========================================================================
// 5-MOOD LUXURY THEME SWITCHER (SMOOTH TRANSITIONS & PERSISTENCE)
// 1. 🌙 dark    - Classic Dark Cyber
// 2. 🌌 cyber   - Midnight Cyberpunk (AMOLED Tokyo Neon)
// 3. 🌅 sunset  - Royal Sunset (Rose Gold & Warm Plum)
// 4. 🌲 emerald - Nordic Emerald (Jade Aurora & Deep Pine)
// 5. 🌊 ocean   - Deep Sapphire Abyss (Bioluminescent Reef)
// 6. 🪐 galaxy  - Amethyst Nebula (Cosmic Stardust)
// 7. 👑 gold    - Luxury Obsidian & 24K Gold (Monaco VIP)
// 8. 🌸 sakura  - Tokyo Sakura Glow (Moonlit Cherry Blossom)
// 9. ☀️ light   - Clean Pro Light Studio
// ==========================================================================
const AVAILABLE_THEMES = [
  { id: 'dark', name: 'Dark Cyber 🌙', icon: '🌙', desc: 'Classic Deep Space' },
  { id: 'cyber', name: 'Midnight Cyberpunk 🌌', icon: '🌌', desc: 'AMOLED Neon & Laser Glow' },
  { id: 'sunset', name: 'Royal Sunset 🌅', icon: '🌅', desc: 'Rose Gold & Warm Plum' },
  { id: 'emerald', name: 'Nordic Emerald 🌲', icon: '🌲', desc: 'Jade Aurora & Deep Pine' },
  { id: 'ocean', name: 'Deep Sapphire Abyss 🌊', icon: '🌊', desc: 'Bioluminescent Azure Trench' },
  { id: 'galaxy', name: 'Amethyst Nebula 🪐', icon: '🪐', desc: 'Cosmic Stardust & Violet Quartz' },
  { id: 'gold', name: 'Luxury 24K Gold 👑', icon: '👑', desc: 'Monaco VIP Obsidian & Champagne' },
  { id: 'sakura', name: 'Tokyo Sakura Glow 🌸', icon: '🌸', desc: 'Moonlit Cherry Blossom & Rose' },
  { id: 'light', name: 'Clean Pro Light ☀️', icon: '☀️', desc: 'Modern Studio Cloud' }
];

function setTheme(targetTheme) {
  const root = document.documentElement;
  const themeObj = AVAILABLE_THEMES.find(t => t.id === targetTheme) || AVAILABLE_THEMES[0];
  
  root.classList.add('theme-transition');
  root.setAttribute('data-theme', themeObj.id);
  localStorage.setItem('preferred_theme', themeObj.id);

  // Animate toggle button icon
  const themeBtns = document.querySelectorAll('.theme-toggle-btn, [onclick="toggleTheme()"]');
  themeBtns.forEach(btn => {
    btn.classList.add('theme-toggle-animated');
    btn.innerText = themeObj.icon;
    setTimeout(() => btn.classList.remove('theme-toggle-animated'), 600);
  });

  playNavSound();
  showToast(`${themeObj.icon} Switched to ${themeObj.name}! ✨`, 'info');

  setTimeout(() => {
    root.classList.remove('theme-transition');
  }, 500);
}

function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme') || 'dark';
  const currentIndex = AVAILABLE_THEMES.findIndex(t => t.id === current);
  const nextIndex = (currentIndex + 1) % AVAILABLE_THEMES.length;
  setTheme(AVAILABLE_THEMES[nextIndex].id);
}

// Initialize saved theme
(function initTheme() {
  const saved = localStorage.getItem('preferred_theme') || 'dark';
  if (AVAILABLE_THEMES.some(t => t.id === saved)) {
    document.documentElement.setAttribute('data-theme', saved);
    const themeObj = AVAILABLE_THEMES.find(t => t.id === saved);
    const themeBtns = document.querySelectorAll('.theme-toggle-btn, [onclick="toggleTheme()"]');
    themeBtns.forEach(btn => {
      if (themeObj) btn.innerText = themeObj.icon;
    });
  }
})();

// ==========================================================================
// CONTEXT-AWARE SMART SEARCH ENGINE (PROFILES ON DASHBOARD / PHOTOS IN GALLERY / SONGS IN MUSIC)
// ==========================================================================
let searchDebounceTimer = null;
let cachedMembersList = [];

function updateSearchPlaceholderForView(viewName) {
  const searchInput = document.getElementById('global-search-input');
  const searchIcon = document.getElementById('search-box-icon');
  if (!searchInput) return;

  if (viewName === 'dashboard') {
    if (searchIcon) searchIcon.innerText = '👤';
    searchInput.placeholder = '🔍 Search member profiles (e.g. @Sumana, @Soumya)...';
  } else if (viewName === 'music') {
    if (searchIcon) searchIcon.innerText = '🎵';
    searchInput.placeholder = '🔍 Search songs by title, artist, genre...';
  } else if (viewName === 'albums') {
    if (searchIcon) searchIcon.innerText = '📁';
    searchInput.placeholder = '🔍 Search albums & collections...';
  } else if (viewName === 'profile-hub') {
    if (searchIcon) searchIcon.innerText = '🖼️';
    searchInput.placeholder = `🔍 Search @${activeProfileUsername}'s memories...`;
  } else {
    // Photos views (all, recent, favorites, videos, trash)
    if (searchIcon) searchIcon.innerText = '📸';
    searchInput.placeholder = '🔍 Search photos by name, place, camera, tag...';
  }
}

function clearGlobalSearch() {
  const searchInput = document.getElementById('global-search-input');
  const clearBtn = document.getElementById('search-clear-btn');
  const dropdown = document.getElementById('search-dropdown-results');
  if (searchInput) searchInput.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  if (dropdown) {
    dropdown.innerHTML = '';
    dropdown.style.display = 'none';
  }

  if (currentView === 'music') {
    if (typeof renderMusicVault === 'function') renderMusicVault();
  } else if (currentView === 'albums') {
    loadAlbums();
  } else if (currentView === 'profile-hub') {
    if (currentProfileData) renderProfileUploadsGrid(currentProfileData.photos || []);
  } else {
    loadGallery(currentView);
  }
}

async function handleGlobalSearch(query) {
  const clearBtn = document.getElementById('search-clear-btn');
  const dropdown = document.getElementById('search-dropdown-results');
  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

  if (!query || !query.trim()) {
    if (dropdown) {
      dropdown.innerHTML = '';
      dropdown.style.display = 'none';
    }
    if (currentView === 'music') {
      if (typeof renderMusicVault === 'function') renderMusicVault();
    } else if (currentView === 'albums') {
      loadAlbums();
    } else if (currentView === 'profile-hub') {
      if (currentProfileData) renderProfileUploadsGrid(currentProfileData.photos || []);
    } else {
      loadGallery(currentView);
    }
    return;
  }

  const q = query.trim().toLowerCase();

  // In Gallery/Photos views: filter the grid live
  if (currentView !== 'dashboard' && currentView !== 'music' && currentView !== 'albums' && currentView !== 'profile-hub') {
    loadGallery(currentView);
  } else if (currentView === 'profile-hub') {
    const userPhotos = currentProfileData?.photos || [];
    const filtered = userPhotos.filter(p => 
      (p.originalName || '').toLowerCase().includes(q) ||
      (p.exif?.locationName || '').toLowerCase().includes(q) ||
      (p.exif?.camera || '').toLowerCase().includes(q)
    );
    renderProfileUploadsGrid(filtered);
  }

  // Render contextual live dropdown
  await renderLiveSearchDropdown(q);
}

async function renderLiveSearchDropdown(query) {
  const dropdown = document.getElementById('search-dropdown-results');
  if (!dropdown) return;

  // Fetch or use cached members
  try {
    if (!cachedMembersList || cachedMembersList.length === 0) {
      const res = await apiFetch('/api/photos/members');
      const data = await res.json();
      if (data.success && data.members) cachedMembersList = data.members;
    }
  } catch (e) {}

  // 1. Matched Profiles (Respecting Privacy: Public accounts + Soumya sees all + Self)
  const matchedMembers = (cachedMembersList || []).filter(m => {
    const u = (m.username || '').toLowerCase();
    const d = (m.displayName || '').toLowerCase();
    return u.includes(query) || d.includes(query);
  });

  // 2. Matched Photos (Current View / Library)
  const matchedPhotos = (currentPhotos || []).filter(p => {
    const orig = (p.originalName || '').toLowerCase();
    const loc = (p.exif?.locationName || '').toLowerCase();
    const cam = (p.exif?.camera || '').toLowerCase();
    const uploader = (p.uploadedBy?.displayName || p.uploadedBy?.username || '').toLowerCase();
    return orig.includes(query) || loc.includes(query) || cam.includes(query) || uploader.includes(query);
  }).slice(0, 5);

  let html = '';

  // Priority 1 on Dashboard: Profiles First!
  if (currentView === 'dashboard' || matchedMembers.length > 0) {
    if (matchedMembers.length > 0) {
      html += `<div class="search-result-group-title"><span>👤</span> <span>Member Profiles (${matchedMembers.length})</span></div>`;
      html += matchedMembers.map(m => {
        const isSelf = (currentUser && currentUser.username.toLowerCase() === m.username.toLowerCase());
        const isSoumya = (m.username.toLowerCase() === 'soumya');
        const isSumana = (m.username.toLowerCase() === 'sumana' || m.username.toLowerCase() === 'sumona');
        const icon = isSoumya ? '👑' : (isSumana ? '👩‍🦰' : (m.avatar || '👤'));
        const badge = isSoumya ? 'Head Admin' : (isSumana ? 'Protected VIP' : 'Member');

        return `
          <div class="search-result-item" onclick="clearGlobalSearch(); openProfileHub('${m.username}')" title="Open @${m.username}'s Profile Hub">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="search-result-thumb">${icon}</div>
              <div>
                <div style="font-weight:700; font-size:13px; color:#fff;">${m.displayName || m.username} ${isSelf ? '<span style="color:var(--accent-cyan); font-size:11px;">(You)</span>' : ''}</div>
                <div style="font-size:11px; color:var(--text-muted);">@${m.username} • <span style="color:var(--accent-purple);">${badge}</span> • ${m.count || 0} photos</div>
              </div>
            </div>
            <span class="genre-tag romantic" style="font-size:10px;">View Hub ➔</span>
          </div>
        `;
      }).join('');
    }
  }

  // Photos Matching Section (Always show if matched)
  if (matchedPhotos.length > 0) {
    html += `<div class="search-result-group-title" style="margin-top:6px;"><span>📸</span> <span>Photos & Memories (${matchedPhotos.length})</span></div>`;
    html += matchedPhotos.map(p => {
      const photoId = p._id || p.id;
      const thumbSrc = `${API_ORIGIN}/api/photos/file/${photoId}/thumbnail`;
      const name = p.originalName || 'Photo';
      const uploader = p.uploadedBy?.displayName || p.uploadedBy?.username || 'Member';
      const realIdx = currentPhotos.findIndex(cp => (cp._id === photoId || cp.id === photoId));

      return `
        <div class="search-result-item" onclick="clearGlobalSearch(); openViewer(${realIdx >= 0 ? realIdx : 0})" title="View memory: ${name}">
          <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
            <img src="${thumbSrc}" class="search-result-thumb" alt="Preview" />
            <div style="overflow:hidden;">
              <div style="font-weight:700; font-size:12px; color:#fff; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${name}</div>
              <div style="font-size:11px; color:var(--text-muted);">Uploaded by ${uploader}</div>
            </div>
          </div>
          <span class="genre-tag enjoyful" style="font-size:10px; flex-shrink:0;">Open 🔍</span>
        </div>
      `;
    }).join('');
  }

  if (!html) {
    html = `
      <div style="padding:16px; text-align:center; color:var(--text-muted); font-size:12px;">
        <div style="font-size:24px; margin-bottom:4px;">🔍</div>
        <div>No matching ${currentView === 'dashboard' ? 'profiles' : 'photos'} found for "${query}"</div>
      </div>
    `;
  }

  dropdown.innerHTML = html;
  dropdown.style.display = 'flex';
}

function setupGlobalListeners() {
  const searchInput = document.getElementById('global-search-input');
  
  searchInput?.addEventListener('input', (e) => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      handleGlobalSearch(e.target.value);
    }, 180);
  });

  searchInput?.addEventListener('focus', (e) => {
    if (e.target.value.trim()) {
      handleGlobalSearch(e.target.value);
    }
  });

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const firstItem = document.querySelector('.search-result-item');
      if (firstItem) firstItem.click();
    } else if (e.key === 'Escape') {
      clearGlobalSearch();
    }
  });

  // Dismiss search dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const searchWrap = document.getElementById('global-search-box-wrap');
    const dropdown = document.getElementById('search-dropdown-results');
    if (searchWrap && dropdown && !searchWrap.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

let currentUploadModalMode = 'all'; // 'all' or 'video'

function openModal(id, mode = null) {
  if (typeof toggleSidebar === 'function') toggleSidebar(false);
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('active');

  if (id === 'upload-modal') {
    currentUploadModalMode = (mode === 'video' || currentView === 'videos') ? 'video' : 'all';

    const userSpan = document.getElementById('upload-user-name');
    const avatarSpan = document.getElementById('upload-user-avatar');
    if (userSpan) userSpan.innerText = currentUser?.displayName || currentUser?.username || 'Soumya';
    if (avatarSpan) avatarSpan.innerText = (currentUser?.username?.toLowerCase() === 'soumya' ? '👑' : (currentUser?.avatar || '👤'));

    const modalTitle = document.getElementById('upload-modal-title');
    const dropzoneIcon = document.getElementById('upload-dropzone-icon');
    const dropzoneTitle = document.getElementById('upload-dropzone-title');
    const dropzoneSub = document.getElementById('upload-dropzone-sub');
    const browseBtn = document.getElementById('browse-files-btn');
    const fileInput = document.getElementById('file-input-element');

    if (currentUploadModalMode === 'video') {
      if (modalTitle) modalTitle.innerHTML = '<span>🎬</span> <span>Upload Video to Video Vault</span>';
      if (dropzoneIcon) dropzoneIcon.innerText = '📹';
      if (dropzoneTitle) dropzoneTitle.innerText = 'Click or Drag & Drop Video Files 🎬';
      if (dropzoneSub) dropzoneSub.innerText = 'Supports MP4, MOV, WEBM, MKV, AVI — Maximum 30 MB per video';
      if (browseBtn) browseBtn.innerHTML = '<span>🎬</span> <span>Browse Device Videos (Max 30 MB)</span>';
      if (fileInput) fileInput.setAttribute('accept', 'video/*,video/mp4,video/webm,video/quicktime,video/mkv,video/x-matroska,video/avi');
    } else {
      if (modalTitle) modalTitle.innerHTML = '<span>📸</span> <span>Upload Memories to Vault</span>';
      if (dropzoneIcon) dropzoneIcon.innerText = '📂';
      if (dropzoneTitle) dropzoneTitle.innerText = 'Click or Drag & Drop Photos / Videos';
      if (dropzoneSub) dropzoneSub.innerText = 'Supports JPG, PNG, WEBP, GIF, HEIC, MP4, MOV (Videos max 30 MB)';
      if (browseBtn) browseBtn.innerHTML = '<span>📁</span> <span>Browse Device Files</span>';
      if (fileInput) fileInput.setAttribute('accept', 'image/*,video/*');
    }
  } else if (id === 'command-palette-modal') {
    setTimeout(() => {
      const input = document.getElementById('cmd-search-input');
      if (input) {
        input.value = '';
        input.focus();
        filterCommands('');
      }
    }, 50);
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('active');

  if (id === 'command-palette-modal') {
    const inp = document.getElementById('cmd-search-input');
    if (inp) { inp.value = ''; filterCommands(''); }
  }
}

function toggleModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (modal.classList.contains('active')) {
    closeModal(id);
  } else {
    openModal(id);
  }
}

// Command Palette live search filter
function filterCommands(query) {
  const q = (query || '').toLowerCase().trim();
  const items = Array.from(document.querySelectorAll('#cmd-list .cmd-item'));
  let firstFound = false;

  items.forEach(item => {
    const title = (item.getAttribute('data-cmd-title') || '').toLowerCase();
    const text = (item.innerText || '').toLowerCase();
    const matches = !q || title.includes(q) || text.includes(q);
    item.style.display = matches ? 'flex' : 'none';
    item.classList.remove('active-cmd');

    if (matches && !firstFound) {
      item.classList.add('active-cmd');
      firstFound = true;
    }
  });
}

// ==========================================================================
// MUSIC VAULT ENGINE
// ==========================================================================
let musicTracks = [];
let currentTrackIndex = -1;
let isPlayingMusic = false;
const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
let currentSpeedIndex = 2; // default 1.0x

async function loadMusicList() {
  try {
    const res = await fetch(`${API_ORIGIN}/api/music`, { credentials: 'include' });
    const data = await res.json();
    if (data.success && data.tracks) {
      musicTracks = data.tracks;
      
      const countEl = document.getElementById('widget-music-count');
      if (countEl) countEl.innerText = `${musicTracks.length} Tracks Ready`;

      setupAudioListeners();
      renderMusicVault();
    }
  } catch (err) {
    console.warn('[Music] Failed to load tracks:', err);
  }
}

function setupAudioListeners() {
  const audio = document.getElementById('global-audio-element');
  if (!audio) return;

  audio.addEventListener('play', () => {
    isPlayingMusic = true;
    highlightPlayingCard();
  });

  audio.addEventListener('pause', () => {
    isPlayingMusic = false;
    highlightPlayingCard();
  });

  audio.addEventListener('ended', () => {
    isPlayingMusic = false;
    highlightPlayingCard();
    if (musicTracks.length > 0) {
      const nextIdx = (currentTrackIndex + 1) % musicTracks.length;
      playTrack(nextIdx);
    }
  });

  audio.addEventListener('error', (e) => {
    console.warn('[Audio] Streaming error:', e);
    showToast('Unable to stream track audio.', 'error');
  });
}

function playTrack(index) {
  if (index < 0 || index >= musicTracks.length) return;
  const audio = document.getElementById('global-audio-element');
  if (!audio) return;

  const track = musicTracks[index];

  // Toggle Pause if same track clicked
  if (currentTrackIndex === index) {
    if (!audio.paused) {
      audio.pause();
      isPlayingMusic = false;
      highlightPlayingCard();
      showToast(`Paused: ${track.title} ⏸`, 'info');
      return;
    } else {
      audio.play()
        .then(() => {
          isPlayingMusic = true;
          highlightPlayingCard();
          showToast(`Playing: ${track.title} 🎵`, 'success');
        })
        .catch(err => {
          console.warn('[Audio Resume Error]:', err);
        });
      return;
    }
  }

  // Load and play new track synchronously in user gesture
  currentTrackIndex = index;
  audio.src = `${API_ORIGIN}${track.url}`;
  audio.playbackRate = speedOptions[currentSpeedIndex];

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        isPlayingMusic = true;
        highlightPlayingCard();
        showToast(`Now Playing: ${track.title} 🎵 (${track.genre})`, 'success');
      })
      .catch((err) => {
        console.warn('[Audio Play Error]:', err);
        showToast(`Click play again to start ${track.title}`, 'info');
      });
  }
}

// Speed Increase (+) or Decrease (-)
function changeSpeed(delta, event) {
  if (event) event.stopPropagation();
  const audio = document.getElementById('global-audio-element');
  
  currentSpeedIndex = Math.max(0, Math.min(speedOptions.length - 1, currentSpeedIndex + delta));
  const newSpeed = speedOptions[currentSpeedIndex];
  
  if (audio) {
    audio.playbackRate = newSpeed;
  }
  
  showToast(`Playback Speed: ${newSpeed}x ⚡`, 'info');
  updateAllSpeedBadges();
}

function updateAllSpeedBadges() {
  const currentSpeed = speedOptions[currentSpeedIndex];
  document.querySelectorAll('.speed-badge-text').forEach(el => {
    el.innerText = `${currentSpeed}x`;
  });
}

// Download Audio Track MP3
function downloadTrack(idx, event) {
  if (event) event.stopPropagation();
  if (idx < 0 || idx >= musicTracks.length) return;
  const track = musicTracks[idx];
  
  const a = document.createElement('a');
  a.href = `${API_ORIGIN}${track.downloadUrl}`;
  a.download = `${track.title}.mp3`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`Downloading "${track.title}" ⬇️`, 'success');
}

// ==========================================================================
// COMMUNITY MUSIC UPLOADER & MODAL HANDLER
// ==========================================================================
let selectedMusicAudioFile = null;

function openAddMusicModal() {
  const modal = document.getElementById('add-music-modal');
  if (!modal) return;

  const uploaderTag = document.getElementById('music-uploader-tag');
  if (uploaderTag) {
    const currentName = currentUser?.displayName || currentUser?.username || 'Community';
    uploaderTag.innerText = `(@${currentName})`;
  }

  // Reset form
  const form = document.getElementById('add-music-form');
  if (form) form.reset();
  selectedMusicAudioFile = null;

  const dropLabel = document.getElementById('music-dropzone-label');
  const dropIcon = document.getElementById('music-dropzone-icon');
  if (dropLabel) dropLabel.innerText = 'Click or Drag & Drop audio file here';
  if (dropIcon) dropIcon.innerText = '📁';

  modal.classList.add('active');
  playNavSound();
}

function handleMusicFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  selectedMusicAudioFile = file;

  const dropLabel = document.getElementById('music-dropzone-label');
  const dropIcon = document.getElementById('music-dropzone-icon');
  if (dropLabel) dropLabel.innerHTML = `<strong>Selected:</strong> ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB) ✅`;
  if (dropIcon) dropIcon.innerText = '🎵';

  // --- AI Audio Analyzer & Auto-Arranger ---
  let rawName = file.name.replace(/\.[^/.]+$/, '').trim();

  // Strip common noisy download tags
  rawName = rawName
    .replace(/^WhatsApp Audio \d{4}-\d{2}-\d{2} at [\d.]+ [AP]M/i, 'Voice Memory')
    .replace(/^(yt1s\.com|pagalworld|mr-jatt|djmaza|spotifydown|y2mate)[\s\-_]+/i, '')
    .replace(/\[?(?:320kbps|128kbps|official video|official audio|lyrics|full song|hq|remastered)\]?/gi, '')
    .replace(/\(?(?:official video|official audio|lyrics|full song|hq|remastered|video)\)?/gi, '')
    .replace(/[_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let detectedArtist = '';
  let detectedTitle = rawName;

  if (detectedTitle.includes(' - ')) {
    const parts = detectedTitle.split(' - ');
    if (parts.length >= 2) {
      detectedArtist = parts[0].trim();
      detectedTitle = parts.slice(1).join(' - ').trim();
    }
  }

  detectedTitle = detectedTitle.charAt(0).toUpperCase() + detectedTitle.slice(1);
  if (!detectedArtist) detectedArtist = currentUser?.displayName || currentUser?.username || 'Community Artist';

  // Keyword-based Genre & Mood Detection
  const combined = `${detectedTitle} ${detectedArtist}`.toLowerCase();
  let genreVal = 'Romantic Song|💖';
  let genreName = 'Romantic Song';
  let emoji = '💖';
  let genreClass = 'romantic';

  if (/(sad|kanna|dukkho|channa|khairiyat|tears|alone|breakup|judai|dard|heartbreak)/i.test(combined)) {
    genreVal = 'Sad Song|🌧️';
    genreName = 'Sad Song';
    emoji = '🌧️';
    genreClass = 'sad';
  } else if (/(party|dance|ghungroo|dhamaka|nacho|beats|dj|enjoyful|pasoori|masti)/i.test(combined)) {
    genreVal = 'Enjoyful Song|🎉';
    genreName = 'Enjoyful Song';
    emoji = '🎉';
    genreClass = 'enjoyful';
  } else if (/(devotional|bhajan|saraswati|rabindra|geet|om|shiva|krishna|prayer|divine|puja)/i.test(combined)) {
    genreVal = 'Devotional Song|🕊️';
    genreName = 'Devotional Song';
    emoji = '🕊️';
    genreClass = 'happy';
  } else if (/(lofi|lo-fi|chill|sleep|night|rain|acoustic|guitar|relax|peace)/i.test(combined)) {
    genreVal = 'Lo-Fi & Chill|🎧';
    genreName = 'Lo-Fi & Chill';
    emoji = '🎧';
    genreClass = 'romantic';
  } else if (/(rock|pop|energetic|fast|rap|hiphop)/i.test(combined)) {
    genreVal = 'Rock & Pop|⚡';
    genreName = 'Rock & Pop';
    emoji = '⚡';
    genreClass = 'enjoyful';
  }

  const titleInput = document.getElementById('music-input-title');
  const artistInput = document.getElementById('music-input-artist');
  const genreSelect = document.getElementById('music-input-genre');
  const descInput = document.getElementById('music-input-desc');

  if (titleInput) titleInput.value = detectedTitle;
  if (artistInput) artistInput.value = detectedArtist;
  if (genreSelect) genreSelect.value = genreVal;
  if (descInput && !descInput.value) {
    descInput.value = `${genreName} by ${detectedArtist}`;
  }

  // Update Live AI Preview Box
  const previewBox = document.getElementById('music-ai-preview-box');
  const previewTitle = document.getElementById('preview-music-title');
  const previewArtist = document.getElementById('preview-music-artist');
  const previewGenre = document.getElementById('preview-music-genre');
  const previewIcon = document.getElementById('preview-music-icon');

  if (previewBox) previewBox.style.display = 'block';
  if (previewTitle) previewTitle.innerText = detectedTitle;
  if (previewArtist) previewArtist.innerText = detectedArtist;
  if (previewIcon) previewIcon.innerText = emoji;
  if (previewGenre) {
    previewGenre.className = `genre-tag ${genreClass}`;
    previewGenre.innerText = `${genreName} ${emoji}`;
  }
}

async function handleAddMusicSubmit(event) {
  event.preventDefault();
  if (!selectedMusicAudioFile) {
    showToast('Please choose an audio file to upload!', 'warning');
    return;
  }

  const title = document.getElementById('music-input-title')?.value.trim();
  const artist = document.getElementById('music-input-artist')?.value.trim() || 'Unknown Artist';
  const genreRaw = document.getElementById('music-input-genre')?.value || 'Romantic Song|💖';
  const [genre, emoji] = genreRaw.split('|');
  const desc = document.getElementById('music-input-desc')?.value.trim() || '';

  const submitBtn = document.getElementById('music-submit-btn');
  const originalHtml = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳</span> <span>Analyzing & Arranging Audio...</span>`;
  }

  try {
    const formData = new FormData();
    formData.append('audioFile', selectedMusicAudioFile);
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('genre', genre);
    formData.append('emoji', emoji);
    formData.append('description', desc);

    const res = await apiFetch('/api/music/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (res.ok && data.success) {
      playSuccessSound();
      showToast(`🎵 "${title}" analyzed & arranged into Music Vault!`, 'success');
      closeModal('add-music-modal');
      await loadMusicList();
      if (currentView !== 'music') {
        switchView('music', 'Music Vault 🎵');
      }
    } else {
      showToast(data.error?.message || data.error || 'Failed to upload song', 'error');
    }
  } catch (err) {
    console.error('[Add Music Error]:', err);
    showToast('Network error while uploading audio.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    }
  }
}

// Delete Track (Strictly Authorized for Soumya Only)
async function deleteMusicTrack(trackId, title) {
  const isSoumya = (currentUser?.username?.toLowerCase() === 'soumya' || currentUser?.role === 'HEAD_ADMIN');
  if (!isSoumya) {
    showToast('🚫 Authority Error: Only Soumya can delete music tracks.', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to permanently delete "${title}" from the Music Vault?`)) {
    return;
  }

  try {
    const res = await apiFetch(`/api/music/${trackId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`🗑️ "${title}" deleted successfully by Soumya!`, 'info');
      // If currently playing this deleted track, stop audio
      const audio = document.getElementById('global-audio-element');
      if (audio && currentTrackIndex >= 0 && musicTracks[currentTrackIndex]?.id === trackId) {
        audio.pause();
        audio.src = '';
        isPlayingMusic = false;
      }
      await loadMusicList();
    } else {
      showToast(data.error?.message || data.error || 'Failed to delete track', 'error');
    }
  } catch (err) {
    console.error('[Delete Track Error]:', err);
    showToast('Error deleting music track.', 'error');
  }
}

function renderMusicVault() {
  const container = document.getElementById('music-list');
  if (!container) return;

  if (musicTracks.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 0; color:var(--text-muted);">
        <p style="font-size:32px; margin-bottom:8px;">🎵</p>
        <p style="font-weight:700;">No tracks found in Music Vault.</p>
        <button class="btn-primary-3d" onclick="openAddMusicModal()" style="margin-top:12px; display:inline-flex; align-items:center; gap:6px;">
          <span>➕</span> <span>Upload First Track</span>
        </button>
      </div>
    `;
    return;
  }

  const currentSpeed = speedOptions[currentSpeedIndex];
  const isSoumya = (currentUser?.username?.toLowerCase() === 'soumya' || currentUser?.role === 'HEAD_ADMIN');

  container.innerHTML = musicTracks.map((track, idx) => {
    const isThisPlaying = (currentTrackIndex === idx && isPlayingMusic);
    let genreClass = 'romantic';
    const gLower = (track.genre || '').toLowerCase();
    if (gLower.includes('sad')) genreClass = 'sad';
    else if (gLower.includes('enjoyful') || gLower.includes('dance') || gLower.includes('party')) genreClass = 'enjoyful';
    else if (gLower.includes('devotional') || gLower.includes('chill') || gLower.includes('happy')) genreClass = 'happy';

    const uploader = track.addedBy || { username: 'Community', displayName: 'Community', avatar: '🎵' };
    const uploaderAvatar = uploader.avatar || (uploader.username?.toLowerCase() === 'soumya' ? '👑' : '👤');

    return `
      <div class="music-card ${isThisPlaying ? 'playing' : ''}">
        <!-- Left: Note Icon & Details -->
        <div style="display:flex; align-items:center; gap:16px; flex:1; min-width:0;">
          <div class="music-note-icon" style="position:relative;">
            ${isThisPlaying ? '🎶' : (track.emoji || '🎵')}
            ${isThisPlaying ? `
              <div class="playing-equalizer-bars" style="position:absolute; bottom:2px; display:flex; gap:2px; height:12px; align-items:flex-end;">
                <span class="eq-bar bar1"></span>
                <span class="eq-bar bar2"></span>
                <span class="eq-bar bar3"></span>
              </div>
            ` : ''}
          </div>
          <div style="min-width:0; flex:1;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-weight:800; font-size:16px; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${track.title}
              </span>
              ${track.artist ? `<span style="font-size:12px; color:var(--text-secondary); font-weight:600;">— ${track.artist}</span>` : ''}
            </div>

            <!-- Tags & Genre Row -->
            <div style="display:flex; align-items:center; gap:8px; margin-top:4px; flex-wrap:wrap;">
              <span class="genre-tag ${genreClass}">${track.genre} ${track.emoji || '🎵'}</span>
            </div>

            ${(track.description && !track.description.startsWith('/api') && !track.description.includes('@') && !track.description.includes('comm_')) ? `
              <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">${track.description}</div>
            ` : ''}
          </div>
        </div>

        <!-- Right: Speed Controller, Download, Delete (Soumya Only) & Play/Pause Buttons -->
        <div class="music-card-actions">
          <!-- Speed Controller (Minus / Speed / Plus) -->
          <div class="speed-pill-group" title="Speed Control (Decrease / Increase)">
            <button class="speed-btn-step" onclick="changeSpeed(-1, event)" title="Decrease Speed (-)">−</button>
            <span class="speed-badge-text">${currentSpeed}x</span>
            <button class="speed-btn-step" onclick="changeSpeed(1, event)" title="Increase Speed (+)">+</button>
          </div>

          <!-- Download Button -->
          <button class="btn-music-download" title="Download ${track.title} Audio" onclick="downloadTrack(${idx}, event)">
            <span>⬇️</span> <span>Download</span>
          </button>

          <!-- Delete Button (Strictly Authorized for Soumya Only) -->
          ${(isSoumya && track.isCommunity) ? `
            <button class="btn-icon" style="width:34px; height:34px; font-size:13px; background:rgba(255,23,68,0.18); border:1px solid rgba(255,23,68,0.45); color:#ff1744; border-radius:10px; transition:all 0.2s;" 
              onclick="event.stopPropagation(); deleteMusicTrack('${track.id}', '${(track.title || 'Track').replace(/'/g, "\\'")}')" 
              title="Delete Song (Soumya Head Admin Authority)">
              🗑️
            </button>
          ` : ''}

          <!-- Play / Pause Button -->
          <button class="btn-music-play"
            style="background:${isThisPlaying ? 'var(--status-danger)' : 'var(--accent-gradient)'}; color:#fff;"
            title="${isThisPlaying ? 'Pause' : 'Play'}"
            onclick="playTrack(${idx})">
            ${isThisPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function highlightPlayingCard() {
  if (currentView === 'music' || currentView === 'dashboard') {
    renderMusicVault();
  }
}

// ==========================================================================
// AI CLOUD ASSISTANT & KNOWLEDGE CHATBOT CONTROLLER
// ==========================================================================
let isAiChatOpen = false;

function toggleChatbot() {
  if (isAiChatOpen) closeChatbot();
  else openChatbot();
}

function openChatbot() {
  const win = document.getElementById('ai-chat-window');
  if (!win) return;
  win.classList.add('active');
  isAiChatOpen = true;
  playModalOpenSound();

  const input = document.getElementById('ai-chat-input');
  if (input) setTimeout(() => input.focus(), 150);
}

function closeChatbot() {
  const win = document.getElementById('ai-chat-window');
  if (!win) return;
  win.classList.remove('active');
  isAiChatOpen = false;
  playModalCloseSound();
}

function clearChatHistory(silent = false) {
  const body = document.getElementById('ai-messages-body');
  if (!body) return;
  body.innerHTML = `
    <div class="ai-msg-row bot">
      <div class="ai-msg-avatar">🤖</div>
      <div class="ai-msg-bubble">
        <p>Chat cleared! ✨ How can I assist you with your Private Photo Cloud today?</p>
        <div class="ai-quick-actions">
          <button type="button" class="ai-action-btn" onclick="executeAiAction('open_upload')">➕ Upload Photo</button>
          <button type="button" class="ai-action-btn" onclick="executeAiAction('open_music')">🎵 Music Vault</button>
        </div>
      </div>
    </div>
  `;
  if (!silent) {
    showToast('Chat history cleared.', 'info');
  }
}

function handleAiChatSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('ai-chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  askAiQuestion(text);
}

async function askAiQuestion(questionText) {
  if (!questionText || !questionText.trim()) return;

  if (!isAiChatOpen) openChatbot();

  appendUserMessage(questionText);
  showAiTyping();

  try {
    const res = await fetch(`${API_ORIGIN}/api/chatbot/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ question: questionText })
    });
    const data = await res.json();
    hideAiTyping();

    if (data.success && data.answer) {
      appendBotMessage(data.answer, data.action);
    } else {
      appendBotMessage('I am here to help! Could you please ask again or choose one of the suggestions above?');
    }
  } catch (err) {
    hideAiTyping();
    appendBotMessage('Sorry, I encountered a temporary connection glitch. Please try again!');
  }
}

function appendUserMessage(text) {
  const body = document.getElementById('ai-messages-body');
  if (!body) return;

  const row = document.createElement('div');
  row.className = 'ai-msg-row user';
  row.innerHTML = `
    <div class="ai-msg-avatar">${currentUser?.customAvatarUrl ? `<img src="${API_ORIGIN}${currentUser.customAvatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />` : (currentUser?.avatar || '👤')}</div>
    <div class="ai-msg-bubble">
      ${escapeHtml(text)}
    </div>
  `;
  body.appendChild(row);
  body.scrollTop = body.scrollHeight;
  playClickSound();
}

function appendBotMessage(text, action = null) {
  const body = document.getElementById('ai-messages-body');
  if (!body) return;

  // Format line breaks and bold tags
  let formattedHtml = escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  const row = document.createElement('div');
  row.className = 'ai-msg-row bot';

  let actionBtnHtml = '';
  if (action && action.action && action.text) {
    actionBtnHtml = `
      <div class="ai-quick-actions">
        <button type="button" class="ai-action-btn" onclick="executeAiAction('${action.action}')">
          ${escapeHtml(action.text)}
        </button>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="ai-msg-avatar">🤖</div>
    <div class="ai-msg-bubble">
      <div>${formattedHtml}</div>
      ${actionBtnHtml}
    </div>
  `;

  body.appendChild(row);
  body.scrollTop = body.scrollHeight;
  playSuccessSound();
}

function showAiTyping() {
  hideAiTyping();
  const body = document.getElementById('ai-messages-body');
  if (!body) return;

  const row = document.createElement('div');
  row.className = 'ai-msg-row bot';
  row.id = 'ai-typing-indicator-row';
  row.innerHTML = `
    <div class="ai-msg-avatar">🤖</div>
    <div class="ai-typing-indicator">
      <div class="ai-typing-dot"></div>
      <div class="ai-typing-dot"></div>
      <div class="ai-typing-dot"></div>
    </div>
  `;
  body.appendChild(row);
  body.scrollTop = body.scrollHeight;
}

function hideAiTyping() {
  const el = document.getElementById('ai-typing-indicator-row');
  if (el) el.remove();
}

function executeAiAction(actionName) {
  playClickSound();
  closeChatbot();

  switch (actionName) {
    case 'open_upload':
      openModal('upload-modal');
      break;
    case 'open_music':
      switchView('music', 'Music Vault 🎵');
      break;
    case 'preview_birthday':
      previewBirthdayWish();
      break;
    case 'open_profile':
      openProfileHub(currentUser?.username || 'Soumya');
      break;
    case 'open_user_manager':
      openUserManagerModal();
      break;
    case 'open_command_palette':
      openModal('command-palette-modal');
      break;
    case 'open_support':
      openSupportModal();
      break;
    case 'open_dashboard':
    default:
      switchView('dashboard');
      break;
  }
}

// ==========================================================================
// ADMIN HELP DESK & SUPPORT TICKET SYSTEM (WITH SCREENSHOT ATTACHMENT)
// ==========================================================================
let selectedSupportFile = null;

function openSupportModal() {
  playModalOpenSound();
  const nameInput = document.getElementById('support-name');
  if (nameInput) {
    nameInput.value = currentUser?.displayName || currentUser?.username || '';
  }
  const contactInput = document.getElementById('support-contact');
  if (contactInput) contactInput.value = '';
  const subjectInput = document.getElementById('support-subject');
  if (subjectInput) subjectInput.value = '';
  const messageInput = document.getElementById('support-message');
  if (messageInput) messageInput.value = '';
  
  removeSupportScreenshot();

  openModal('support-help-modal');
  setTimeout(() => {
    if (subjectInput) subjectInput.focus();
  }, 100);
}

function closeSupportModal() {
  playModalCloseSound();
  removeSupportScreenshot();
  closeModal('support-help-modal');
}

function handleSupportScreenshotSelect(e) {
  const file = e.target.files?.[0];
  if (file) {
    setSupportScreenshot(file);
  }
}

function setSupportScreenshot(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file (JPG, PNG, WebP).', 'warning');
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    showToast('Screenshot must be smaller than 20MB.', 'warning');
    return;
  }

  selectedSupportFile = file;
  playClickSound();

  const previewBox = document.getElementById('support-screenshot-preview');
  const previewImg = document.getElementById('support-preview-img');
  const previewName = document.getElementById('support-preview-filename');
  const previewSize = document.getElementById('support-preview-size');
  const dropzone = document.getElementById('support-dropzone');

  if (previewImg && previewBox) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      if (previewName) previewName.textContent = file.name;
      if (previewSize) previewSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
      previewBox.style.display = 'flex';
      if (dropzone) dropzone.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
}

function removeSupportScreenshot() {
  selectedSupportFile = null;
  const fileInput = document.getElementById('support-screenshot-file');
  if (fileInput) fileInput.value = '';
  const previewBox = document.getElementById('support-screenshot-preview');
  if (previewBox) previewBox.style.display = 'none';
  const dropzone = document.getElementById('support-dropzone');
  if (dropzone) dropzone.style.display = 'block';
}

// Clipboard Paste Support for Screenshot
window.addEventListener('paste', (e) => {
  const modal = document.getElementById('support-help-modal');
  if (!modal || modal.style.display === 'none') return;

  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      if (blob) {
        setSupportScreenshot(blob);
        showToast('Screenshot pasted from clipboard! 📋📸', 'info');
        break;
      }
    }
  }
});

// Drag and drop for support dropzone
document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('support-dropzone');
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt.files?.[0];
      if (file) setSupportScreenshot(file);
    }, false);
  }
});

async function handleSupportSubmit(e) {
  if (e) e.preventDefault();
  playClickSound();

  const name = document.getElementById('support-name')?.value?.trim();
  const contact = document.getElementById('support-contact')?.value?.trim() || '';
  const category = document.getElementById('support-category')?.value || 'General Query';
  const subject = document.getElementById('support-subject')?.value?.trim();
  const message = document.getElementById('support-message')?.value?.trim();
  const submitBtn = document.getElementById('support-submit-btn');

  if (!subject || !message) {
    showToast('Please enter both subject and message description.', 'warning');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading & Sending... ⏳';
  }

  try {
    const formData = new FormData();
    formData.append('name', name || (currentUser?.displayName || currentUser?.username || 'Member'));
    formData.append('contactEmail', contact);
    formData.append('contactPhone', contact);
    formData.append('category', category);
    formData.append('subject', subject);
    formData.append('message', message);
    if (selectedSupportFile) {
      formData.append('screenshot', selectedSupportFile);
    }

    const token = getAuthToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_ORIGIN}/api/support/submit`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include'
    });

    const data = await res.json();
    if (data.success) {
      playSuccessSound();
      showToast(`Support Ticket ${data.ticketId} sent with screenshot directly to Head Admin! 📨`, 'success');
      closeSupportModal();
      document.getElementById('support-ticket-form')?.reset();
    } else {
      showToast(data.error?.message || 'Failed to submit support request.', 'error');
    }
  } catch (err) {
    showToast('Network error while submitting support ticket.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '🚀 Send Message to Admin';
    }
  }
}

// ==========================================================================
// EXCLUSIVE "ONLY FOR YOU" (PHOTOSHOP CUTOUTS & AUDIO STREAM) CONTROLLER
// ==========================================================================
let specialVaultData = null;
let onlyForYouAudioObj = null;
let isOnlyForYouAudioPlaying = false;

async function loadOnlyForYouSection() {
  const cutoutsContainer = document.getElementById('special-cutouts-grid');
  const portraitsContainer = document.getElementById('special-portraits-grid');

  try {
    const res = await apiFetch('/api/only-for-you');
    const data = await res.json();
    if (!data.success) return;
    specialVaultData = data;

    // Render Cutouts (Zero-background transparent PNGs)
    if (cutoutsContainer && data.cutouts) {
      cutoutsContainer.innerHTML = data.cutouts.map((c) => {
        const safeTitle = escapeHtml(c.title);
        const safeCaption = escapeHtml(c.caption);
        const safeQuote = escapeHtml(c.quote || '');
        const safeTag = escapeHtml(c.tag || '💖 Pure Magic');
        const glow = c.glowColor || 'rgba(255, 64, 129, 0.5)';

        return `
          <div class="cutout-art-card" onmousemove="handleCutoutCardTilt(event, this)" onmouseleave="resetCutoutCardTilt(this)">
            <div class="cutout-stage-wrap">
              <div class="cutout-ambient-glow" style="--glow-color: ${glow};"></div>
              <img src="${API_ORIGIN}${c.src}" alt="${safeTitle}" class="cutout-image-element" style="--glow-color: ${glow};" onclick="openCutoutLightbox('${API_ORIGIN}${c.src}', '${safeTitle}', '${safeCaption}', '${safeQuote}', '${glow}', '${safeTag}')" title="Click to open luxury 4K showcase">
            </div>
            <div class="cutout-info-box">
              <div class="cutout-tag-pill">${safeTag}</div>
              <h3 class="cutout-card-title">${safeTitle}</h3>
              <p class="cutout-card-quote">${safeQuote}</p>
              <p class="cutout-card-caption">${safeCaption}</p>
              <div class="cutout-card-actions">
                <button type="button" class="btn-card-explore" onclick="openCutoutLightbox('${API_ORIGIN}${c.src}', '${safeTitle}', '${safeCaption}', '${safeQuote}', '${glow}', '${safeTag}')">
                  <span class="btn-exp-icon">✨</span>
                  <span class="btn-exp-text">View & Download 4K</span>
                  <span class="btn-exp-arrow">➔</span>
                </button>
                <a href="${API_ORIGIN}${c.src}" download="${safeTitle}.png" class="btn-card-quick-dl" title="Quick Download PNG" onclick="triggerLuxuryDownloadToast('${safeTitle}')">
                  <span>⬇️</span>
                </a>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Framed Portraits (Zero-background transparent Cutouts)
    if (portraitsContainer && data.portraits) {
      portraitsContainer.innerHTML = data.portraits.map((p) => {
        const safeTitle = escapeHtml(p.title);
        const safeCaption = escapeHtml(p.caption);
        const safeQuote = escapeHtml(p.quote || '');
        const safeTag = escapeHtml(p.tag || '📸 Cherished');
        const glow = p.glowColor || 'rgba(255, 183, 77, 0.5)';

        return `
          <div class="cutout-art-card" onmousemove="handleCutoutCardTilt(event, this)" onmouseleave="resetCutoutCardTilt(this)">
            <div class="cutout-stage-wrap" style="height: 320px;">
              <div class="cutout-ambient-glow" style="--glow-color: ${glow}; width: 180px; height: 180px;"></div>
              <img src="${API_ORIGIN}${p.src}" alt="${safeTitle}" class="cutout-image-element" style="--glow-color: ${glow}; max-height: 290px;" onclick="openCutoutLightbox('${API_ORIGIN}${p.src}', '${safeTitle}', '${safeCaption}', '${safeQuote}', '${glow}', '${safeTag}')" title="Click to open luxury 4K showcase">
            </div>
            <div class="cutout-info-box">
              <div class="cutout-tag-pill" style="border-color: rgba(255, 183, 77, 0.4); color: #ffb74d; background: rgba(255, 183, 77, 0.15);">${safeTag}</div>
              <h3 class="cutout-card-title">${safeTitle}</h3>
              <p class="cutout-card-quote">${safeQuote}</p>
              <p class="cutout-card-caption">${safeCaption}</p>
              <div class="cutout-card-actions">
                <button type="button" class="btn-card-explore" onclick="openCutoutLightbox('${API_ORIGIN}${p.src}', '${safeTitle}', '${safeCaption}', '${safeQuote}', '${glow}', '${safeTag}')">
                  <span class="btn-exp-icon">✨</span>
                  <span class="btn-exp-text">View & Download 4K</span>
                  <span class="btn-exp-arrow">➔</span>
                </button>
                <a href="${API_ORIGIN}${p.src}" download="${safeTitle}.png" class="btn-card-quick-dl" title="Quick Download PNG" onclick="triggerLuxuryDownloadToast('${safeTitle}')">
                  <span>⬇️</span>
                </a>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load special vault data:', err);
  }
}

// 3D Parallax Tilt Effect on Mouse Move
function handleCutoutCardTilt(e, card) {
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;
  const tiltX = (y / (rect.height / 2)) * -6;
  const tiltY = (x / (rect.width / 2)) * 6;
  card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-8px) scale(1.015)`;
}

function resetCutoutCardTilt(card) {
  card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)';
}

// Audio Looping Engine
function getOnlyForYouAudio() {
  if (!onlyForYouAudioObj) {
    onlyForYouAudioObj = new Audio(`${API_ORIGIN}/photo/sppppppppp.mp4`);
    onlyForYouAudioObj.loop = true;
    onlyForYouAudioObj.volume = 0.75;

    onlyForYouAudioObj.onerror = () => {
      onlyForYouAudioObj.src = `${API_ORIGIN}/music/WhatsApp%20Audio%202026-08-21%20at%201.00.10%20AM.mpeg`;
      onlyForYouAudioObj.play().catch(e => {});
    };
  }
  return onlyForYouAudioObj;
}

function playOnlyForYouAudio() {
  const audio = getOnlyForYouAudio();
  audio.loop = true;
  audio.play().then(() => {
    isOnlyForYouAudioPlaying = true;
    updateOnlyForYouAudioUI(true);
  }).catch((err) => {
    updateOnlyForYouAudioUI(false);
  });
}

function toggleOnlyForYouAudio() {
  const audio = getOnlyForYouAudio();
  if (audio.paused) {
    audio.play().then(() => {
      isOnlyForYouAudioPlaying = true;
      updateOnlyForYouAudioUI(true);
      showToast('🎵 Special audio resumed (looping).', 'success');
    }).catch(e => {
      showToast('Click anywhere on the page first to enable sound.', 'info');
    });
  } else {
    audio.pause();
    isOnlyForYouAudioPlaying = false;
    updateOnlyForYouAudioUI(false);
    showToast('🔇 Special audio paused.', 'info');
  }
}

function setOnlyForYouVolume(vol) {
  const audio = getOnlyForYouAudio();
  audio.volume = parseFloat(vol);
}

function updateOnlyForYouAudioUI(isPlaying) {
  const btn = document.getElementById('special-audio-toggle-btn');
  const icon = document.getElementById('special-audio-btn-icon');
  const text = document.getElementById('special-audio-btn-text');
  const status = document.getElementById('special-audio-status');
  const waves = document.getElementById('special-equalizer-waves');

  if (isPlaying) {
    if (btn) { btn.classList.add('active'); btn.classList.remove('paused'); }
    if (icon) icon.innerText = '🔊';
    if (text) text.innerText = 'Audio Playing (Turn Off)';
    if (status) status.innerText = '🔊 Sound is playing automatically in background';
    if (waves) waves.classList.remove('paused');
  } else {
    if (btn) { btn.classList.remove('active'); btn.classList.add('paused'); }
    if (icon) icon.innerText = '🔇';
    if (text) text.innerText = 'Audio Paused (Turn On)';
    if (status) status.innerText = '🔇 Sound is paused. Click Turn On to play';
    if (waves) waves.classList.add('paused');
  }
}

// Dedicated Luxury VIP Artwork Showcase Lightbox
let isArtworkZoomed = false;

function openCutoutLightbox(src, title, caption, quote, glowColor, tag) {
  const imgEl = document.getElementById('sam-artwork-img');
  const titleEl = document.getElementById('sam-title');
  const quoteEl = document.getElementById('sam-quote');
  const captionEl = document.getElementById('sam-caption');
  const tagEl = document.getElementById('sam-tag');
  const glowEl = document.getElementById('sam-ambient-glow');
  const dlBtn = document.getElementById('sam-download-btn');
  const zoomText = document.getElementById('sam-zoom-text');

  isArtworkZoomed = false;
  if (imgEl) {
    imgEl.src = src;
    imgEl.classList.remove('zoomed');
  }
  if (zoomText) zoomText.innerText = 'Zoom';

  if (titleEl) titleEl.innerText = title;
  if (quoteEl) quoteEl.innerText = quote ? `${quote}` : '';
  if (captionEl) captionEl.innerText = caption;
  if (tagEl) tagEl.innerText = tag || '✨ Masterpiece';
  if (glowEl) glowEl.style.setProperty('--sam-glow', glowColor || 'rgba(255, 64, 129, 0.55)');

  if (dlBtn) {
    dlBtn.href = src;
    dlBtn.download = `${title.replace(/\s+/g, '_')}_Masterpiece.png`;
  }

  openModal('special-artwork-modal');
  playModalOpenSound();
}

function closeCutoutLightbox() {
  closeModal('special-artwork-modal');
  playModalCloseSound();
}

function toggleArtworkZoom() {
  const imgEl = document.getElementById('sam-artwork-img');
  const zoomText = document.getElementById('sam-zoom-text');
  const zoomIcon = document.getElementById('sam-zoom-icon');
  if (!imgEl) return;

  isArtworkZoomed = !isArtworkZoomed;
  if (isArtworkZoomed) {
    imgEl.classList.add('zoomed');
    if (zoomText) zoomText.innerText = 'Fit';
    if (zoomIcon) zoomIcon.innerText = '🔄';
  } else {
    imgEl.classList.remove('zoomed');
    if (zoomText) zoomText.innerText = 'Zoom';
    if (zoomIcon) zoomIcon.innerText = '🔍';
  }
  playClickSound();
}

function triggerLuxuryDownloadToast(title) {
  playSuccessSound();
  showToast(`💎 Downloading "${title}" Ultra-HD transparent masterpiece...`, 'success');
}

function triggerLuxuryDownloadEffect(e) {
  playSuccessSound();
  showToast('💎 High-resolution master artwork saved to your device!', 'success');
}

// ==========================================================================
// DIRECT PROFILE MESSAGING (INBOX DIRECTORY, 1-ON-1 CHAT & CALLING)
// ==========================================================================
let activeChatUsername = '';
let activeChatPolling = null;
let cachedConversationsList = [];

async function openProfileMessenger(targetUsername) {
  if (!currentUser) {
    showToast('Please log in to message members.', 'warning');
    return;
  }

  playModalOpenSound();

  const modal = document.getElementById('profile-messenger-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
  }

  // If a specific target is provided, jump directly into their 1-on-1 chat
  if (targetUsername && targetUsername.trim()) {
    open1on1Chat(targetUsername.trim());
  } else {
    // Otherwise open the full Conversations & Registered Members Inbox
    showMessengerInbox();
  }
}

function showMessengerInbox() {
  if (activeChatPolling) clearInterval(activeChatPolling);
  activeChatPolling = null;
  activeChatUsername = '';

  const inboxView = document.getElementById('pm-inbox-view');
  const chatView = document.getElementById('pm-chat-view');
  const searchInput = document.getElementById('pm-user-search-input');

  if (inboxView) inboxView.style.display = 'flex';
  if (chatView) chatView.style.display = 'none';
  if (searchInput) searchInput.value = '';

  loadMessengerInbox();
}

async function loadMessengerInbox() {
  const container = document.getElementById('pm-inbox-list');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Loading member chats...</div>`;

  try {
    const res = await apiFetch('/api/messages/conversations');
    const data = await res.json();

    if (data.success && Array.isArray(data.conversations)) {
      cachedConversationsList = data.conversations;
      renderMessengerInboxList(cachedConversationsList);
    } else {
      container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">No members found.</div>`;
    }
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--status-danger);">Failed to load conversations.</div>`;
  }
}

function renderMessengerInboxList(conversations) {
  const container = document.getElementById('pm-inbox-list');
  if (!container) return;

  if (!conversations || conversations.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 10px; color:var(--text-muted);">
        <div style="font-size:32px; margin-bottom:8px;">🔍</div>
        <div style="font-size:13px; font-weight:700; color:#fff;">No members found</div>
        <div style="font-size:11px; margin-top:4px;">Try searching a different name.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = conversations.map(c => {
    const hasMsg = Boolean(c.lastMessage);
    const isMine = (c.lastMessage?.sender || '').toLowerCase() === (currentUser?.username || '').toLowerCase();
    const timeStr = c.lastMessage?.timestamp ? new Date(c.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const previewText = hasMsg ? `${isMine ? 'You: ' : ''}${escapeHtml(c.lastMessage.text || '')}` : '✨ Tap to start conversation';
    const isUnread = Boolean(c.unreadCount && c.unreadCount > 0);
    const privBadge = (c.privacy === 'PRIVATE') ? '🔒 Private' : '🌐 Public';

    return `
      <div class="messenger-inbox-item ${hasMsg ? 'has-recent' : ''}" onclick="open1on1Chat('${c.username}')">
        <div class="messenger-inbox-avatar">
          ${c.avatar?.startsWith('/') ? `<img src="${API_ORIGIN}${c.avatar}" alt="${c.displayName}" />` : (c.avatar || (c.username.toLowerCase() === 'soumya' ? '👑' : '👩‍🦰'))}
        </div>
        <div class="messenger-inbox-details">
          <div class="messenger-inbox-topline">
            <div class="messenger-inbox-name">${escapeHtml(c.displayName || c.username)}</div>
            ${timeStr ? `<div class="messenger-inbox-time">${timeStr}</div>` : ''}
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
            <div class="messenger-inbox-preview ${isUnread ? 'unread' : ''}">${previewText}</div>
            <div class="messenger-inbox-meta">
              <span style="font-size:10px; opacity:0.75; color:var(--accent-cyan);">${privBadge}</span>
              ${isUnread ? `<span class="messenger-unread-pill">${c.unreadCount} new</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleMessengerUserSearch(e) {
  const query = (e.target.value || '').toLowerCase().trim();
  const clearBtn = document.getElementById('pm-search-clear-btn');
  if (clearBtn) clearBtn.style.display = query ? 'inline-block' : 'none';

  if (!query) {
    renderMessengerInboxList(cachedConversationsList);
    return;
  }

  const filtered = cachedConversationsList.filter(c => 
    (c.username || '').toLowerCase().includes(query) ||
    (c.displayName || '').toLowerCase().includes(query)
  );

  renderMessengerInboxList(filtered);
}

function clearMessengerSearch() {
  const input = document.getElementById('pm-user-search-input');
  const clearBtn = document.getElementById('pm-search-clear-btn');
  if (input) input.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  renderMessengerInboxList(cachedConversationsList);
}

async function open1on1Chat(targetUsername) {
  const cleanTarget = (targetUsername || '').trim();
  if (!cleanTarget) return;

  activeChatUsername = cleanTarget;
  playClickSound();

  const inboxView = document.getElementById('pm-inbox-view');
  const chatView = document.getElementById('pm-chat-view');
  const nameEl = document.getElementById('pm-header-name');
  const avatarEl = document.getElementById('pm-header-avatar');
  const formEl = document.getElementById('pm-chat-form');
  const inputEl = document.getElementById('pm-chat-input');
  const restrictedBanner = document.getElementById('pm-restricted-banner');
  const restrictedName = document.getElementById('pm-restricted-name');
  const sendReqBtn = document.getElementById('pm-send-request-btn');

  if (inboxView) inboxView.style.display = 'none';
  if (chatView) chatView.style.display = 'flex';

  if (nameEl) nameEl.innerText = `@${cleanTarget}`;
  if (restrictedName) restrictedName.innerText = `@${cleanTarget}`;
  if (avatarEl) {
    avatarEl.innerHTML = (cleanTarget.toLowerCase() === 'soumya') ? '👑' : ((cleanTarget.toLowerCase() === 'sumana' || cleanTarget.toLowerCase() === 'sumona') ? '👩‍🦰' : '👤');
  }

  try {
    const res = await apiFetch(`/api/messages/${encodeURIComponent(cleanTarget)}`);
    const data = await res.json();

    if (data.success) {
      const u = data.targetUser || {};
      if (avatarEl && u.avatar) {
        avatarEl.innerHTML = u.avatar?.startsWith('/') ? `<img src="${API_ORIGIN}${u.avatar}" />` : u.avatar;
      }

      if (!data.canMessage) {
        // Show restricted banner
        if (restrictedBanner) restrictedBanner.style.display = 'block';
        if (formEl) formEl.style.display = 'none';

        if (sendReqBtn) {
          if (data.requestStatus === 'PENDING') {
            sendReqBtn.innerText = '⏳ Message Request Pending Approval';
            sendReqBtn.disabled = true;
          } else {
            sendReqBtn.innerText = '✉️ Send Message Request';
            sendReqBtn.disabled = false;
          }
        }
      } else {
        if (restrictedBanner) restrictedBanner.style.display = 'none';
        if (formEl) formEl.style.display = 'block';
        if (inputEl) setTimeout(() => inputEl.focus(), 150);
      }

      renderMessengerMessages(data.messages || []);
    } else {
      showToast(data.error?.message || 'Could not open conversation.', 'error');
    }
  } catch (err) {
    showToast('Failed to load messages.', 'error');
  }

  // Periodic Refresh
  if (activeChatPolling) clearInterval(activeChatPolling);
  activeChatPolling = setInterval(() => {
    if (activeChatUsername) pollDirectMessages(activeChatUsername);
  }, 3500);
}

function closeProfileMessenger() {
  const modal = document.getElementById('profile-messenger-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  if (activeChatPolling) clearInterval(activeChatPolling);
  activeChatPolling = null;
  activeChatUsername = '';
  playModalCloseSound();
}

async function pollDirectMessages(targetUsername) {
  if (!targetUsername) return;
  try {
    const res = await apiFetch(`/api/messages/${encodeURIComponent(targetUsername)}`);
    const data = await res.json();
    if (data.success && data.canMessage) {
      renderMessengerMessages(data.messages || []);
    }
  } catch (e) {}
}

function renderMessengerMessages(messages) {
  const container = document.getElementById('pm-messages-list');
  if (!container) return;

  if (!messages || messages.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 10px; color:var(--text-muted);">
        <div style="font-size:36px; margin-bottom:8px;">💬</div>
        <div style="font-size:13px; font-weight:700; color:#fff;">No messages yet</div>
        <div style="font-size:11px; margin-top:4px;">Say hello and start the conversation! ✨</div>
      </div>
    `;
    return;
  }

  const currentU = (currentUser?.username || '').toLowerCase();

  container.innerHTML = messages.map(m => {
    const isMine = (m.sender || '').toLowerCase() === currentU;
    const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const otherUser = isMine ? m.receiver : m.sender;

    if (m.type === 'call_log') {
      const isVideo = (m.mediaUrl === 'video');
      return `
        <div class="messenger-bubble call-log ${isMine ? 'outgoing' : 'incoming'}" onclick="${isVideo ? `startVideoCall('${otherUser}')` : `startVoiceCall('${otherUser}')`}" title="Tap to Call Back">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span>${escapeHtml(m.text || '')}</span>
            <span style="font-size:10px; padding:2px 6px; border-radius:8px; background:rgba(0,245,212,0.2); color:#00f5d4;">Call Back ↺</span>
          </div>
          <div class="messenger-bubble-time">${timeStr}</div>
        </div>
      `;
    }

    if (m.type === 'call_missed') {
      const isVideo = (m.mediaUrl === 'video');
      return `
        <div class="messenger-bubble call-missed ${isMine ? 'outgoing' : 'incoming'}" onclick="${isVideo ? `startVideoCall('${otherUser}')` : `startVoiceCall('${otherUser}')`}" title="Tap to Call Back">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span>${escapeHtml(m.text || '')}</span>
            <span style="font-size:10px; padding:2px 6px; border-radius:8px; background:rgba(255,23,68,0.25); color:#ff80ab;">Call Back ↺</span>
          </div>
          <div class="messenger-bubble-time">${timeStr}</div>
        </div>
      `;
    }

    return `
      <div class="messenger-bubble ${isMine ? 'outgoing' : 'incoming'}">
        <div>${escapeHtml(m.text || '')}</div>
        <div class="messenger-bubble-time">${timeStr}</div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

async function handleDirectMessageSubmit(e) {
  if (e) e.preventDefault();
  if (!activeChatUsername) return;

  const inputEl = document.getElementById('pm-chat-input');
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = '';

  try {
    const res = await apiFetch(`/api/messages/${encodeURIComponent(activeChatUsername)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    if (data.success && data.message) {
      playClickSound();
      pollDirectMessages(activeChatUsername);
    } else {
      showToast(data.error?.message || 'Failed to send message.', 'error');
    }
  } catch (err) {
    showToast('Network error sending message.', 'error');
  }
}

function appendMessengerEmoji(emoji) {
  const inputEl = document.getElementById('pm-chat-input');
  if (inputEl) {
    inputEl.value += emoji;
    inputEl.focus();
  }
}

async function sendDirectChatRequest(targetUsername) {
  const cleanTarget = (targetUsername || activeProfileUsername || activeChatUsername).trim();
  if (!cleanTarget) return;

  try {
    const res = await apiFetch(`/api/messages/${encodeURIComponent(cleanTarget)}/request`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.success) {
      playSuccessSound();
      showToast(data.message || `Request sent to @${cleanTarget}!`, 'success');
      const sendReqBtn = document.getElementById('pm-send-request-btn');
      if (sendReqBtn) {
        sendReqBtn.innerText = '⏳ Message Request Pending Approval';
        sendReqBtn.disabled = true;
      }
      const lockReqBtn = document.getElementById('ph-lock-request-btn');
      if (lockReqBtn) {
        lockReqBtn.innerHTML = '<span>⏳</span> <span>Request Pending Approval</span>';
        lockReqBtn.disabled = true;
      }
    } else {
      showToast(data.error?.message || 'Could not send request.', 'error');
    }
  } catch (err) {
    showToast('Error sending chat request.', 'error');
  }
}

// ==========================================================================
// PENDING REQUESTS PANEL
// ==========================================================================
async function checkPendingRequestsBadge() {
  if (!currentUser) return;
  try {
    const res = await apiFetch('/api/messages/requests/pending');
    const data = await res.json();
    const btn = document.getElementById('topbar-requests-btn');
    const countEl = document.getElementById('topbar-requests-count');
    if (data.success && Array.isArray(data.requests) && data.requests.length > 0) {
      if (btn) btn.style.display = 'inline-flex';
      if (countEl) countEl.innerText = data.requests.length;
    } else {
      if (btn) btn.style.display = 'none';
    }
  } catch (e) {}
}

async function openPendingRequestsModal() {
  playModalOpenSound();
  openModal('pending-requests-modal');
  const container = document.getElementById('pending-requests-list');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">Loading requests...</div>`;

  try {
    const res = await apiFetch('/api/messages/requests/pending');
    const data = await res.json();

    if (data.success && Array.isArray(data.requests) && data.requests.length > 0) {
      container.innerHTML = data.requests.map(r => `
        <div class="pending-request-item">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="font-size:24px;">${r.avatar?.startsWith('/') ? `<img src="${API_ORIGIN}${r.avatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;" />` : (r.avatar || '👤')}</div>
            <div>
              <div style="font-weight:700; font-size:13px; color:#fff;">${r.displayName || r.from}</div>
              <div style="font-size:11px; color:var(--accent-cyan);">@${r.from}</div>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn-primary-3d" style="width:auto; font-size:11px; padding:6px 12px; background:#00f5d4; color:#000; font-weight:800;" onclick="respondToPendingRequest('${r.id}', '${r.from}', 'ACCEPTED')">
              Accept 💖
            </button>
            <button type="button" class="btn-primary-3d" style="width:auto; font-size:11px; padding:6px 10px; background:rgba(255,255,255,0.08);" onclick="respondToPendingRequest('${r.id}', '${r.from}', 'DECLINED')">
              Decline ✕
            </button>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<div style="text-align:center; padding:30px 10px; color:var(--text-muted);">No pending requests at this time. ✨</div>`;
    }
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--status-danger);">Failed to load requests.</div>`;
  }
}

async function respondToPendingRequest(requestId, fromUsername, status) {
  try {
    const res = await apiFetch('/api/messages/requests/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, fromUsername, status })
    });
    const data = await res.json();
    if (data.success) {
      playSuccessSound();
      showToast(data.message || 'Request updated!', 'success');
      openPendingRequestsModal();
      checkPendingRequestsBadge();
      if (activeProfileUsername) openProfileHub(activeProfileUsername);
    } else {
      showToast(data.error?.message || 'Failed to update request.', 'error');
    }
  } catch (err) {
    showToast('Error responding to request.', 'error');
  }
}

// ==========================================================================
// REAL-TIME ZEGOCLOUD CALLING SYSTEM (HD VOICE & VIDEO CALL ENGINE)
// ==========================================================================
let activeCallId = null;
let activeCallRoomId = '';
let activeCallTarget = '';
let activeCallType = 'voice';
let isCallInitiator = false;
let activeCallTimer = null;
let callDurationSeconds = 0;
let localMediaStream = null;
let remoteMediaStream = null;
let zegoInstance = null;
let isCallMuted = false;
let isCallVideoOff = false;
let isSpeakerActive = true;
let currentFacingMode = 'user'; // 'user' (front) or 'environment' (back)
let incomingCallData = null;
let outgoingCallTimeout = null;
let ringtoneAudioContext = null;
let ringtoneOscillators = [];
let ringtoneTimer = null;

// --- Web Audio Ringtone & Call Chimes ---
function stopAllCallAudio() {
  if (ringtoneTimer) {
    clearInterval(ringtoneTimer);
    ringtoneTimer = null;
  }
  ringtoneOscillators.forEach(osc => {
    try { osc.stop(); osc.disconnect(); } catch (e) {}
  });
  ringtoneOscillators = [];
  if (ringtoneAudioContext) {
    try { ringtoneAudioContext.close(); } catch (e) {}
    ringtoneAudioContext = null;
  }
}

// 1. Pleasant Incoming Phone Ringtone Chime
function playIncomingRingtone() {
  stopAllCallAudio();
  try {
    const playNotePair = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ringtoneAudioContext = ctx;
        
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc1.frequency.setValueAtTime(783.99, ctx.currentTime + 0.25); // G5
        osc2.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.25); // E5

        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.6);
        osc2.stop(ctx.currentTime + 1.6);
        ringtoneOscillators = [osc1, osc2];
      } catch (e) {}
    };

    playNotePair();
    ringtoneTimer = setInterval(playNotePair, 2600);
  } catch (e) {}
}

// 2. Outgoing Ringback Dial Tone (Trrr-Trrr)
function playOutgoingDialTone() {
  stopAllCallAudio();
  try {
    const playTone = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ringtoneAudioContext = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.3);
        ringtoneOscillators = [osc];
      } catch (e) {}
    };

    playTone();
    ringtoneTimer = setInterval(playTone, 3200);
  } catch (e) {}
}

// 3. Call Connected / Disconnected Chime
function playCallBeep(isConnect = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isConnect ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(isConnect ? 523.25 : 300, ctx.currentTime);
    if (isConnect) osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.2);
    else osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

// --- Local Media Acquisition & Permission Handling ---
async function acquireLocalMedia(isVideo = false) {
  if (localMediaStream) {
    if (isVideo && localMediaStream.getVideoTracks().length === 0) {
      try {
        const vidStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: currentFacingMode,
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          }
        });
        const newTrack = vidStream.getVideoTracks()[0];
        if (newTrack) {
          localMediaStream.addTrack(newTrack);
          if (peerConnection) {
            peerConnection.addTrack(newTrack, localMediaStream);
          }
        }
      } catch (e) {
        console.warn('Could not add video track to existing stream:', e.message);
      }
    }
    const localVid = document.getElementById('call-local-video');
    if (localVid && isVideo) {
      localVid.srcObject = localMediaStream;
      localVid.muted = true;
      try { await localVid.play(); } catch (e) {}
    }
    return localMediaStream;
  }

  const constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: isVideo ? {
      facingMode: currentFacingMode,
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 }
    } : false
  };

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      localMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const localVid = document.getElementById('call-local-video');
      if (localVid && isVideo) {
        localVid.srcObject = localMediaStream;
        localVid.muted = true;
        try { await localVid.play(); } catch (e) {}
      }
      return localMediaStream;
    }
  } catch (err) {
    console.warn('Microphone/Camera access note:', err.message);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      showToast('⚠️ Microphone/Camera access was blocked in browser settings. Please allow permission to talk.', 'warning', 6000);
    }
    if (isVideo) {
      // Fallback to audio only if camera is blocked or unavailable
      try {
        localMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        return localMediaStream;
      } catch (e) {}
    }
  }
  return null;
}

// ==========================================================================
// DUAL-ENGINE REAL-TIME RTC & ZEGOCLOUD CALLING SYSTEM
// ==========================================================================
const rtcIceConfig = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302'] },
    { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.services.mozilla.com'] },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

let rtcIceCandidatesQueue = [];

// Initialize Native WebRTC Peer Connection
async function initPeerConnection(targetUsername, isVideo = true) {
  try {
    if (peerConnection) {
      try { peerConnection.close(); } catch (e) {}
      peerConnection = null;
    }

    rtcIceCandidatesQueue = [];
    peerConnection = new RTCPeerConnection(rtcIceConfig);

    // Initialize or reset remote media stream
    if (!remoteMediaStream) {
      remoteMediaStream = new MediaStream();
    } else {
      remoteMediaStream.getTracks().forEach(t => {
        try { t.stop(); } catch(e) {}
        remoteMediaStream.removeTrack(t);
      });
    }

    // Add local media tracks
    if (localMediaStream) {
      localMediaStream.getTracks().forEach(track => {
        try {
          peerConnection.addTrack(track, localMediaStream);
        } catch (e) {}
      });
    }

    // ICE Candidate Handler
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && activeCallId && targetUsername) {
        apiFetch('/api/messages/call/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId: activeCallId,
            targetUsername,
            signalData: { type: 'candidate', candidate: event.candidate }
          })
        }).catch(() => {});
      }
    };

    // Remote Track Handler (Receives audio & video from the other person)
    peerConnection.ontrack = (event) => {
      console.log('🎥 [WebRTC] Received remote stream track:', event.track.kind, event.track.id);
      
      // Add track to remote stream if not already added
      if (!remoteMediaStream.getTracks().some(t => t.id === event.track.id)) {
        remoteMediaStream.addTrack(event.track);
      }

      const remoteVid = document.getElementById('call-remote-video');
      const remoteAud = document.getElementById('call-remote-audio');
      const placeholder = document.getElementById('call-remote-placeholder');
      const statusEl = document.getElementById('call-status-text');

      if (remoteAud) {
        if (remoteAud.srcObject !== remoteMediaStream) {
          remoteAud.srcObject = remoteMediaStream;
        }
        remoteAud.muted = false;
        try { remoteAud.play().catch(() => {}); } catch (e) {}
      }

      if (remoteVid) {
        if (remoteVid.srcObject !== remoteMediaStream) {
          remoteVid.srcObject = remoteMediaStream;
        }
        remoteVid.muted = false;
        try { remoteVid.play().catch(() => {}); } catch (e) {}
      }

      if (event.track.kind === 'video') {
        if (placeholder) placeholder.style.display = 'none';
        event.track.onunmute = () => {
          if (placeholder) placeholder.style.display = 'none';
        };
        event.track.onmute = () => {
          if (placeholder) placeholder.style.display = 'flex';
        };
      }

      if (statusEl) {
        statusEl.innerText = isVideo 
          ? 'Connected • Ultra HD Video Stream 🔒' 
          : 'Connected • HD Crystal Audio Stream 🔒';
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('📶 [WebRTC] Connection state:', peerConnection.connectionState);
      const statusEl = document.getElementById('call-status-text');
      if (peerConnection.connectionState === 'connected') {
        if (statusEl) {
          statusEl.innerText = isVideo 
            ? 'Connected • Ultra HD Video Stream 🔒' 
            : 'Connected • HD Crystal Audio Stream 🔒';
        }
      } else if (peerConnection.connectionState === 'failed') {
        if (statusEl) statusEl.innerText = 'Reconnecting RTC stream...';
        if (isCallInitiator && peerConnection) {
          peerConnection.createOffer({ iceRestart: true }).then(offer => {
            return peerConnection.setLocalDescription(offer).then(() => {
              return apiFetch('/api/messages/call/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callId: activeCallId,
                  targetUsername,
                  signalData: { type: 'offer', sdp: offer }
                })
              });
            });
          }).catch(() => {});
        }
      }
    };

    return peerConnection;
  } catch (err) {
    console.warn('[WebRTC Init Error]:', err.message);
    return null;
  }
}

// Handle Incoming WebRTC Signaling Events (Offer / Answer / ICE)
async function handleWebRTCSignalEvent(signal) {
  if (!activeCallId || activeCallId !== signal.callId) return;
  const { from, signalData } = signal;
  if (!signalData) return;

  const isVideo = (activeCallType === 'video');

  try {
    if (signalData.type === 'offer') {
      console.log('📥 [WebRTC] Received SDP Offer from @' + from);
      if (!localMediaStream) {
        await acquireLocalMedia(isVideo);
      }
      if (!peerConnection) {
        await initPeerConnection(from, isVideo);
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData.sdp));

      // Flush queued candidates
      while (rtcIceCandidatesQueue.length > 0) {
        const cand = rtcIceCandidatesQueue.shift();
        try { await peerConnection.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
      }

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      await apiFetch('/api/messages/call/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: activeCallId,
          targetUsername: from,
          signalData: { type: 'answer', sdp: answer }
        })
      });

    } else if (signalData.type === 'answer') {
      console.log('📥 [WebRTC] Received SDP Answer from @' + from);
      if (peerConnection && signalData.sdp) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        
        // Flush queued candidates
        while (rtcIceCandidatesQueue.length > 0) {
          const cand = rtcIceCandidatesQueue.shift();
          try { await peerConnection.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
        }
      }

    } else if (signalData.type === 'candidate' && signalData.candidate) {
      if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        } catch (e) {}
      } else {
        rtcIceCandidatesQueue.push(signalData.candidate);
      }
    }
  } catch (err) {
    console.warn('[WebRTC Signaling Handler note]:', err.message);
  }
}

// --- Combined RTC & ZEGOCLOUD Room Connection Pipeline ---
async function joinZegoCallRoom(roomId, targetUsername, callType = 'video') {
  const isVideo = (callType === 'video');
  const resolvedRoomId = roomId || activeCallRoomId || `zego_room_${Date.now()}`;

  // 1. Acquire Local Camera/Microphone immediately
  await acquireLocalMedia(isVideo);

  // 2. Initialize Native WebRTC Connection
  const pc = await initPeerConnection(targetUsername, isVideo);

  // If Initiator (Caller), create and dispatch SDP Offer
  if (isCallInitiator && pc) {
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo
      });
      await pc.setLocalDescription(offer);

      await apiFetch('/api/messages/call/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: activeCallId,
          targetUsername,
          signalData: { type: 'offer', sdp: offer }
        })
      });
      console.log('📤 [WebRTC] Dispatched SDP Offer to @' + targetUsername);
    } catch (e) {
      console.warn('[WebRTC Offer Error]:', e.message);
    }
  }

  // 3. Optional ZEGOCLOUD Multi-Network RTC Bridge
  try {
    const res = await apiFetch(`/api/messages/call/zego-config?roomId=${encodeURIComponent(resolvedRoomId)}`);
    const data = await res.json();
    const config = data?.config;

    if (config && config.configured && window.ZegoUIKitPrebuilt) {
      console.log('🚀 [ZEGOCLOUD] Initializing Multi-Network RTC Bridge for Room:', resolvedRoomId);
      
      let kitToken = '';
      if (config.appSign) {
        kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          config.appId,
          config.appSign,
          config.roomId || resolvedRoomId,
          config.userId,
          config.userName
        );
      } else if (config.token) {
        kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          config.appId,
          config.token,
          config.roomId || resolvedRoomId,
          config.userId,
          config.userName
        );
      }

      if (kitToken) {
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zegoInstance = zp;
      }
    }
  } catch (err) {
    console.warn('[ZEGOCLOUD RTC note]:', err.message);
  }
}

// --- Outgoing Voice Call Initiation ---
async function startVoiceCall(targetUsername) {
  const target = (targetUsername || activeChatUsername || activeProfileUsername || '').trim();
  if (!target) {
    showToast('Please select a member to call.', 'error');
    return;
  }

  try {
    const res = await apiFetch('/api/messages/call/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUsername: target, callType: 'voice' })
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.error?.message || `Could not call @${target}`, 'error');
      return;
    }

    activeCallId = data.callId;
    activeCallRoomId = data.roomId || `zego_room_${Date.now()}`;
    activeCallTarget = target;
    activeCallType = 'voice';
    isCallInitiator = true;
    currentFacingMode = 'user';

    // Prime audio elements on user click
    const remoteAud = document.getElementById('call-remote-audio');
    if (remoteAud) { try { remoteAud.play().catch(() => {}); } catch(e){} }

    playOutgoingDialTone();
    openModal('calling-modal');

    const nameEl = document.getElementById('call-user-name');
    const statusEl = document.getElementById('call-status-text');
    const badgeEl = document.getElementById('call-type-badge');
    const avatarCircle = document.getElementById('call-user-avatar');
    const videoContainer = document.getElementById('call-video-container');
    const avatarContainer = document.getElementById('call-avatar-container');
    const timerEl = document.getElementById('call-timer');

    if (nameEl) nameEl.innerText = `@${target}`;
    if (badgeEl) badgeEl.innerText = '📞 Secure Cloud Voice Call';
    if (statusEl) statusEl.innerText = `Calling @${target}...`;
    if (videoContainer) videoContainer.style.display = 'none';
    if (avatarContainer) avatarContainer.style.display = 'flex';
    if (timerEl) timerEl.innerText = '00:00';

    if (avatarCircle) {
      avatarCircle.innerText = (target.toLowerCase() === 'soumya') ? '👑' : ((target.toLowerCase() === 'sumana' || target.toLowerCase() === 'sumona') ? '👩‍🦰' : '👤');
    }

    // Pre-acquire microphone
    acquireLocalMedia(false).catch(() => {});

    // 35-Second Outgoing Ringing Timeout for Missed Call
    if (outgoingCallTimeout) clearTimeout(outgoingCallTimeout);
    outgoingCallTimeout = setTimeout(() => {
      if (activeCallId && isCallInitiator) {
        showToast(`@${target} did not answer.`, 'info');
        apiFetch('/api/messages/call/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId: activeCallId,
            action: 'MISSED',
            targetUsername: activeCallTarget,
            callType: 'voice'
          })
        }).catch(() => {});
        endCurrentCall(false);
      }
    }, 35000);

  } catch (err) {
    showToast('Failed to start voice call.', 'error');
  }
}

// --- Outgoing Video Call Initiation ---
async function startVideoCall(targetUsername) {
  const target = (targetUsername || activeChatUsername || activeProfileUsername || '').trim();
  if (!target) {
    showToast('Please select a member to call.', 'error');
    return;
  }

  try {
    const res = await apiFetch('/api/messages/call/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUsername: target, callType: 'video' })
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.error?.message || `Could not call @${target}`, 'error');
      return;
    }

    activeCallId = data.callId;
    activeCallRoomId = data.roomId || `zego_room_${Date.now()}`;
    activeCallTarget = target;
    activeCallType = 'video';
    isCallInitiator = true;
    currentFacingMode = 'user';

    // Prime audio and video playback on user tap
    const remoteAud = document.getElementById('call-remote-audio');
    const remoteVid = document.getElementById('call-remote-video');
    if (remoteAud) { try { remoteAud.play().catch(() => {}); } catch(e){} }
    if (remoteVid) { try { remoteVid.play().catch(() => {}); } catch(e){} }

    playOutgoingDialTone();
    openModal('calling-modal');

    const nameEl = document.getElementById('call-user-name');
    const statusEl = document.getElementById('call-status-text');
    const badgeEl = document.getElementById('call-type-badge');
    const videoContainer = document.getElementById('call-video-container');
    const avatarContainer = document.getElementById('call-avatar-container');
    const timerEl = document.getElementById('call-timer');
    const remotePlaceholder = document.getElementById('call-remote-placeholder');
    const placeholderAvatar = document.getElementById('call-remote-placeholder-avatar');

    if (nameEl) nameEl.innerText = `@${target}`;
    if (badgeEl) badgeEl.innerText = '📹 HD Cloud Video Call';
    if (statusEl) statusEl.innerText = `Connecting video with @${target}...`;
    if (videoContainer) videoContainer.style.display = 'block';
    if (avatarContainer) avatarContainer.style.display = 'none';
    if (remotePlaceholder) remotePlaceholder.style.display = 'flex';
    if (placeholderAvatar) {
      placeholderAvatar.innerText = (target.toLowerCase() === 'soumya') ? '👑' : ((target.toLowerCase() === 'sumana' || target.toLowerCase() === 'sumona') ? '👩‍🦰' : '👤');
    }
    if (timerEl) timerEl.innerText = '00:00';

    // Start local camera preview immediately in floating PiP
    await acquireLocalMedia(true);

    // 35-Second Outgoing Ringing Timeout for Missed Call
    if (outgoingCallTimeout) clearTimeout(outgoingCallTimeout);
    outgoingCallTimeout = setTimeout(() => {
      if (activeCallId && isCallInitiator) {
        showToast(`@${target} did not answer.`, 'info');
        apiFetch('/api/messages/call/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId: activeCallId,
            action: 'MISSED',
            targetUsername: activeCallTarget,
            callType: 'video'
          })
        }).catch(() => {});
        endCurrentCall(false);
      }
    }, 35000);

  } catch (err) {
    showToast('Failed to start video call.', 'error');
  }
}

// --- Incoming Call Event Handler ---
function handleIncomingCallEvent(call) {
  if (!currentUser) return;
  
  // If already on an active call, notify BUSY
  if (activeCallId) {
    apiFetch('/api/messages/call/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: call.callId,
        action: 'BUSY',
        targetUsername: call.caller,
        callType: call.callType
      })
    }).catch(() => {});
    return;
  }

  incomingCallData = call;
  activeCallRoomId = call.roomId || `zego_room_${Date.now()}`;
  playIncomingRingtone();

  // Vibrate phone with standard phone ring pattern
  if ('vibrate' in navigator) {
    try { navigator.vibrate([300, 100, 300, 100, 300, 100, 400]); } catch (e) {}
  }

  const modal = document.getElementById('incoming-call-modal');
  const avatarEl = document.getElementById('incoming-caller-avatar');
  const nameEl = document.getElementById('incoming-caller-name');
  const badgeEl = document.getElementById('incoming-call-type-badge');

  if (avatarEl) {
    if (call.callerAvatar && call.callerAvatar.startsWith('/')) {
      avatarEl.innerHTML = `<img src="${API_ORIGIN}${call.callerAvatar}" alt="${call.callerDisplayName}" />`;
    } else {
      avatarEl.innerText = call.callerAvatar || ((call.caller.toLowerCase() === 'soumya') ? '👑' : '👤');
    }
  }

  if (nameEl) nameEl.innerText = `${call.callerDisplayName || call.caller} ✨`;
  if (badgeEl) {
    badgeEl.innerText = (call.callType === 'video') ? '📹 Incoming Ultra HD Video Call...' : '📞 Incoming HD Voice Call...';
  }

  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }

  // Native phone push notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`📞 Incoming Call from @${call.caller}!`, {
        body: `${call.callerDisplayName || call.caller} is calling you on Private Photo Cloud. Tap to answer!`,
        icon: './images/favicon.png',
        vibrate: [300, 100, 300, 100, 300, 100, 400],
        tag: 'incoming-call'
      });
    } catch (e) {}
  }
}

// --- Accept Incoming Call ---
async function acceptIncomingCall() {
  if (!incomingCallData) return;
  const call = incomingCallData;
  incomingCallData = null;

  stopAllCallAudio();
  playCallBeep(true);

  // Prime audio and video playback on user click
  const remoteAud = document.getElementById('call-remote-audio');
  const remoteVid = document.getElementById('call-remote-video');
  if (remoteAud) { try { remoteAud.play().catch(() => {}); } catch(e){} }
  if (remoteVid) { try { remoteVid.play().catch(() => {}); } catch(e){} }

  const modal = document.getElementById('incoming-call-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }

  activeCallId = call.callId;
  activeCallRoomId = call.roomId || `zego_room_${Date.now()}`;
  activeCallTarget = call.caller;
  activeCallType = call.callType;
  isCallInitiator = false;
  currentFacingMode = 'user';

  // Open calling overlay in connected state
  openModal('calling-modal');

  const nameEl = document.getElementById('call-user-name');
  const statusEl = document.getElementById('call-status-text');
  const badgeEl = document.getElementById('call-type-badge');
  const videoContainer = document.getElementById('call-video-container');
  const avatarContainer = document.getElementById('call-avatar-container');
  const timerEl = document.getElementById('call-timer');
  const remotePlaceholder = document.getElementById('call-remote-placeholder');
  const placeholderAvatar = document.getElementById('call-remote-placeholder-avatar');

  if (nameEl) nameEl.innerText = `@${call.caller}`;
  if (badgeEl) badgeEl.innerText = (call.callType === 'video') ? '📹 HD Cloud Video Call' : '📞 Secure Cloud Voice Call';
  if (statusEl) statusEl.innerText = 'Connecting audio & video stream...';
  if (timerEl) timerEl.innerText = '00:00';
  if (placeholderAvatar) {
    placeholderAvatar.innerText = (call.caller.toLowerCase() === 'soumya') ? '👑' : ((call.caller.toLowerCase() === 'sumana' || call.caller.toLowerCase() === 'sumona') ? '👩‍🦰' : '👤');
  }

  const isVideo = (call.callType === 'video');
  if (isVideo) {
    if (videoContainer) videoContainer.style.display = 'block';
    if (avatarContainer) avatarContainer.style.display = 'none';
    if (remotePlaceholder) remotePlaceholder.style.display = 'flex';
  } else {
    if (videoContainer) videoContainer.style.display = 'none';
    if (avatarContainer) avatarContainer.style.display = 'flex';
  }

  callDurationSeconds = 0;
  startCallTimer();

  // Send ACCEPT response to backend & caller
  try {
    await apiFetch('/api/messages/call/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: call.callId,
        action: 'ACCEPT',
        targetUsername: call.caller,
        callType: call.callType
      })
    });
  } catch (err) {}

  // Join Call Session (WebRTC + ZEGOCLOUD RTC)
  joinZegoCallRoom(call.roomId || activeCallRoomId, call.caller, call.callType);
}

// --- Decline Incoming Call ---
async function declineIncomingCall() {
  if (!incomingCallData) return;
  const call = incomingCallData;
  incomingCallData = null;

  stopAllCallAudio();
  playCallBeep(false);

  const modal = document.getElementById('incoming-call-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }

  showToast('Call declined.', 'info');

  try {
    await apiFetch('/api/messages/call/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: call.callId,
        action: 'REJECT',
        targetUsername: call.caller,
        callType: call.callType
      })
    });
  } catch (err) {}
}

// --- Call Response Handler (for Caller) ---
async function handleCallResponseEvent(resp) {
  if (!activeCallId || activeCallId !== resp.callId) return;

  if (resp.action === 'ACCEPT') {
    stopAllCallAudio();
    if (outgoingCallTimeout) clearTimeout(outgoingCallTimeout);
    playCallBeep(true);

    const statusEl = document.getElementById('call-status-text');
    if (statusEl) statusEl.innerText = 'Connected • Establishing secure stream...';

    callDurationSeconds = 0;
    startCallTimer();
    showToast(`Connected with @${resp.from}! 💖`, 'success');

    // Join Calling Room (WebRTC + ZEGOCLOUD RTC)
    joinZegoCallRoom(resp.roomId || activeCallRoomId, resp.from, activeCallType);

  } else if (resp.action === 'REJECT') {
    stopAllCallAudio();
    if (outgoingCallTimeout) clearTimeout(outgoingCallTimeout);
    playCallBeep(false);
    showToast(`@${resp.from} declined the call.`, 'warning');
    endCurrentCall(false);
  } else if (resp.action === 'BUSY') {
    stopAllCallAudio();
    if (outgoingCallTimeout) clearTimeout(outgoingCallTimeout);
    playCallBeep(false);
    showToast(`@${resp.from} is busy on another call.`, 'warning');
    endCurrentCall(false);
  } else if (resp.action === 'END') {
    stopAllCallAudio();
    playCallBeep(false);
    showToast(`Call ended.`, 'info');
    endCurrentCall(false);
  }
}

function startCallTimer() {
  if (activeCallTimer) clearInterval(activeCallTimer);
  activeCallTimer = setInterval(() => {
    callDurationSeconds++;
    const mins = String(Math.floor(callDurationSeconds / 60)).padStart(2, '0');
    const secs = String(callDurationSeconds % 60).padStart(2, '0');
    const timerEl = document.getElementById('call-timer');
    if (timerEl) timerEl.innerText = `${mins}:${secs}`;
  }, 1000);
}

function endCurrentCall(notifyServer = true) {
  stopAllCallAudio();
  if (outgoingCallTimeout) clearTimeout(outgoingCallTimeout);
  if (activeCallTimer) clearInterval(activeCallTimer);
  activeCallTimer = null;

  const currentId = activeCallId;
  const target = activeCallTarget;
  const type = activeCallType;
  const dur = callDurationSeconds;

  activeCallId = null;
  activeCallRoomId = '';
  activeCallTarget = '';
  callDurationSeconds = 0;
  rtcIceCandidatesQueue = [];

  // Close WebRTC Peer Connection cleanly
  if (peerConnection) {
    try {
      peerConnection.close();
    } catch (e) {}
    peerConnection = null;
  }

  // Leave / destroy ZEGOCLOUD instance cleanly
  if (zegoInstance) {
    try {
      if (typeof zegoInstance.destroy === 'function') zegoInstance.destroy();
      else if (typeof zegoInstance.leaveRoom === 'function') zegoInstance.leaveRoom();
    } catch (e) {}
    zegoInstance = null;
  }

  // Stop local camera/microphone media tracks
  if (localMediaStream) {
    try {
      localMediaStream.getTracks().forEach(track => {
        try { track.stop(); } catch(e) {}
      });
    } catch (e) {}
    localMediaStream = null;
  }

  // Reset remote media stream & elements
  if (remoteMediaStream) {
    try {
      remoteMediaStream.getTracks().forEach(track => {
        try { track.stop(); } catch(e) {}
      });
    } catch (e) {}
    remoteMediaStream = null;
  }

  const localVid = document.getElementById('call-local-video');
  const remoteVid = document.getElementById('call-remote-video');
  const remoteAud = document.getElementById('call-remote-audio');
  if (localVid) localVid.srcObject = null;
  if (remoteVid) remoteVid.srcObject = null;
  if (remoteAud) remoteAud.srcObject = null;

  // Reset mute and video controls UI
  isCallMuted = false;
  isCallVideoOff = false;
  const muteBtn = document.getElementById('call-mute-btn');
  const muteIcon = document.getElementById('call-mute-icon');
  const vidBtn = document.getElementById('call-video-toggle-btn');
  const vidIcon = document.getElementById('call-video-icon');
  if (muteBtn) muteBtn.classList.remove('active-muted');
  if (muteIcon) muteIcon.innerText = '🎤';
  if (vidBtn) vidBtn.classList.remove('active-muted');
  if (vidIcon) vidIcon.innerText = '📹';

  const timerEl = document.getElementById('call-timer');
  if (timerEl) timerEl.innerText = '00:00';

  closeModal('calling-modal');
  const incomingModal = document.getElementById('incoming-call-modal');
  if (incomingModal) {
    incomingModal.classList.remove('active');
    incomingModal.style.display = 'none';
  }

  if (notifyServer && currentId && target) {
    apiFetch('/api/messages/call/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: currentId,
        action: 'END',
        targetUsername: target,
        callType: type,
        durationSeconds: dur
      })
    }).then(() => {
      if (activeChatUsername) pollDirectMessages(activeChatUsername);
    }).catch(() => {});
  } else if (activeChatUsername) {
    pollDirectMessages(activeChatUsername);
  }
}

// Graceful beforeunload cleanup if page is reloaded or closed during a call
window.addEventListener('beforeunload', () => {
  if (activeCallId && activeCallTarget) {
    const payload = JSON.stringify({
      callId: activeCallId,
      action: 'END',
      targetUsername: activeCallTarget,
      callType: activeCallType,
      durationSeconds: callDurationSeconds
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API_ORIGIN}/api/messages/call/respond`, new Blob([payload], { type: 'application/json' }));
    }
  }
});

// Flip Camera Facing Mode (Front / Back on Mobile Devices)
async function flipCameraFacingMode() {
  if (!localMediaStream || activeCallType !== 'video') {
    showToast('Camera flip is only available in video calls.', 'info');
    return;
  }

  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    const newVideoTrack = newStream.getVideoTracks()[0];
    if (!newVideoTrack) return;

    // Stop old local video track
    const oldVideoTrack = localMediaStream.getVideoTracks()[0];
    if (oldVideoTrack) {
      oldVideoTrack.stop();
      localMediaStream.removeTrack(oldVideoTrack);
    }
    localMediaStream.addTrack(newVideoTrack);

    // Update local video element
    const localVid = document.getElementById('call-local-video');
    if (localVid) {
      localVid.srcObject = localMediaStream;
      localVid.style.transform = currentFacingMode === 'user' ? 'scaleX(-1)' : 'none';
    }

    showToast(`Switched to ${currentFacingMode === 'user' ? 'Front' : 'Rear'} Camera 🔄`, 'info');
  } catch (err) {
    showToast('Failed to switch camera.', 'error');
  }
}

// Toggle Local PiP Position (Top-Left / Bottom-Right)
function togglePipPosition() {
  const pip = document.getElementById('call-local-pip-container');
  if (pip) {
    pip.classList.toggle('pip-top-left');
  }
}

function toggleCallMute() {
  isCallMuted = !isCallMuted;
  const btn = document.getElementById('call-mute-btn');
  const icon = document.getElementById('call-mute-icon');
  if (btn) btn.classList.toggle('active-muted', isCallMuted);
  if (icon) icon.innerText = isCallMuted ? '🔇' : '🎤';
  if (localMediaStream) {
    localMediaStream.getAudioTracks().forEach(t => t.enabled = !isCallMuted);
  }
  showToast(isCallMuted ? 'Microphone Muted' : 'Microphone Unmuted', 'info');
}

function toggleCallVideo() {
  isCallVideoOff = !isCallVideoOff;
  const btn = document.getElementById('call-video-toggle-btn');
  const icon = document.getElementById('call-video-icon');
  if (btn) btn.classList.toggle('active-muted', isCallVideoOff);
  if (icon) icon.innerText = isCallVideoOff ? '🚫' : '📹';
  if (localMediaStream) {
    localMediaStream.getVideoTracks().forEach(t => t.enabled = !isCallVideoOff);
  }
  showToast(isCallVideoOff ? 'Camera Turned Off' : 'Camera Active', 'info');
}

function toggleCallSpeaker() {
  isSpeakerActive = !isSpeakerActive;
  const remoteAud = document.getElementById('call-remote-audio');
  const remoteVid = document.getElementById('call-remote-video');
  const icon = document.getElementById('call-speaker-icon');

  if (remoteAud) remoteAud.volume = isSpeakerActive ? 1.0 : 0.2;
  if (remoteVid) remoteVid.volume = isSpeakerActive ? 1.0 : 0.2;
  if (icon) icon.innerText = isSpeakerActive ? '🔊' : '🔉';

  showToast(isSpeakerActive ? 'Speaker Volume: 100% 🔊' : 'Speaker Volume: Low 🔉', 'info');
}

// Test Instant Mobile Push Notification via ntfy.sh
async function testPhoneNotification() {
  const targetUser = activeProfileUsername || currentUser?.username || 'Soumya';
  try {
    showToast('Sending instant test alert to phone... 📲', 'info');
    const res = await apiFetch(`/api/users/profile/${encodeURIComponent(targetUser)}/test-ntfy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Alert dispatched to +91 9239425276! Check phone 🔔✨', 'success');
    } else {
      showToast(data.error?.message || 'Failed to dispatch test notification.', 'error');
    }
  } catch (err) {
    showToast('Error connecting to notification service.', 'error');
  }
}


// ==========================================================================
// INTERACTIVE BIRTHDAY CAKE, CANDLE EXTINGUISH & CONFETTI ENGINE
// ==========================================================================
let confettiAnimFrame = null;
let bdayCountdownInterval = null;
let isCandleExtinguished = false;

function checkBirthdayCelebration(user) {
  if (!user || !user.username) return;
  const sessionKey = `bday_wished_${user.username}_${new Date().toDateString()}`;
  if (sessionStorage.getItem(sessionKey)) return;

  sessionStorage.setItem(sessionKey, 'true');
  setTimeout(() => {
    triggerBirthdayCelebration(user.displayName || user.username);
  }, 1000);
}

function previewBirthdayWish() {
  const name = currentProfileData?.user?.displayName || activeProfileUsername || currentUser?.displayName || 'VIP Member';
  triggerBirthdayCelebration(name);
}

function playBlowSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    whiteNoise.connect(filter);
    filter.connect(ctx.destination);
    whiteNoise.start();
  } catch (e) {}
}

function playCelebrationFanfare() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const chords = [
      { f: 523.25, t: 0 },    // C5
      { f: 659.25, t: 0.12 }, // E5
      { f: 783.99, t: 0.24 }, // G5
      { f: 1046.50, t: 0.36 } // C6
    ];
    chords.forEach(c => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.f, ctx.currentTime + c.t);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + c.t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + c.t + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + c.t);
      osc.stop(ctx.currentTime + c.t + 0.65);
    });
  } catch (e) {}
}

function triggerBirthdayCelebration(name) {
  openModal('birthday-celebration-modal');

  const nameEl = document.getElementById('birthday-greet-name');
  const cakeStage = document.getElementById('bday-cake-stage');
  const wishReveal = document.getElementById('bday-wish-reveal');
  const flame = document.getElementById('bday-flame');
  const flameGlow = document.getElementById('bday-flame-glow');
  const smoke = document.getElementById('bday-smoke');
  const timerVal = document.getElementById('bday-timer-val');

  if (nameEl) nameEl.innerText = `${name} ✨`;

  // Reset candle and cake stage
  isCandleExtinguished = false;
  if (flame) flame.style.display = 'block';
  if (flameGlow) flameGlow.style.display = 'block';
  if (smoke) smoke.style.display = 'none';
  if (cakeStage) cakeStage.style.display = 'flex';
  if (wishReveal) wishReveal.style.display = 'none';

  // 5-second countdown to auto blow out candle
  let timeLeft = 5;
  if (timerVal) timerVal.innerText = '5';
  if (bdayCountdownInterval) clearInterval(bdayCountdownInterval);

  bdayCountdownInterval = setInterval(() => {
    timeLeft--;
    if (timerVal) timerVal.innerText = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(bdayCountdownInterval);
      bdayCountdownInterval = null;
      blowOutBirthdayCandle();
    }
  }, 1000);
}

function blowOutBirthdayCandle() {
  if (isCandleExtinguished) return;
  isCandleExtinguished = true;

  if (bdayCountdownInterval) {
    clearInterval(bdayCountdownInterval);
    bdayCountdownInterval = null;
  }

  const flame = document.getElementById('bday-flame');
  const flameGlow = document.getElementById('bday-flame-glow');
  const smoke = document.getElementById('bday-smoke');
  const cakeStage = document.getElementById('bday-cake-stage');
  const wishReveal = document.getElementById('bday-wish-reveal');

  // Extinguish candle flame with puff smoke
  if (flame) flame.style.display = 'none';
  if (flameGlow) flameGlow.style.display = 'none';
  if (smoke) smoke.style.display = 'block';

  // Play sound effects
  playBlowSound();
  setTimeout(() => playCelebrationFanfare(), 250);

  // Launch Falling Confetti & Floating Balloons for celebration!
  startConfettiParticles();
  launchCelebrationBalloons();

  // Transition smoothly to Grand Wish Card
  setTimeout(() => {
    if (cakeStage) cakeStage.style.display = 'none';
    if (wishReveal) {
      wishReveal.style.display = 'block';
      wishReveal.style.animation = 'scaleUpBirthday 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
  }, 700);
}

function launchCelebrationBalloons() {
  const container = document.getElementById('birthday-balloons-container');
  if (!container) return;
  container.innerHTML = '';

  const balloonIcons = ['🎈', '🎈', '🎈', '🎈', '🎈', '🎈', '🎈', '🎈', '🎈'];
  for (let i = 0; i < 20; i++) {
    const balloon = document.createElement('div');
    balloon.className = 'floating-balloon';
    balloon.innerText = balloonIcons[i % balloonIcons.length];
    balloon.style.left = `${Math.random() * 90 + 5}%`;
    balloon.style.animationDelay = `${Math.random() * 2.5}s`;
    balloon.style.fontSize = `${Math.random() * 22 + 36}px`;
    container.appendChild(balloon);
  }
}

function closeBirthdayCelebration() {
  if (bdayCountdownInterval) clearInterval(bdayCountdownInterval);
  bdayCountdownInterval = null;

  closeModal('birthday-celebration-modal');
  if (confettiAnimFrame) cancelAnimationFrame(confettiAnimFrame);
  confettiAnimFrame = null;

  const container = document.getElementById('birthday-balloons-container');
  if (container) container.innerHTML = '';
}

function startConfettiParticles() {
  const canvas = document.getElementById('birthday-confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#ffd700', '#ff007f', '#00f5d4', '#7c4dff', '#ff9100', '#00b4d8', '#ffffff'];

  for (let i = 0; i < 140; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 9 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3.5 + 2.5,
      speedX: (Math.random() - 0.5) * 2.5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 7
    });
  }

  function renderConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;

      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    confettiAnimFrame = requestAnimationFrame(renderConfetti);
  }

  if (confettiAnimFrame) cancelAnimationFrame(confettiAnimFrame);
  renderConfetti();
}

// ==========================================================================
// CHANGE PHONE NUMBER (PASSWORD VERIFIED)
// ==========================================================================
function openChangePhoneModal() {
  const phoneInput = document.getElementById('cp-new-phone');
  const passInput = document.getElementById('cp-password');
  if (phoneInput) phoneInput.value = '';
  if (passInput) passInput.value = '';
  openModal('change-phone-modal');
  if (phoneInput) setTimeout(() => phoneInput.focus(), 150);
}

function closeChangePhoneModal() {
  closeModal('change-phone-modal');
}

async function handleChangePhoneNumber(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const phoneInput = document.getElementById('cp-new-phone');
  const passInput = document.getElementById('cp-password');
  const targetUsername = activeProfileUsername || currentUser?.username;

  if (!phoneInput || !passInput || !targetUsername) return;

  const newPhoneNumber = phoneInput.value.replace(/[^0-9]/g, '').trim();
  const currentPassword = passInput.value.trim();

  // Strict 10-digit validation
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!newPhoneNumber || !phoneRegex.test(newPhoneNumber) || /^(\d)\1{9}$/.test(newPhoneNumber) || newPhoneNumber === '1234567890') {
    showToast('Please provide a valid 10-digit mobile number (e.g. 9876543210).', 'warning');
    return;
  }

  if (!currentPassword) {
    showToast('Current password is required to verify your identity.', 'warning');
    return;
  }

  try {
    const res = await apiFetch(`/api/users/profile/${encodeURIComponent(targetUsername)}/change-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPhoneNumber, currentPassword })
    });

    const data = await res.json();
    if (data.success) {
      playSuccessSound();
      showToast(data.message || 'Phone number updated successfully! 📱✨', 'success');
      closeChangePhoneModal();
      openProfileHub(targetUsername);
    } else {
      showToast(data.error?.message || 'Failed to update phone number.', 'error');
    }
  } catch (err) {
    showToast('Network error updating phone number.', 'error');
  }
}

// Hook checkPendingRequestsBadge on app initialization
setInterval(() => {
  if (currentUser) checkPendingRequestsBadge();
}, 15000);

// High-Performance Mobile & Tablet Touch Interaction Engine
function initMobileTouchInteractions() {
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!isTouchDevice) return;

  const targetSelectors = [
    '.btn-primary-3d', '.btn-hero-action', '.btn-upload', '.btn-icon',
    '.profile-action-pill', '.floating-card-3d', '.quick-action-card',
    '.widget-card', '.music-card', '.photo-card', '.gallery-item',
    '.album-card-3d', '.profile-tab-btn', '.mobile-nav-item',
    '.user-profile-badge', '.btn-pradhan-choice', '.speed-btn-step',
    '.genre-tag', '.profile-info-card', '.btn-follow-main', '.btn-edit-profile'
  ].join(',');

  document.addEventListener('touchstart', (e) => {
    const el = e.target.closest(targetSelectors);
    if (!el) return;
    el.classList.add('touch-active');
  }, { passive: true });

  const removeTouchActive = (e) => {
    const el = e.target.closest(targetSelectors);
    if (el) {
      setTimeout(() => el.classList.remove('touch-active'), 340);
    } else {
      document.querySelectorAll('.touch-active').forEach(activeEl => {
        setTimeout(() => activeEl.classList.remove('touch-active'), 340);
      });
    }
  };

  document.addEventListener('touchend', removeTouchActive, { passive: true });
  document.addEventListener('touchcancel', removeTouchActive, { passive: true });
}

// Zero-Resistance Horizontal Touch & Mouse Swipe Engine for Topbar
function initTopbarHorizontalSwipe() {
  const track = document.querySelector('.topbar-actions');
  if (!track) return;

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasMoved = false;

  // Touch handlers for mobile
  track.addEventListener('touchstart', (e) => {
    isDown = true;
    hasMoved = false;
    startX = e.touches[0].pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    if (!isDown) return;
    const x = e.touches[0].pageX - track.offsetLeft;
    const walk = (x - startX) * 1.2;
    if (Math.abs(walk) > 4) {
      hasMoved = true;
    }
    track.scrollLeft = scrollLeft - walk;
  }, { passive: true });

  track.addEventListener('touchend', () => { isDown = false; }, { passive: true });
  track.addEventListener('touchcancel', () => { isDown = false; }, { passive: true });

  // Mouse drag handlers for desktop/laptop
  track.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    isDown = true;
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  });

  track.addEventListener('mouseleave', () => { isDown = false; });
  track.addEventListener('mouseup', () => { isDown = false; });

  track.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 1.5;
    track.scrollLeft = scrollLeft - walk;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initMobileTouchInteractions();
    initTopbarHorizontalSwipe();
  });
} else {
  initMobileTouchInteractions();
  initTopbarHorizontalSwipe();
}




