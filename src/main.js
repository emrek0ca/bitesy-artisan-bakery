import * as THREE from 'three';
import './style.css';

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
menuToggle.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!expanded));
  menuToggle.setAttribute('aria-label', expanded ? 'Menüyü aç' : 'Menüyü kapat');
  nav.classList.toggle('is-open', !expanded);
});
nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menuToggle.setAttribute('aria-expanded', 'false');
  nav.classList.remove('is-open');
}));

const canvas = document.querySelector('.hero-canvas');
const host = document.querySelector('.hero__visual');
const fallback = document.querySelector('.hero-fallback');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function startHeroScene() {
  if (reducedMotion || !window.WebGLRenderingContext) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const stage = new THREE.Group();
  scene.add(stage);
  const configs = [
    { file: 'cream-puff.jpg', width: 3.2, height: 3.9, x: 0.72, y: 0.16, z: 0.3, tilt: -0.045 },
    { file: 'carrot-cake.jpg', width: 2.45, height: 2.45, x: -1.55, y: -1.32, z: -0.55, tilt: 0.055 },
    { file: 'brown-butter-cookie.jpg', width: 2.1, height: 2.1, x: 2.35, y: -1.28, z: -0.85, tilt: 0.035 },
  ];
  let readyCount = 0;
  const loader = new THREE.TextureLoader();
  configs.forEach((config, index) => {
    loader.load('./images/' + config.file, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(config.width, config.height), material);
      mesh.position.set(config.x, config.y, config.z);
      mesh.rotation.z = config.tilt;
      mesh.userData.baseY = config.y;
      mesh.userData.phase = index * 1.6;
      stage.add(mesh);
      readyCount += 1;
      if (readyCount === configs.length) {
        fallback.classList.add('is-hidden');
        canvas.classList.add('is-ready');
      }
    }, undefined, () => {});
  });

  let width = 1;
  let height = 1;
  let mouseX = 0;
  let mouseY = 0;
  let aimX = 0;
  let aimY = 0;
  let frameId = 0;
  let inView = true;
  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.position.z = width < 640 ? 9.4 : 8.2;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', (event) => {
    mouseX = ((event.clientX / window.innerWidth) - 0.5) * 2;
    mouseY = ((event.clientY / window.innerHeight) - 0.5) * 2;
  }, { passive: true });
  const observer = new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView && !frameId) render();
  });
  observer.observe(host);
  function render() {
    if (!inView || document.hidden) { frameId = 0; return; }
    frameId = requestAnimationFrame(render);
    aimX += (mouseX - aimX) * 0.025;
    aimY += (mouseY - aimY) * 0.025;
    stage.rotation.y += (aimX * 0.055 - stage.rotation.y) * 0.035;
    stage.rotation.x += (-aimY * 0.035 - stage.rotation.x) * 0.035;
    const time = performance.now() * 0.00038;
    stage.children.forEach((mesh) => {
      mesh.position.y = mesh.userData.baseY + Math.sin(time + mesh.userData.phase) * 0.025;
    });
    renderer.render(scene, camera);
  }
  render();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && inView && !frameId) render();
  });
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frameId);
    observer.disconnect();
    renderer.dispose();
    stage.children.forEach((mesh) => { mesh.geometry.dispose(); mesh.material.map?.dispose(); mesh.material.dispose(); });
  }, { once: true });
}
startHeroScene();

const revealItems = document.querySelectorAll('.product-card, .daily-section__image, .daily-section__content, .map-panel');
if ('IntersectionObserver' in window && !reducedMotion) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  revealItems.forEach((item) => { item.classList.add('reveal'); revealObserver.observe(item); });
}
