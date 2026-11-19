import * as THREE from 'three';
import type { AnswerStyle, StyleScoreEntry } from '../types';

export interface StyleNodeMetadata {
  style: AnswerStyle;
  position: THREE.Vector3;
  color: number;
  score: number;
  knnProbability: number;
  selectedCount: number;
  rejectedCount: number;
  featureVector: number[];
}

export interface StyleBeaconAssembly {
  style: AnswerStyle;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  gimbalMesh: THREE.Mesh;
  crestMesh: THREE.Mesh;
  proxyMesh: THREE.Mesh;
  baseY: number;
  targetHeight: number;
  currentHeight: number;
  colorHex: number;
  metadata: StyleNodeMetadata;
}

export interface CentroidRigAssembly {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  innerRing: THREE.Mesh;
  outerRing: THREE.Mesh;
  targetPos: THREE.Vector3;
  currentPos: THREE.Vector3;
}

const DEFAULT_VECTORS: Record<AnswerStyle, number[]> = {
  'Simple Explanation': [1.0, 0.0, 0.0, 0.25, 0.0, 0.0, 0.85, 0.4],
  'Detailed Explanation': [0.0, 1.0, 0.35, 0.7, 0.55, 0.35, 0.2, 0.0],
  'Technical Explanation': [0.0, 0.8, 1.0, 0.2, 0.2, 0.6, 0.0, 0.0],
  'Example-Based Explanation': [0.7, 0.3, 0.1, 1.0, 0.2, 0.1, 0.8, 0.2],
  'Short Answer': [0.8, 0.0, 0.0, 0.0, 0.0, 0.35, 0.55, 1.0],
  'Step-by-Step Explanation': [0.3, 0.8, 0.2, 0.6, 1.0, 0.2, 0.7, 0.0],
  'Professional Explanation': [0.1, 0.7, 0.55, 0.15, 0.2, 1.0, 0.0, 0.25],
  'Beginner-Friendly Explanation': [0.9, 0.3, 0.0, 0.8, 0.6, 0.0, 1.0, 0.1],
};

const STYLE_COLORS: Record<AnswerStyle, number> = {
  'Simple Explanation': 0x38bdf8,
  'Detailed Explanation': 0x3b82f6,
  'Technical Explanation': 0x8b5cf6,
  'Example-Based Explanation': 0x06b6d4,
  'Short Answer': 0x10b981,
  'Step-by-Step Explanation': 0x6366f1,
  'Professional Explanation': 0xf59e0b,
  'Beginner-Friendly Explanation': 0x22d3ee,
};

/**
 * Deterministic 3D spatial projection from the 8D feature vector onto a balanced
 * observatory ring/cluster so beacons never collide and axes remain meaningful:
 * - X: Technical & Professional Rigor vs Simplicity
 * - Z: Example & Step-by-Step Accessibility vs Brevity
 */
export function projectVectorToPlane(vec: number[], index: number): THREE.Vector3 {
  const [simple, detailed, technical, examples, steps, professional, beginner, short] = vec;
  const rawX = technical * 2.3 + professional * 1.9 - simple * 1.8 - beginner * 1.1;
  const rawZ = examples * 2.1 + steps * 1.7 + detailed * 0.8 - short * 2.2;

  // Blend deterministic axis projection with slight angular separation so all 8 sit clearly
  const angle = (index / 8) * Math.PI * 2;
  const x = rawX * 1.35 + Math.cos(angle) * 2.1;
  const z = rawZ * 1.35 + Math.sin(angle) * 2.1;
  return new THREE.Vector3(x, 0, z);
}

function createSteppedPedestalGeometry(topRadius: number, bottomRadius: number, height: number): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(bottomRadius, 0.0),
    new THREE.Vector2(bottomRadius, height * 0.28),
    new THREE.Vector2(bottomRadius * 0.86, height * 0.38),
    new THREE.Vector2(bottomRadius * 0.86, height * 0.65),
    new THREE.Vector2(topRadius, height * 0.82),
    new THREE.Vector2(topRadius, height),
    new THREE.Vector2(0.0, height),
  ];
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.computeVertexNormals();
  return geo;
}

