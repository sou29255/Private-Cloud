/**
 * ==============================================================================
 * PRADHAN INTERACTIVE VIRTUAL GUIDE
 * A cute, friendly human-like 3D cartoon guide character for Private Photo Cloud
 * ==============================================================================
 */

(function () {
  'use strict';

  // --- Tour Steps Configuration (Exclusively targeting existing features) ---
  const TOUR_STEPS = [
    {
      id: 'photos',
      title: '🖼️ Photo Library & Encrypted Vault',
      text: 'This is your Photo Vault! Here you can upload, view, and organize all your memories in original crystal-clear resolution with zero compression loss.',
      targetSelector: '.mobile-nav-item[data-view="all"], .nav-item[data-view="all"]',
      fallbackSelector: '#hero-section',
      action: () => { if (typeof switchView === 'function') switchView('all', 'Photo Library'); }
    },
    {
      id: 'albums',
      title: '📁 3D Interactive Albums',
      text: 'Turn your photos into living memories! Package them into 6 magical 3D presentation styles: 3D Flipbook, Tree of Life, 35mm Cinema Reel, Cosmic Orbit, and more.',
      targetSelector: '.mobile-nav-item[data-view="albums"], .nav-item[data-view="albums"]',
      fallbackSelector: '#widget-photo-count',
      action: () => { if (typeof switchView === 'function') switchView('albums', 'Photo Albums'); }
    },
    {
      id: 'videos',
      title: '🎬 High-Definition Video Vault',
      text: 'Store and stream your video memories up to 30 MB! Features native fullscreen playback with HTTP 206 Partial Content streaming for smooth seeking.',
      targetSelector: '.mobile-nav-item[data-view="videos"], .nav-item[data-view="videos"]',
      fallbackSelector: '#widget-video-count',
      action: () => { if (typeof switchView === 'function') switchView('videos', 'Video Vault'); }
    },
    {
      id: 'music',
      title: '🎵 Music Vault & Smart AI Arranger',
      text: 'Listen to music while browsing! Upload your favorite songs and our Smart AI Analyzer will automatically clean titles, detect artists, and arrange playlists with live equalizers.',
      targetSelector: '#topbar-music-btn, .mobile-nav-item[data-view="music"], .nav-item[data-view="music"]',
      fallbackSelector: '#widget-music-count',
      action: () => { if (typeof switchView === 'function') switchView('music', 'Music Vault 🎵'); }
    },
    {
      id: 'profile',
      title: '👤 Personal Profile Hub',
      text: 'Your personal command center! Customize your bio and avatar, connect with friends, and enjoy automatic birthday cake celebrations with candle extinguishing and confetti!',
      targetSelector: '#topbar-user-badge, .mobile-nav-item[data-view="profile-hub"]',
      fallbackSelector: '.nav-item[data-view="profile-hub"]',
      action: () => {}
    },
    {
      id: 'messenger',
      title: '💬 24h Direct Messenger & HD Calling',
      text: 'Private 24-hour auto-clean messenger! Chat in real-time, send follow requests, and make crystal-clear Voice & Ultra HD Video calls right inside your cloud.',
      targetSelector: '#topbar-messenger-btn',
      fallbackSelector: '.topbar-actions',
      action: () => {}
    },
    {
      id: 'assistant',
      title: '🤖 AI Cloud Assistant & Support',
      text: 'Need help or storage diagnostics anytime? Click the AI Assistant right here for smart answers and instant assistance. Have a wonderful time exploring your Private Photo Cloud!',
      targetSelector: '#ai-chat-launcher',
      fallbackSelector: '.topbar-actions',
      action: () => {}
    }
  ];

  // Internal Guide State
  let guideContainer = null;
  let characterEl = null;
  let speechBubbleEl = null;
  let spotlightEl = null;
  let currentStepIdx = 0;
  let typeWriterTimer = null;
  let soundCtx = null;
  let activeTimers = [];
  let isRunning = false;
  let hasAutoStarted = false;

  // Sound Synth Helpers
  function playBlipSound(freq = 480) {
    try {
      if (!soundCtx) {
        soundCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (soundCtx && soundCtx.state === 'suspended') {
        soundCtx.resume().catch(() => {});
      }
      if (!soundCtx) return;
      const osc = soundCtx.createOscillator();
      const gain = soundCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, soundCtx.currentTime);
      gain.gain.setValueAtTime(0.03, soundCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, soundCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(soundCtx.destination);
      osc.start();
      osc.stop(soundCtx.currentTime + 0.08);
    } catch (e) {}
  }

  function playHappyFanfare() {
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, i) => {
        const t = setTimeout(() => playBlipSound(n), i * 100);
        activeTimers.push(t);
      });
    } catch (e) {}
  }

  function playPanicSound() {
    try {
      const notes = [880, 700, 550, 400, 300];
      notes.forEach((n, i) => {
        const t = setTimeout(() => playBlipSound(n), i * 90);
        activeTimers.push(t);
      });
    } catch (e) {}
  }

  // --- Pradhan SVG 3D Cartoon Character Template ---
  function renderPradhanCharacterSVG(mood = 'happy') {
    let eyesSVG = `
      <ellipse cx="68" cy="76" rx="6" ry="8" fill="#111827"/>
      <ellipse cx="92" cy="76" rx="6" ry="8" fill="#111827"/>
      <circle cx="66" cy="73" r="2.5" fill="#ffffff"/>
      <circle cx="90" cy="73" r="2.5" fill="#ffffff"/>
    `;

    let mouthSVG = `
      <path d="M 70 94 Q 80 106 90 94" fill="none" stroke="#e11d48" stroke-width="3.5" stroke-linecap="round"/>
    `;

    let browsSVG = `
      <path d="M 62 64 Q 68 60 76 64" fill="none" stroke="#4b5563" stroke-width="3" stroke-linecap="round"/>
      <path d="M 84 64 Q 92 60 98 64" fill="none" stroke="#4b5563" stroke-width="3" stroke-linecap="round"/>
    `;

    let extraEmotionSVG = '';

    if (mood === 'excited' || mood === 'sumana') {
      eyesSVG = `
        <path d="M 62 76 Q 68 68 74 76" fill="none" stroke="#111827" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 86 76 Q 92 68 98 76" fill="none" stroke="#111827" stroke-width="3.5" stroke-linecap="round"/>
      `;
      mouthSVG = `
        <path d="M 68 92 Q 80 112 92 92 Z" fill="#e11d48" stroke="#be123c" stroke-width="2"/>
        <path d="M 73 93 Q 80 97 87 93" fill="#ffffff"/>
      `;
      extraEmotionSVG = `
        <!-- Blushing Cheeks & Sparkles -->
        <circle cx="58" cy="85" r="8" fill="#ff4081" opacity="0.45" filter="blur(2px)"/>
        <circle cx="102" cy="85" r="8" fill="#ff4081" opacity="0.45" filter="blur(2px)"/>
        <text x="30" y="50" font-size="18" fill="#ff4081">💖</text>
        <text x="110" y="46" font-size="18" fill="#ffd700">✨</text>
      `;
    } else if (mood === 'angry') {
      browsSVG = `
        <path d="M 62 60 L 76 68" stroke="#1f2937" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 98 60 L 84 68" stroke="#1f2937" stroke-width="3.5" stroke-linecap="round"/>
      `;
      eyesSVG = `
        <ellipse cx="69" cy="77" rx="5" ry="6" fill="#111827"/>
        <ellipse cx="91" cy="77" rx="5" ry="6" fill="#111827"/>
      `;
      mouthSVG = `
        <path d="M 70 100 Q 80 90 90 100" fill="none" stroke="#be123c" stroke-width="3.5" stroke-linecap="round"/>
      `;
      extraEmotionSVG = `
        <text x="108" y="55" font-size="16" fill="#ef4444">💢</text>
      `;
    } else if (mood === 'panic') {
      browsSVG = `
        <path d="M 62 66 Q 68 58 76 62" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>
        <path d="M 98 66 Q 92 58 84 62" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>
      `;
      eyesSVG = `
        <circle cx="68" cy="76" r="8" fill="#111827"/>
        <circle cx="92" cy="76" r="8" fill="#111827"/>
        <circle cx="68" cy="76" r="4" fill="#ffffff"/>
        <circle cx="92" cy="76" r="4" fill="#ffffff"/>
      `;
      mouthSVG = `
        <ellipse cx="80" cy="98" rx="8" ry="12" fill="#881337"/>
      `;
      extraEmotionSVG = `
        <!-- Sweat drop -->
        <path d="M 104 60 C 104 54 110 50 110 50 C 110 50 116 54 116 60 C 116 64 112 68 110 68 C 108 68 104 64 104 60 Z" fill="#00e5ff"/>
        <text x="24" y="60" font-size="16">😱</text>
      `;
    }

    return `
      <svg viewBox="0 0 160 210" class="pradhan-avatar-svg" width="125" height="165">
        <defs>
          <linearGradient id="prdSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffdfba"/>
            <stop offset="100%" stop-color="#f5c29a"/>
          </linearGradient>
          <linearGradient id="prdHair" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#374151"/>
            <stop offset="50%" stop-color="#1f2937"/>
            <stop offset="100%" stop-color="#111827"/>
          </linearGradient>
          <linearGradient id="prdSuit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00f5d4"/>
            <stop offset="50%" stop-color="#00b4d8"/>
            <stop offset="100%" stop-color="#7c4dff"/>
          </linearGradient>
          <filter id="prdBrightGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        <!-- Floating Shadow & Aura -->
        <ellipse cx="80" cy="202" rx="42" ry="8" fill="rgba(0, 245, 212, 0.35)" class="pradhan-shadow"/>

        <!-- Body / Virtual Guide Suit -->
        <g class="pradhan-body-group">
          <!-- Legs -->
          <rect x="62" y="156" width="14" height="36" rx="7" fill="#1e293b"/>
          <rect x="84" y="156" width="14" height="36" rx="7" fill="#1e293b"/>
          <!-- Shoes -->
          <ellipse cx="68" cy="192" rx="10" ry="6" fill="#0f172a"/>
          <ellipse cx="92" cy="192" rx="10" ry="6" fill="#0f172a"/>

          <!-- Blazer & Shirt -->
          <path d="M 44 120 C 44 110 58 108 80 108 C 102 108 116 110 116 120 L 112 162 C 112 166 102 168 80 168 C 58 168 48 166 48 162 Z" fill="url(#prdSuit)"/>
          <polygon points="80,112 70,140 90,140" fill="#ffffff"/>
          <polygon points="80,120 76,146 80,154 84,146" fill="#ff007f"/> <!-- Cute Tie -->

          <!-- Pradhan Guide Gold Badge -->
          <rect x="90" y="126" width="16" height="8" rx="2" fill="#ffd700" stroke="#b45309" stroke-width="0.8"/>
          <circle cx="94" cy="130" r="2" fill="#ffffff"/>

          <!-- Left Arm (Pointing Wand) -->
          <g class="pradhan-left-arm">
            <path d="M 46 120 Q 30 134 24 148" fill="none" stroke="url(#prdSuit)" stroke-width="12" stroke-linecap="round"/>
            <circle cx="22" cy="150" r="7" fill="url(#prdSkin)"/>
            <!-- Sparkle Pointer Star -->
            <polygon points="20,152 14,166 22,162 26,170 28,162 36,164 28,156 30,148" fill="#ffd700" filter="url(#prdBrightGlow)"/>
          </g>

          <!-- Right Arm (Waving Hand) -->
          <g class="pradhan-right-arm">
            <path d="M 114 120 Q 130 110 136 94" fill="none" stroke="url(#prdSuit)" stroke-width="12" stroke-linecap="round"/>
            <circle cx="138" cy="90" r="8" fill="url(#prdSkin)"/>
            <path d="M 132 86 C 132 82 144 82 144 86" stroke="url(#prdSkin)" stroke-width="4"/>
          </g>
        </g>

        <!-- Head, Face & Hair -->
        <g class="pradhan-head-group">
          <!-- Neck -->
          <rect x="74" y="98" width="12" height="14" rx="4" fill="url(#prdSkin)"/>

          <!-- Ears -->
          <circle cx="48" cy="78" r="8" fill="url(#prdSkin)"/>
          <circle cx="112" cy="78" r="8" fill="url(#prdSkin)"/>

          <!-- Face -->
          <ellipse cx="80" cy="78" rx="34" ry="32" fill="url(#prdSkin)"/>

          <!-- Dynamic Expressions -->
          ${browsSVG}
          ${eyesSVG}
          ${mouthSVG}
          ${extraEmotionSVG}

          <!-- Stylish Hair -->
          <path d="M 46 68 C 42 46 56 30 80 30 C 104 30 118 46 114 68 C 110 56 100 44 80 44 C 60 44 50 56 46 68 Z" fill="url(#prdHair)"/>
          <path d="M 52 46 C 60 36 72 34 86 34 C 74 38 64 44 58 54 Z" fill="#4b5563" opacity="0.6"/>
        </g>
      </svg>
    `;
  }

  // --- Inject Dialogue Bubble Content with Typewriter Effect ---
  function setDialogueContent(text, buttons = [], onTypeComplete = null) {
    if (!speechBubbleEl) return;
    if (typeWriterTimer) clearInterval(typeWriterTimer);

    const titleEl = speechBubbleEl.querySelector('.pradhan-bubble-title');
    const textEl = speechBubbleEl.querySelector('.pradhan-bubble-text');
    const actionsEl = speechBubbleEl.querySelector('.pradhan-bubble-actions');

    if (titleEl) titleEl.innerText = 'Pradhan Guide 🌟';
    if (textEl) textEl.innerHTML = '';
    
    // Render action buttons immediately so user can see and click them right away!
    renderButtons();

    let i = 0;
    typeWriterTimer = setInterval(() => {
      if (i < text.length) {
        textEl.innerHTML += escapeHtml(text.charAt(i));
        i++;
      } else {
        clearInterval(typeWriterTimer);
        typeWriterTimer = null;
        if (typeof onTypeComplete === 'function') onTypeComplete();
      }
    }, 15);

    function renderButtons() {
      if (!actionsEl) return;
      actionsEl.innerHTML = buttons.map((b, idx) => `
        <button type="button" class="btn-pradhan-choice ${b.variant || 'primary'}" data-btn-idx="${idx}">
          ${b.icon ? `<span>${b.icon}</span> ` : ''}${escapeHtml(b.text)}
        </button>
      `).join('');

      actionsEl.querySelectorAll('.btn-pradhan-choice').forEach((btn, idx) => {
        let lastTriggered = 0;
        const handleChoiceClick = (e) => {
          const now = Date.now();
          if (now - lastTriggered < 300) return; // debounce double events
          lastTriggered = now;
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          playBlipSound(880);
          if (buttons[idx] && typeof buttons[idx].onClick === 'function') {
            buttons[idx].onClick();
          }
        };
        btn.addEventListener('click', handleChoiceClick);
        btn.addEventListener('touchend', handleChoiceClick, { passive: false });
      });
    }
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }

  // --- Spotlight Target Highlighter ---
  function highlightElement(selector) {
    removeSpotlight();
    if (!selector) return null;
    try {
      const target = document.querySelector(selector);
      if (!target) return null;

      const rect = target.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;

      spotlightEl = document.createElement('div');
      spotlightEl.className = 'pradhan-spotlight-box';
      spotlightEl.style.top = `${window.scrollY + rect.top - 6}px`;
      spotlightEl.style.left = `${window.scrollX + rect.left - 6}px`;
      spotlightEl.style.width = `${rect.width + 12}px`;
      spotlightEl.style.height = `${rect.height + 12}px`;

      document.body.appendChild(spotlightEl);
      return rect;
    } catch (e) {
      return null;
    }
  }

  function createSpotlight(selector) {
    return highlightElement(selector);
  }

  function removeSpotlight() {
    if (spotlightEl && spotlightEl.parentNode) {
      spotlightEl.parentNode.removeChild(spotlightEl);
      spotlightEl = null;
    }
  }

  // --- Character Locomotion Engine ---
  function moveCharacterTo(x, y, animate = true) {
    if (!guideContainer) return;
    const winW = window.innerWidth || document.documentElement.clientWidth || 1200;
    const winH = window.innerHeight || document.documentElement.clientHeight || 800;
    const isMobile = winW <= 768;

    if (isMobile) {
      guideContainer.style.transform = 'none';
      return;
    }

    // Keep clamped inside viewport boundaries
    const safeX = Math.max(16, Math.min(winW - 460, x));
    const safeY = Math.max(16, Math.min(winH - 280, y));

    if (animate) {
      guideContainer.style.transition = 'transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)';
    } else {
      guideContainer.style.transition = 'none';
    }

    guideContainer.style.transform = `translate(${safeX}px, ${safeY}px)`;
  }

  function setCharacterMood(mood) {
    if (!characterEl) return;
    characterEl.innerHTML = renderPradhanCharacterSVG(mood);
  }

  // --- Step Flow: 1. Sumana Question ---
  function askSumanaQuestion() {
    setCharacterMood('happy');
    const winW = window.innerWidth || document.documentElement.clientWidth || 1200;
    const winH = window.innerHeight || document.documentElement.clientHeight || 800;
    const initX = Math.max(20, Math.min(winW - 460, (winW - 460) / 2));
    const initY = Math.max(20, Math.min(winH - 300, (winH - 300) / 2));
    moveCharacterTo(initX, initY, false);

    setDialogueContent('Are you Sumana?', [
      {
        text: 'YES',
        icon: '✅',
        variant: 'primary',
        onClick: handleSumanaYes
      },
      {
        text: 'NO',
        icon: '❌',
        variant: 'secondary',
        onClick: handleSumanaNo
      }
    ]);
  }

  // Helper to reliably detect authenticated username from all sources
  function getAuthenticatedUsername() {
    // 1. Direct memory reference on window
    if (window.currentUser && window.currentUser.username) {
      return String(window.currentUser.username).toLowerCase().trim();
    }
    // 2. JWT token decoded from localStorage
    try {
      const token = localStorage.getItem('vault_auth_token');
      if (token && token.includes('.')) {
        const payloadBase64 = token.split('.')[1];
        const decoded = JSON.parse(atob(payloadBase64));
        if (decoded && decoded.username) {
          return String(decoded.username).toLowerCase().trim();
        }
      }
    } catch (e) {}
    // 3. UI username element in topbar
    const topbarText = document.getElementById('topbar-user-name')?.innerText || '';
    const cleanTopbar = topbarText.toLowerCase().trim();
    if (cleanTopbar.includes('sumana') || cleanTopbar.includes('sumona')) return 'sumana';
    if (cleanTopbar.includes('soumya')) return 'soumya';
    return cleanTopbar;
  }

  // Handle YES: Authenticated Account Verification
  function handleSumanaYes() {
    const username = getAuthenticatedUsername();
    const isSumana = (username === 'sumana' || username === 'sumona' || username.includes('sumana') || username.includes('sumona'));

    if (isSumana) {
      setCharacterMood('sumana');
      playHappyFanfare();

      setDialogueContent("Yes, My Ma’am! I’ve been waiting for you.", [
        {
          text: 'Start Tour 🚀',
          icon: '✨',
          variant: 'primary',
          onClick: startWebsiteTour
        }
      ], () => {
        const t = setTimeout(() => {
          if (isRunning && currentStepIdx === 0) startWebsiteTour();
        }, 2200);
        activeTimers.push(t);
      });

    } else {
      // Not Sumana -> Accuse of lying and exit without logging out
      setCharacterMood('angry');
      playPanicSound();

      setDialogueContent("You're a liar! I'm not going to talk to you. Bye!", [
        {
          text: 'Bye 🏃',
          variant: 'danger',
          onClick: dismissPradhan
        }
      ], () => {
        const t = setTimeout(() => dismissPradhan(), 2400);
        activeTimers.push(t);
      });
    }
  }

  // Handle NO: Gender Question
  function handleSumanaNo() {
    setCharacterMood('happy');

    setDialogueContent('Are you a boy or a girl?', [
      {
        text: 'BOY',
        icon: '👦',
        variant: 'primary',
        onClick: handleBoySelected
      },
      {
        text: 'GIRL',
        icon: '👧',
        variant: 'secondary',
        onClick: handleGirlSelected
      }
    ]);
  }

  function handleBoySelected() {
    setCharacterMood('happy');
    playHappyFanfare();

    setDialogueContent('Alright, then I can talk to you.', [
      {
        text: 'Let\'s Explore! 🚀',
        icon: '✨',
        variant: 'primary',
        onClick: startWebsiteTour
      }
    ], () => {
      const t = setTimeout(() => {
        if (isRunning && currentStepIdx === 0) startWebsiteTour();
      }, 2000);
      activeTimers.push(t);
    });
  }

  function handleGirlSelected() {
    setCharacterMood('panic');
    playPanicSound();

    setDialogueContent("Oh no! Somebody save me! I can't talk to you!", [
      {
        text: 'Run Away 🏃',
        variant: 'danger',
        onClick: dismissPradhan
      }
    ], () => {
      const t = setTimeout(() => dismissPradhan(), 2400);
      activeTimers.push(t);
    });
  }

  // --- Step Flow: 2. Website Tour Engine ---
  function startWebsiteTour() {
    currentStepIdx = 0;
    showTourStep(currentStepIdx);
  }

  function showTourStep(idx) {
    if (idx < 0 || idx >= TOUR_STEPS.length) {
      finishTour();
      return;
    }

    const step = TOUR_STEPS[idx];
    if (typeof step.action === 'function') {
      try { step.action(); } catch (e) {}
    }

    // Attempt highlight
    let rect = highlightElement(step.targetSelector);
    if (!rect) rect = highlightElement(step.fallbackSelector);

    // Compute ideal floating position near the target
    const winW = window.innerWidth || 1200;
    const winH = window.innerHeight || 800;

    if (rect) {
      let targetX = rect.right + 20;
      let targetY = rect.top;

      if (targetX + 460 > winW) {
        targetX = Math.max(20, rect.left - 440);
      }
      if (targetX < 20) {
        targetX = Math.max(20, (winW - 460) / 2);
        targetY = Math.min(winH - 280, rect.bottom + 20);
      }
      if (targetY + 260 > winH) {
        targetY = Math.max(20, winH - 280);
      }

      moveCharacterTo(targetX, targetY, true);
    } else {
      moveCharacterTo(Math.max(20, winW - 480), Math.max(20, winH - 280), true);
    }

    setCharacterMood('excited');

    setDialogueContent(step.text, [
      {
        text: (idx === TOUR_STEPS.length - 1) ? 'Finish Tour 🌟' : 'NEXT ➔',
        variant: 'primary',
        onClick: () => {
          currentStepIdx++;
          showTourStep(currentStepIdx);
        }
      },
      {
        text: 'SKIP ✕',
        variant: 'secondary',
        onClick: dismissPradhan
      }
    ]);
  }

  function finishTour() {
    removeSpotlight();
    setCharacterMood('sumana');
    playHappyFanfare();
    const winW = window.innerWidth || 1200;
    const winH = window.innerHeight || 800;
    moveCharacterTo(Math.max(20, (winW - 460) / 2), Math.max(20, (winH - 280) / 2));

    setDialogueContent("That's everything! Enjoy your Private Photo Cloud. I'll always be here whenever you need me. Have a wonderful day! 💖", [
      {
        text: 'Thank You Pradhan! ✨',
        variant: 'primary',
        onClick: dismissPradhan
      }
    ], () => {
      const t = setTimeout(() => dismissPradhan(), 3600);
      activeTimers.push(t);
    });
  }

  // --- Pradhan Departure / Dismissal ---
  function dismissPradhan() {
    if (!guideContainer) return;
    removeSpotlight();

    if (guideContainer) {
      guideContainer.classList.add('pradhan-departing');
      setTimeout(() => {
        cleanupPradhan();
      }, 700);
    }
  }

  // --- Complete Cleanup ---
  function cleanupPradhan() {
    isRunning = false;
    activeTimers.forEach(t => clearTimeout(t));
    activeTimers = [];
    if (typeWriterTimer) {
      clearInterval(typeWriterTimer);
      typeWriterTimer = null;
    }

    removeSpotlight();

    if (guideContainer && guideContainer.parentNode) {
      guideContainer.parentNode.removeChild(guideContainer);
      guideContainer = null;
      characterEl = null;
      speechBubbleEl = null;
    }
  }

  // --- Build Pradhan DOM Structure ---
  function createPradhanDOM() {
    if (guideContainer && document.body.contains(guideContainer)) return;

    if (guideContainer && guideContainer.parentNode) {
      guideContainer.parentNode.removeChild(guideContainer);
    }

    guideContainer = document.createElement('div');
    guideContainer.id = 'pradhan-guide-root';
    guideContainer.className = 'pradhan-guide-container';

    // Character Wrapper
    characterEl = document.createElement('div');
    characterEl.className = 'pradhan-character-stage';
    characterEl.innerHTML = renderPradhanCharacterSVG('happy');

    // Speech Bubble Wrapper
    speechBubbleEl = document.createElement('div');
    speechBubbleEl.className = 'pradhan-speech-bubble';
    speechBubbleEl.innerHTML = `
      <div class="pradhan-bubble-header">
        <div class="pradhan-bubble-title">Pradhan Guide 🌟</div>
        <button type="button" class="pradhan-close-btn" title="Dismiss Guide" onclick="if(window.PradhanGuide) window.PradhanGuide.dismiss()">✕</button>
      </div>
      <div class="pradhan-bubble-text">Are you Sumana?</div>
      <div class="pradhan-bubble-actions"></div>
      <div class="pradhan-bubble-arrow"></div>
    `;

    guideContainer.appendChild(speechBubbleEl);
    guideContainer.appendChild(characterEl);
    document.body.appendChild(guideContainer);
  }

  // --- Main Initializer ---
  function initPradhanGuide(isManualClick = false) {
    // If not manual click and already shown in this tab session, do not auto-launch!
    if (!isManualClick) {
      const alreadyShown = sessionStorage.getItem('pradhan_guide_shown_session') === 'true';
      if (alreadyShown) return;
    }

    // Mark as shown for the current tab session so uploads/deletes/refreshes don't re-trigger it
    sessionStorage.setItem('pradhan_guide_shown_session', 'true');

    cleanupPradhan();
    isRunning = true;
    currentStepIdx = 0;

    createPradhanDOM();
    askSumanaQuestion();
  }

  // Auto-launch observer when app view becomes visible (only if not already shown in session)
  function checkAutoLaunch() {
    const alreadyShown = sessionStorage.getItem('pradhan_guide_shown_session') === 'true';
    if (alreadyShown) return;

    const appView = document.getElementById('app-view');
    const isAppVisible = appView && appView.style.display !== 'none';
    if (isAppVisible && (window.currentUser || localStorage.getItem('vault_auth_token'))) {
      initPradhanGuide(false);
    }
  }

  // Check once on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(checkAutoLaunch, 600));
  } else {
    setTimeout(checkAutoLaunch, 600);
  }

  // Expose global interface
  window.PradhanGuide = {
    start: () => initPradhanGuide(true), // Manual button click always triggers
    dismiss: dismissPradhan,
    cleanup: cleanupPradhan,
    resetSession: () => sessionStorage.removeItem('pradhan_guide_shown_session')
  };

  // Global helper for app.js
  window.initPradhanGuide = (isManual = false) => initPradhanGuide(isManual);

})();
