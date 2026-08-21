// Three.js 3D Background Engine with Pure Zero-Overhead Lifecycle
let scene, camera, renderer, photoCubes = [], particles;
let mouseX = 0, mouseY = 0;
let animFrameId = null;
let isThreeRunning = false;

function initThreeScene() {
  const canvas = document.getElementById('login-three-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const isMobile = window.innerWidth < 768;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 15;

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const purpleLight = new THREE.PointLight(0x7c4dff, 2, 40);
  purpleLight.position.set(10, 10, 10);
  scene.add(purpleLight);

  const cyanLight = new THREE.PointLight(0x00e5ff, 2, 40);
  cyanLight.position.set(-10, -10, 10);
  scene.add(cyanLight);

  // 3D Photo Cubes
  const geometry = new THREE.BoxGeometry(2, 2.6, 0.1);
  const cubeCount = isMobile ? 5 : 10;

  for (let i = 0; i < cubeCount; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: 0x12141d,
      metalness: 0.8,
      roughness: 0.3,
      emissive: i % 2 === 0 ? 0x7c4dff : 0x00e5ff,
      emissiveIntensity: 0.15
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = (Math.random() - 0.5) * 20;
    mesh.position.y = (Math.random() - 0.5) * 14;
    mesh.position.z = (Math.random() - 0.5) * 10;

    mesh.userData = {
      rotSpeedX: (Math.random() - 0.5) * 0.005,
      rotSpeedY: (Math.random() - 0.5) * 0.005,
      floatSpeed: 0.003 + Math.random() * 0.003,
      offsetY: mesh.position.y
    };

    photoCubes.push(mesh);
    scene.add(mesh);
  }

  // Glowing Particles
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = isMobile ? 30 : 60;
  const posArray = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 35;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 0.08,
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.6
  });

  particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Mouse / Touch Parallax listener
  const updatePointer = (x, y) => {
    mouseX = (x / window.innerWidth - 0.5) * 1.5;
    mouseY = (y / window.innerHeight - 0.5) * 1.5;
  };

  window.addEventListener('mousemove', (e) => updatePointer(e.clientX, e.clientY), { passive: true });

  window.addEventListener('resize', () => {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  startThreeAnimation();
}

function startThreeAnimation() {
  if (isThreeRunning) return;
  isThreeRunning = true;
  animateLoop();
}

function stopThreeAnimation() {
  isThreeRunning = false;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

function animateLoop() {
  const loginView = document.getElementById('login-view');
  if (!loginView || loginView.style.display === 'none') {
    isThreeRunning = false;
    animFrameId = null;
    return; // Completely stop loop when not on login page
  }

  if (renderer && scene && camera) {
    camera.position.x += (mouseX - camera.position.x) * 0.04;
    camera.position.y += (-mouseY - camera.position.y) * 0.04;
    camera.lookAt(scene.position);

    photoCubes.forEach((mesh) => {
      mesh.rotation.x += mesh.userData.rotSpeedX;
      mesh.rotation.y += mesh.userData.rotSpeedY;
      mesh.position.y = mesh.userData.offsetY + Math.sin(Date.now() * 0.001 * mesh.userData.floatSpeed * 100) * 0.3;
    });

    if (particles) {
      particles.rotation.y += 0.0005;
    }

    renderer.render(scene, camera);
  }

  animFrameId = requestAnimationFrame(animateLoop);
}

document.addEventListener('DOMContentLoaded', initThreeScene);
