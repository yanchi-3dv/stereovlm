'use strict';

// A visualization of an image-space depth field, not a calibrated point-cloud
// reconstruction or model output. x/y are normalized image coordinates and z
// is dataset reference depth. The three display axes are scaled for legibility.
(() => {
  const canvas = document.getElementById('depth-canvas');
  const points = window.STEREO_DEPTH_FIELD;
  if (!canvas || !points?.length) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let yaw = -0.28;
  let pitch = 0.26;
  let colorMode = 'depth';
  let width = 0;
  let height = 0;
  let drag = null;
  let frame = null;

  const colors = points.map(p => {
    const t = Math.max(0, Math.min(1, (p[2] - 0.25) / 1.65));
    const near = [181, 218, 137];
    const far = [161, 133, 219];
    return [
      `rgba(${near.map((value, i) => Math.round(value + (far[i] - value) * t)).join(',')},0.83)`,
      `rgba(${p[3] >> 16},${(p[3] >> 8) & 255},${p[3] & 255},0.93)`
    ];
  });

  function project(x, y, z) {
    const a = x * Math.cos(yaw) + z * Math.sin(yaw);
    const b = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const c = y * Math.cos(pitch) - b * Math.sin(pitch);
    const distance = y * Math.sin(pitch) + b * Math.cos(pitch);
    const scale = Math.min(width * 0.405, height * 0.82);
    const perspective = 3.8 / (3.8 + distance * 0.35);
    return [width * 0.50 + a * scale * perspective,
      height * 0.51 + c * scale * perspective, distance, perspective];
  }

  function line(start, end) {
    const a = project(...start);
    const b = project(...end);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }

  function render() {
    frame = null;
    ctx.clearRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * 0.52, height * 0.58, 0,
      width * 0.52, height * 0.58, width * 0.53);
    glow.addColorStop(0, '#8f70b511');
    glow.addColorStop(1, '#25213200');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#9982b020';
    ctx.lineWidth = 0.6;
    for (let i = -6; i <= 6; i++) {
      const offset = i * 0.22;
      line([offset, 0.58, -0.45], [offset, 0.58, 1.25]);
    }
    for (let i = 0; i <= 8; i++) {
      const offset = i * 0.22 - 0.45;
      line([-1.32, 0.58, offset], [1.32, 0.58, offset]);
    }

    const projected = points.map((p, i) => ({
      screen: project(p[0], p[1] * 1.1, (p[2] - 0.72) * 0.92), i
    })).sort((a, b) => b.screen[2] - a.screen[2]);
    const radius = Math.max(0.75, Math.min(1.25, width / 500));
    for (const point of projected) {
      const [x, y, , perspective] = point.screen;
      if (y < 39 || y > height - 28 || x < 6 || x > width - 6) continue;
      ctx.fillStyle = colors[point.i][colorMode === 'rgb' ? 1 : 0];
      const r = radius * perspective;
      ctx.fillRect(x, y, r * 1.25, r * 1.25);
    }
  }

  function schedule() {
    if (frame === null) frame = requestAnimationFrame(render);
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    width = box.width;
    height = box.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    schedule();
  }

  canvas.addEventListener('pointerdown', event => {
    drag = { x: event.clientX, y: event.clientY, yaw, pitch };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    yaw = Math.max(-1.1, Math.min(1.1, drag.yaw + (event.clientX - drag.x) * 0.006));
    pitch = Math.max(-0.65, Math.min(0.75, drag.pitch + (event.clientY - drag.y) * 0.005));
    schedule();
  });
  const release = () => { drag = null; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') { yaw = -0.28; pitch = 0.26; }
    if (event.key === 'ArrowLeft') yaw = Math.max(-1.1, yaw - 0.08);
    if (event.key === 'ArrowRight') yaw = Math.min(1.1, yaw + 0.08);
    if (event.key === 'ArrowUp') pitch = Math.max(-0.65, pitch - 0.08);
    if (event.key === 'ArrowDown') pitch = Math.min(0.75, pitch + 0.08);
    schedule();
  });

  const colorButtons = [...document.querySelectorAll('[data-color]')];
  colorButtons.forEach(button => button.addEventListener('click', () => {
    colorMode = button.dataset.color;
    colorButtons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    schedule();
  }));
  document.getElementById('reset-view').addEventListener('click', () => {
    yaw = -0.28;
    pitch = 0.26;
    schedule();
  });

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();
})();
