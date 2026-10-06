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
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.z = 60;
  const stage = new THREE.Group();
  scene.add(stage);
  const configs = [
    { file: 'cream-puff.jpg', depth: 0 },
    { file: 'carrot-cake.jpg', depth: 1 },
    { file: 'brown-butter-cookie.jpg', depth: 2 },
  ];
  const photos = [];
  let readyCount = 0;
  const loader = new THREE.TextureLoader();
  configs.forEach((config, index) => {
    loader.load('./images/' + config.file, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      mesh.position.z = config.depth;
      stage.add(mesh);
      photos[index] = mesh;
      layoutPhotos();
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
  function layoutPhotos() {
    const mobile = width <= 650;
    let cards;
    if (mobile) {
      const gap = 8;
      const columnWidth = (width - gap * 11) / 12;
      const innerHeight = Math.max(height - 6, 1);
      const rowHeight = (innerHeight - gap) / 3.3;
      const mainHeight = rowHeight * 2.3;
      const supportTop = 6 + mainHeight + gap;
      const supportHeight = innerHeight - mainHeight - gap;
      const position = (mesh, left, top, cardWidth, cardHeight) => {
        if (!mesh) return;
        mesh.scale.set(cardWidth, cardHeight, 1);
        mesh.position.x = left + cardWidth / 2 - width / 2;
        mesh.position.y = height / 2 - top - cardHeight / 2;
      };
      cards = [
        [2 * (columnWidth + gap), 6, 8 * columnWidth + 7 * gap, mainHeight],
        [0, supportTop, 6 * columnWidth + 5 * gap, supportHeight],
        [6 * (columnWidth + gap), supportTop, 6 * columnWidth + 5 * gap, supportHeight],
      ];
      photos.forEach((mesh, index) => {
        if (mesh) position(mesh, ...cards[index]);
      });
      return;
    }

    const insetX = width * 0.04;
    const insetY = height * 0.09;
    const gapX = Math.min(16, Math.max(9, width * 0.022));
    const gapY = gapX;
    const innerWidth = width - insetX * 2;
    const innerHeight = height - insetY * 2;
    const mainWidth = (innerWidth - gapX) * 0.61;
    const sideWidth = innerWidth - mainWidth - gapX;
    const sideHeight = (innerHeight - gapY) / 2;
    cards = [
      [insetX, insetY, mainWidth, innerHeight],
      [insetX + mainWidth + gapX, insetY, sideWidth, sideHeight],
      [insetX + mainWidth + gapX, insetY + sideHeight + gapY, sideWidth, sideHeight],
    ];
    photos.forEach((mesh, index) => {
      if (!mesh) return;
      const [left, top, cardWidth, cardHeight] = cards[index];
      mesh.scale.set(cardWidth, cardHeight, 1);
      mesh.position.x = left + cardWidth / 2 - width / 2;
      mesh.position.y = height / 2 - top - cardHeight / 2;
    });
  }
  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    layoutPhotos();
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
    stage.position.x += (-aimX * 3 - stage.position.x) * 0.035;
    stage.position.y += (aimY * 2.5 - stage.position.y) * 0.035;
    stage.rotation.y += (aimX * 0.008 - stage.rotation.y) * 0.035;
    stage.rotation.x += (-aimY * 0.006 - stage.rotation.x) * 0.035;
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