function createBeveledFinGeometry(width: number, height: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.5, 0);
  shape.lineTo(width * 0.5, 0);
  shape.lineTo(width * 0.28, height);
  shape.lineTo(-width * 0.28, height);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

export function buildCentralCentroidRig(
  roughnessMap: THREE.Texture,
  shadowTexture: THREE.Texture,
  enableShadows: boolean
): CentroidRigAssembly {
  const group = new THREE.Group();
  group.name = 'UserPreferenceCentroidRig';

  // 1. Soft radial contact shadow flush on floor
  const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.015;
  group.add(shadowPlane);

  // 2. Lathe stepped turbine pedestal (flush at y = 0)
  const baseGeo = createSteppedPedestalGeometry(0.68, 1.05, 0.52);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.78,
    roughness: 0.38,
    roughnessMap,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.castShadow = enableShadows;
  baseMesh.receiveShadow = enableShadows;
  group.add(baseMesh);

  // 3. Brushed titanium mid-collar (contrast roughness delta >= 0.25 vs dark slate)
  const collarGeo = new THREE.CylinderGeometry(0.42, 0.55, 0.34, 24);
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.92,
    roughness: 0.16,
    roughnessMap,
  });
  const collarMesh = new THREE.Mesh(collarGeo, collarMat);
  collarMesh.position.y = 0.68;
  collarMesh.castShadow = enableShadows;
  group.add(collarMesh);

  // 4. Four beveled radial stabilizer fins
  const finGeo = createBeveledFinGeometry(0.18, 0.52, 0.07);
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.65,
    roughness: 0.48,
  });
  for (let i = 0; i < 4; i += 1) {
    const fin = new THREE.Mesh(finGeo, finMat);
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    fin.position.set(Math.cos(angle) * 0.62, 0.52, Math.sin(angle) * 0.62);
    fin.rotation.y = -angle + Math.PI / 2;
    fin.castShadow = enableShadows;
    group.add(fin);
  }

  // 5. Inner translucent preference core (clearcoat physical material)
  const coreGeo = new THREE.IcosahedronGeometry(0.44, 1);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b82f6,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.45,
    metalness: 0.1,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.y = 1.65;
  coreMesh.castShadow = enableShadows;
  group.add(coreMesh);

  // 6. Inner gyroscope ring
  const innerRingGeo = new THREE.TorusGeometry(0.72, 0.036, 16, 48);
  const ringMatA = new THREE.MeshStandardMaterial({
    color: 0x4cd7f6,
    emissive: 0x0891b2,
    emissiveIntensity: 0.35,
    metalness: 0.85,
    roughness: 0.18,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, ringMatA);
  innerRing.position.y = 1.65;
  innerRing.rotation.x = Math.PI / 3;
  group.add(innerRing);

  // 7. Outer equatorial gimbal ring
  const outerRingGeo = new THREE.TorusGeometry(0.96, 0.042, 16, 56);
  const ringMatB = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.94,
    roughness: 0.15,
    roughnessMap,
  });
  const outerRing = new THREE.Mesh(outerRingGeo, ringMatB);
  outerRing.position.y = 1.65;
  outerRing.rotation.y = Math.PI / 5;
  outerRing.castShadow = enableShadows;
  group.add(outerRing);

  // 8. Top spire cap
  const spireGeo = createSteppedPedestalGeometry(0.03, 0.16, 0.38);
  const spireMesh = new THREE.Mesh(spireGeo, collarMat);
  spireMesh.position.y = 2.28;
  group.add(spireMesh);

  return {
    group,
    coreMesh,
    innerRing,
    outerRing,
    targetPos: new THREE.Vector3(0, 0, 0),
    currentPos: new THREE.Vector3(0, 0, 0),
  };
}

