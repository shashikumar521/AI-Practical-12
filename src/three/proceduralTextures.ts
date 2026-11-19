import * as THREE from 'three';

export function createPolarGridTexture(maxAnisotropy: number, isDark: boolean): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bg = isDark ? '#0b101d' : '#eef2f7';
  const gridMinor = isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(51, 65, 85, 0.08)';
  const gridMajor = isDark ? 'rgba(59, 130, 246, 0.22)' : 'rgba(37, 99, 235, 0.18)';
  const ringAccent = isDark ? 'rgba(6, 182, 212, 0.26)' : 'rgba(8, 145, 178, 0.22)';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const step = size / 16;
  ctx.lineWidth = 1;
  ctx.strokeStyle = gridMinor;
  for (let i = 0; i <= 16; i += 1) {
    const pos = i * step;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  const cx = size / 2;
  const cy = size / 2;

  // Orthogonal primary axes
  ctx.lineWidth = 2;
  ctx.strokeStyle = gridMajor;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, size);
  ctx.moveTo(0, cy);
  ctx.lineTo(size, cy);
  ctx.stroke();

  // Concentric polar distance rings
  const radii = [110, 210, 320, 430];
  radii.forEach((r, idx) => {
    ctx.beginPath();
    ctx.lineWidth = idx === 2 ? 2 : 1.25;
    ctx.strokeStyle = idx === 2 ? ringAccent : gridMajor;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Subtle radial ticks
  ctx.strokeStyle = gridMajor;
  ctx.lineWidth = 1.5;
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const r0 = 422;
    const r1 = deg % 45 === 0 ? 442 : 434;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * r0, cy + Math.sin(rad) * r0);
    ctx.lineTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createBrushedMetalRoughnessMap(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, size, size);

  // Deterministic horizontal micro-brushed streaks (linear data map -> NoColorSpace)
  for (let y = 0; y < size; y += 1) {
    const wave = Math.sin(y * 0.45) * 18 + Math.cos(y * 1.13) * 12;
    const v = Math.max(40, Math.min(220, Math.round(135 + wave)));
    ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
    ctx.fillRect(0, y, size, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 8, cx, cx, cx);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
  grad.addColorStop(0.45, 'rgba(2, 6, 23, 0.34)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
