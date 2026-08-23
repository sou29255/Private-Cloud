// GSAP Animation Engine for Cinematic Transitions
function animateLoginTransition(onComplete) {
  if (typeof gsap !== 'undefined') {
    gsap.to('.login-card', {
      scale: 0.8,
      opacity: 0,
      y: -50,
      duration: 0.5,
      ease: 'power3.in',
      onComplete: () => {
        document.getElementById('login-view').style.display = 'none';
        const appView = document.getElementById('app-view');
        appView.style.display = 'flex';
        gsap.fromTo(appView, { opacity: 0, scale: 0.95 }, { 
          opacity: 1, 
          scale: 1, 
          duration: 0.6, 
          ease: 'power3.out',
          clearProps: 'transform,scale'
        });
        if (onComplete) onComplete();
      }
    });
  } else {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('app-view').style.display = 'flex';
    if (onComplete) onComplete();
  }
}

function animateLogoutTransition() {
  if (typeof gsap !== 'undefined') {
    gsap.to('#app-view', {
      opacity: 0,
      scale: 0.95,
      duration: 0.3,
      onComplete: () => {
        const appView = document.getElementById('app-view');
        if (appView) {
          appView.style.display = 'none';
          appView.style.opacity = '1';
          appView.style.transform = 'none';
        }
        if (typeof showLoginStep1 === 'function') {
          showLoginStep1();
        } else {
          const loginView = document.getElementById('login-view');
          if (loginView) loginView.style.display = 'flex';
        }
        gsap.fromTo('.login-card', { opacity: 0, y: 30, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, clearProps: 'transform,scale' });
      }
    });
  } else {
    if (typeof showLoginStep1 === 'function') {
      showLoginStep1();
    } else {
      const appView = document.getElementById('app-view');
      if (appView) appView.style.display = 'none';
      const loginView = document.getElementById('login-view');
      if (loginView) loginView.style.display = 'flex';
    }
  }
}