export function buildStyleBeacons(
  scores: StyleScoreEntry[] | undefined,
  roughnessMap: THREE.Texture,
  shadowTexture: THREE.Texture,
  enableShadows: boolean
): StyleBeaconAssembly[] {
  const orderedStyles = Object.keys(DEFAULT_VECTORS) as AnswerStyle[];
  const scoreMap = new Map<AnswerStyle, StyleScoreEntry>();
  scores?.forEach((s) => scoreMap.set(s.style, s));

  // Shared geometries across all 8 style beacons
  const shadowGeo = new THREE.PlaneGeometry(1.9, 1.9);
  const pedestalGeo = createSteppedPedestalGeometry(0.38, 0.56, 0.34);
  const mastGeo = new THREE.CylinderGeometry(0.06, 0.1, 1.0, 16);
  const collarGeo = new THREE.TorusGeometry(0.18, 0.03, 12, 28);
  const coreGeo = new THREE.OctahedronGeometry(0.32, 0);
  const gimbalGeo = new THREE.TorusGeometry(0.48, 0.028, 12, 36);
  const crestGeo = createBeveledFinGeometry(0.16, 0.26, 0.06);
  const proxyGeo = new THREE.CylinderGeometry(0.65, 0.65, 2.8, 12);

  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
  });

  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.72,
    roughness: 0.44,
    roughnessMap,
  });

  const mastMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.18,
    roughnessMap,
  });

  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });

  return orderedStyles.map((style, idx) => {
    const entry = scoreMap.get(style);
    const vec = entry?.feature_vector || DEFAULT_VECTORS[style];
    const score = entry?.preference_score ?? 0.5;
    const knnProb = entry?.knn_probability ?? 0.5;
    const pos = projectVectorToPlane(vec, idx);
    const colorHex = STYLE_COLORS[style];

    const group = new THREE.Group();
    group.position.copy(pos);
    group.name = `Beacon_${style}`;

    // 1. Ground contact shadow
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    group.add(shadow);

    // 2. Stepped lathe pedestal (bottom-center flush at y = 0)
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.castShadow = enableShadows;
    pedestal.receiveShadow = enableShadows;
    group.add(pedestal);

    // 3. Telemetry mast & collar
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = 0.84;
    mast.castShadow = enableShadows;
    group.add(mast);

    const collar = new THREE.Mesh(collarGeo, mastMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.36;
    group.add(collar);

    // 4. Score-scaled polyhedral core (contrasting glossy physical material)
    const targetHeight = 1.25 + score * 1.45;
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.25 + score * 0.35,
      metalness: 0.18,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = targetHeight;
    coreMesh.castShadow = enableShadows;
    group.add(coreMesh);

    // 5. Metallic gimbal halo
    const gimbalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.92,
      roughness: 0.16,
    });
    const gimbalMesh = new THREE.Mesh(gimbalGeo, gimbalMat);
    gimbalMesh.position.y = targetHeight;
    gimbalMesh.rotation.x = Math.PI / 2.4;
    group.add(gimbalMesh);

    // 6. Beveled directional crest fin
    const crestMesh = new THREE.Mesh(crestGeo, coreMat);
    crestMesh.position.y = targetHeight + 0.46;
    group.add(crestMesh);

    // 7. Dedicated invisible raycast proxy on Layer 1 for crisp pointer picking
    const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
    proxyMesh.position.y = 1.4;
    proxyMesh.layers.set(1);
    proxyMesh.userData.style = style;
    group.add(proxyMesh);

    return {
      style,
      group,
      coreMesh,
      gimbalMesh,
      crestMesh,
      proxyMesh,
      baseY: targetHeight,
      targetHeight,
      currentHeight: targetHeight,
      colorHex,
      metadata: {
        style,
        position: pos.clone(),
        color: colorHex,
        score,
        knnProbability: knnProb,
        selectedCount: entry?.selected_count ?? 0,
        rejectedCount: entry?.rejected_count ?? 0,
        featureVector: vec,
      },
    };
  });
}

export function buildPerimeterPinsInstancedMesh(): THREE.InstancedMesh {
  const count = 64;
  const pinGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.24, 8);
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.85,
    roughness: 0.25,
  });

  const mesh = new THREE.InstancedMesh(pinGeo, pinMat, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const radius = i % 2 === 0 ? 7.4 : 5.6;
    const scaleY = 0.85 + (i % 4) * 0.1;
    dummy.position.set(Math.cos(angle) * radius, 0.12 * scaleY, Math.sin(angle) * radius);
    dummy.scale.set(1, scaleY, 1);
    dummy.rotation.y = angle;
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    if (i % 8 === 0) {
      color.setHex(0x38bdf8);
    } else {
      color.setHex(0x64748b);
    }
    mesh.setColorAt(i, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}
