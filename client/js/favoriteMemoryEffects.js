// ==========================================================================
// FAVORITE MEMORIES — 7 CINEMATIC ANIMATION EFFECTS CONTROLLER (MODULAR)
// 1. MEMORY GALAXY (Universe / Wonder)
// 2. MAGIC PORTAL (Mystery / Magic)
// 3. TIME REWIND (Nostalgia / Past)
// 4. MEMORY WAVE (Emotion Spreading)
// 5. MEMORY MIRROR (Reflection / Memories)
// 6. MEMORY BLOOM (Growth / Beauty)
// 7. ENERGY PULSE (Powerful Emotion)
// ==========================================================================

(function () {
  'use strict';

  let currentActiveEffect = localStorage.getItem('fav_active_effect') || 'auto';
  const activeTimeouts = [];

  const EFFECTS_CONFIG = [
    { id: 'auto', name: '✨ Auto Emotion', icon: '✨', desc: 'Contextual smart animation' },
    { id: 'galaxy', name: '🌌 Galaxy', icon: '🌌', desc: 'Cosmic orbit of personal universe' },
    { id: 'portal', name: '🌀 Magic Portal', icon: '🌀', desc: 'Mysterious dimensional gateway' },
    { id: 'rewind', name: '⏳ Time Rewind', icon: '⏳', desc: 'Nostalgic time reversal' },
    { id: 'wave', name: '🌊 Emotion Wave', icon: '🌊', desc: 'Emotional ripple expansion' },
    { id: 'mirror', name: '🪞 Mirror', icon: '🪞', desc: 'Crystal reflection & shimmer' },
    { id: 'bloom', name: '🌸 Bloom', icon: '🌸', desc: 'Organic floral light radiance' },
    { id: 'pulse', name: '💓 Energy Pulse', icon: '💓', desc: 'Heartbeat shockwave burst' }
  ];

  // Helper to safely get or create FX container on a target element
  function getFxContainer(targetEl) {
    if (!targetEl) return null;
    let container = targetEl.querySelector('.fav-fx-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'fav-fx-container';
      targetEl.appendChild(container);
    }
    return container;
  }

  // Clear existing animations inside an element
  function clearElementFx(targetEl) {
    if (!targetEl) return;
    const container = targetEl.querySelector('.fav-fx-container');
    if (container) container.remove();
    const mirror = targetEl.querySelector('.fav-fx-mirror-container');
    if (mirror) mirror.remove();
    targetEl.classList.remove('fav-fx-energy-pulse-card');
  }

  // 1. MEMORY GALAXY (Universe / Wonder)
  function playGalaxyEffect(targetEl) {
    const container = getFxContainer(targetEl);
    if (!container) return;

    const aura = document.createElement('div');
    aura.className = 'fav-fx-galaxy-aura';
    container.appendChild(aura);

    const r1 = document.createElement('div');
    r1.className = 'fav-fx-orbit-ring r1';
    container.appendChild(r1);

    const r2 = document.createElement('div');
    r2.className = 'fav-fx-orbit-ring r2';
    container.appendChild(r2);

    // Spawn tiny glowing stars
    const starCount = 18;
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'fav-fx-star';
      const size = 2 + Math.random() * 4;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 2}s`;
      container.appendChild(star);
    }

    const t = setTimeout(() => {
      if (container && container.parentNode) container.remove();
    }, 4500);
    activeTimeouts.push(t);
  }

  // 2. MAGIC PORTAL (Mystery / Magic)
  function playPortalEffect(targetEl) {
    const container = getFxContainer(targetEl);
    if (!container) return;

    const wrap = document.createElement('div');
    wrap.className = 'fav-fx-portal-wrap';

    const disc = document.createElement('div');
    disc.className = 'fav-fx-portal-disc active';
    wrap.appendChild(disc);

    const ring1 = document.createElement('div');
    ring1.className = 'fav-fx-portal-ring';
    wrap.appendChild(ring1);

    const ring2 = document.createElement('div');
    ring2.className = 'fav-fx-portal-ring';
    ring2.style.animationDelay = '0.35s';
    wrap.appendChild(ring2);

    container.appendChild(wrap);

    const t = setTimeout(() => {
      if (container && container.parentNode) container.remove();
    }, 2200);
    activeTimeouts.push(t);
  }

  // 3. TIME REWIND (Nostalgia / Past)
  function playTimeRewindEffect(targetEl) {
    const container = getFxContainer(targetEl);
    if (!container) return;

    const overlay = document.createElement('div');
    overlay.className = 'fav-fx-rewind-overlay';
    container.appendChild(overlay);

    const clockRing = document.createElement('div');
    clockRing.className = 'fav-fx-clock-ring';
    container.appendChild(clockRing);

    // Spawn counter-converging particles
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'fav-fx-rewind-particle';
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 120;
      p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
      p.style.left = '50%';
      p.style.top = '50%';
      p.style.animationDelay = `${Math.random() * 0.4}s`;
      container.appendChild(p);
    }

    const t = setTimeout(() => {
      if (container && container.parentNode) container.remove();
    }, 2000);
    activeTimeouts.push(t);
  }

  // 4. MEMORY WAVE (Emotion Spreading)
  function playWaveEffect(targetEl) {
    const container = getFxContainer(targetEl);
    if (!container) return;

    const w1 = document.createElement('div');
    w1.className = 'fav-fx-wave-ring';
    container.appendChild(w1);

    const w2 = document.createElement('div');
    w2.className = 'fav-fx-wave-ring w2';
    container.appendChild(w2);

    const w3 = document.createElement('div');
    w3.className = 'fav-fx-wave-ring w3';
    container.appendChild(w3);

    const t = setTimeout(() => {
      if (container && container.parentNode) container.remove();
    }, 2200);
    activeTimeouts.push(t);
  }

  // 5. MEMORY MIRROR (Reflection / Memories)
  function playMirrorEffect(targetEl) {
    if (!targetEl) return;
    let mirror = targetEl.querySelector('.fav-fx-mirror-container');
    if (mirror) return; // already active

    const img = targetEl.querySelector('img') || targetEl.querySelector('video');
    if (!img) return;

    mirror = document.createElement('div');
    mirror.className = 'fav-fx-mirror-container';

    const clonedMedia = img.cloneNode(true);
    clonedMedia.style.width = '100%';
    clonedMedia.style.height = '100%';
    clonedMedia.style.objectFit = 'cover';
    mirror.appendChild(clonedMedia);

    const shimmer = document.createElement('div');
    shimmer.className = 'fav-fx-mirror-shimmer';
    mirror.appendChild(shimmer);

    targetEl.style.position = 'relative';
    targetEl.appendChild(mirror);
  }

  // 6. MEMORY BLOOM (Growth / Beauty)
  function playBloomEffect(targetEl) {
    const container = getFxContainer(targetEl);
    if (!container) return;

    const center = document.createElement('div');
    center.className = 'fav-fx-bloom-center';

    const flare = document.createElement('div');
    flare.className = 'fav-fx-bloom-light-flare';
    center.appendChild(flare);

    // Spawn radial flower petals
    const petalCount = 8;
    for (let i = 0; i < petalCount; i++) {
      const petal = document.createElement('div');
      petal.className = 'fav-fx-bloom-petal';
      const rot = (360 / petalCount) * i;
      petal.style.setProperty('--rot', `${rot}deg`);
      petal.style.animationDelay = `${(i % 3) * 0.08}s`;
      center.appendChild(petal);
    }

    container.appendChild(center);

    const t = setTimeout(() => {
      if (container && container.parentNode) container.remove();
    }, 2000);
    activeTimeouts.push(t);
  }

  // 7. ENERGY PULSE (Powerful Emotion)
  function playEnergyPulseEffect(targetEl) {
    if (!targetEl) return;

    targetEl.classList.remove('fav-fx-energy-pulse-card');
    void targetEl.offsetWidth; // trigger reflow
    targetEl.classList.add('fav-fx-energy-pulse-card');

    const container = getFxContainer(targetEl);
    if (!container) return;

    const shockwave = document.createElement('div');
    shockwave.className = 'fav-fx-pulse-shockwave';
    container.appendChild(shockwave);

    const shockwave2 = document.createElement('div');
    shockwave2.className = 'fav-fx-pulse-shockwave';
    shockwave2.style.animationDelay = '0.2s';
    shockwave2.style.borderColor = '#00e5ff';
    shockwave2.style.boxShadow = '0 0 35px #00e5ff';
    container.appendChild(shockwave2);

    const t = setTimeout(() => {
      targetEl.classList.remove('fav-fx-energy-pulse-card');
      if (container && container.parentNode) container.remove();
    }, 1600);
    activeTimeouts.push(t);
  }

  // Master dispatcher function
  function triggerMemoryEffect(effectName, targetEl, interactionType = 'open') {
    if (!targetEl) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let fx = effectName || currentActiveEffect;

    // Smart Auto Contextual Dispatcher
    if (fx === 'auto') {
      if (interactionType === 'open') {
        const pool = ['portal', 'rewind', 'bloom', 'galaxy'];
        fx = pool[Math.floor(Math.random() * pool.length)];
      } else if (interactionType === 'like' || interactionType === 'heart') {
        fx = Math.random() > 0.5 ? 'pulse' : 'wave';
      } else if (interactionType === 'hover' || interactionType === 'display') {
        fx = 'mirror';
      } else {
        fx = 'wave';
      }
    }

    switch (fx) {
      case 'galaxy':
        playGalaxyEffect(targetEl);
        break;
      case 'portal':
        playPortalEffect(targetEl);
        break;
      case 'rewind':
        playTimeRewindEffect(targetEl);
        break;
      case 'wave':
        playWaveEffect(targetEl);
        break;
      case 'mirror':
        playMirrorEffect(targetEl);
        break;
      case 'bloom':
        playBloomEffect(targetEl);
        break;
      case 'pulse':
        playEnergyPulseEffect(targetEl);
        break;
      default:
        playWaveEffect(targetEl);
        break;
    }
  }

  // Apply animation effect across ALL visible photo cards in the gallery
  function applyToAllCards(effectId = null) {
    const fx = effectId || currentActiveEffect;
    const allCards = document.querySelectorAll('#gallery-grid .photo-card');
    if (!allCards || allCards.length === 0) return;

    allCards.forEach((card, idx) => {
      clearElementFx(card);
      const staggerDelay = Math.min(idx * 70, 750);
      const t = setTimeout(() => {
        triggerMemoryEffect(fx, card, 'open');
      }, staggerDelay);
      activeTimeouts.push(t);
    });
  }

  // Set active effect & persist in localStorage
  function setActiveEffect(effectId) {
    currentActiveEffect = effectId;
    localStorage.setItem('fav_active_effect', effectId);

    // Update UI chips & scroll active into view
    const chips = document.querySelectorAll('.fav-fx-chip');
    chips.forEach(c => {
      if (c.dataset.fx === effectId) {
        c.classList.add('active');
        try {
          c.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } catch (e) {}
      } else {
        c.classList.remove('active');
      }
    });

    // Animate across ALL visible photo cards in the gallery
    applyToAllCards(effectId);

    if (window.showToast) {
      const cfg = EFFECTS_CONFIG.find(e => e.id === effectId);
      window.showToast(`Applied ${cfg ? cfg.name : effectId} to all memories! 💖✨`, 'info');
    }
  }

  // Attach zero-resistance touch and mouse swipe engine to the selector bar
  function initBarSwipeEngine(bar) {
    if (!bar || bar._swipeAttached) return;
    bar._swipeAttached = true;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false;

    // Touch events for mobile phones & tablets
    bar.addEventListener('touchstart', (e) => {
      isDown = true;
      isDragging = false;
      startX = e.touches[0].pageX - bar.offsetLeft;
      scrollLeft = bar.scrollLeft;
    }, { passive: true });

    bar.addEventListener('touchmove', (e) => {
      if (!isDown) return;
      const x = e.touches[0].pageX - bar.offsetLeft;
      const walk = (x - startX);
      if (Math.abs(walk) > 5) {
        isDragging = true;
      }
      bar.scrollLeft = scrollLeft - walk;
    }, { passive: true });

    bar.addEventListener('touchend', () => {
      isDown = false;
      setTimeout(() => { isDragging = false; }, 60);
    }, { passive: true });

    bar.addEventListener('touchcancel', () => {
      isDown = false;
      isDragging = false;
    }, { passive: true });

    // Mouse drag events for desktop & testing
    bar.addEventListener('mousedown', (e) => {
      isDown = true;
      isDragging = false;
      startX = e.pageX - bar.offsetLeft;
      scrollLeft = bar.scrollLeft;
    });

    bar.addEventListener('mouseleave', () => {
      isDown = false;
    });

    bar.addEventListener('mouseup', () => {
      isDown = false;
      setTimeout(() => { isDragging = false; }, 60);
    });

    bar.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - bar.offsetLeft;
      const walk = (x - startX) * 1.3;
      if (Math.abs(walk) > 5) {
        isDragging = true;
      }
      bar.scrollLeft = scrollLeft - walk;
    });

    // Delegate chip clicks so they don't fire during drag/swipe
    bar.addEventListener('click', (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const chip = e.target.closest('.fav-fx-chip');
      if (chip && chip.dataset.fx) {
        setActiveEffect(chip.dataset.fx);
      }
    });
  }

  // Render the interactive effect switcher toolbar
  function renderEffectsToolbar(containerEl) {
    if (!containerEl) return;

    let bar = containerEl.querySelector('.fav-fx-selector-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'fav-fx-selector-bar';
      containerEl.appendChild(bar);
    }

    bar.innerHTML = EFFECTS_CONFIG.map(e => `
      <button type="button" class="fav-fx-chip ${currentActiveEffect === e.id ? 'active' : ''}" data-fx="${e.id}" title="${e.desc}">
        <span>${e.icon}</span> <span>${e.name.replace(/^[^\s]+\s/, '')}</span>
      </button>
    `).join('');

    initBarSwipeEngine(bar);
  }

  // Cleanup all timers and memory
  function cleanup() {
    activeTimeouts.forEach(t => clearTimeout(t));
    activeTimeouts.length = 0;
  }

  // Expose global module
  window.FavoriteMemoryEffects = {
    trigger: triggerMemoryEffect,
    applyToAll: applyToAllCards,
    setActiveEffect: setActiveEffect,
    getActiveEffect: () => currentActiveEffect,
    renderToolbar: renderEffectsToolbar,
    playGalaxy: playGalaxyEffect,
    playPortal: playPortalEffect,
    playRewind: playTimeRewindEffect,
    playWave: playWaveEffect,
    playMirror: playMirrorEffect,
    playBloom: playBloomEffect,
    playPulse: playEnergyPulseEffect,
    clearFx: clearElementFx,
    cleanup: cleanup
  };

})();
