import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Maximize2,
  Minimize2,
  Orbit,
  RotateCcw,
} from 'lucide-react';
import {
  buildCentralCentroidRig,
  buildPerimeterPinsInstancedMesh,
  buildStyleBeacons,
  type CentroidRigAssembly,
  type StyleBeaconAssembly,
} from '../three/knnSceneBuilder';
import {
  createBrushedMetalRoughnessMap,
  createContactShadowTexture,
  createPolarGridTexture,
} from '../three/proceduralTextures';
import type { AnswerStyle, StatsResponse, ThemeMode } from '../types';

interface KnnScene3DProps {
  stats: StatsResponse | null;
  theme: ThemeMode;
}

type CameraPreset = 'overview' | 'top' | 'side' | 'centroid';

// Pre-allocated scratch helpers (zero GC inside animation loop)
const _scratchVecA = new THREE.Vector3();
const _scratchVecB = new THREE.Vector3();
const _scratchTarget = new THREE.Vector3();

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number]; label: string }
> = {
  overview: { pos: [9.2, 6.8, 10.4], target: [0, 1.3, 0], label: 'Overview' },
  top: { pos: [0.01, 15.5, 0.01], target: [0, 0.5, 0], label: 'Top Map' },
  side: { pos: [12.5, 2.6, 0.4], target: [0, 1.4, 0], label: 'Elevation' },
  centroid: { pos: [3.8, 3.2, 4.2], target: [0, 1.65, 0], label: 'Centroid' },
};

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const KnnScene3D: React.FC<KnnScene3DProps> = ({ stats, theme }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [zenFullscreen, setZenFullscreen] = useState(false);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [showConduits, setShowConduits] = useState(true);
  const [activePreset, setActivePreset] = useState<CameraPreset>('overview');
  const [selectedStyle, setSelectedStyle] = useState<AnswerStyle | null>(null);
  const [hoveredStyle, setHoveredStyle] = useState<AnswerStyle | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [webglUnsupported, setWebglUnsupported] = useState(false);

  // Refs synced into the persistent Three.js loop without remounting WebGL
  const statsRef = useRef<StatsResponse | null>(stats);
  statsRef.current = stats;
  const themeRef = useRef<ThemeMode>(theme);
  themeRef.current = theme;
  const autoOrbitRef = useRef<boolean>(autoOrbit);
  autoOrbitRef.current = autoOrbit;
  const showConduitsRef = useRef<boolean>(showConduits);
  showConduitsRef.current = showConduits;

  const sceneApiRef = useRef<{
    triggerPreset: (preset: CameraPreset, focusStyle?: AnswerStyle) => void;
    syncStats: (s: StatsResponse | null) => void;
    syncTheme: (t: ThemeMode) => void;
    syncConduitsVisibility: (visible: boolean) => void;
    resize: () => void;
  } | null>(null);

  // Hotkey `H` to toggle collapsible bottom dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key.toLowerCase() === 'h' && !e.metaKey && !e.ctrlKey) {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Trigger resize when toggling zen fullscreen
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      sceneApiRef.current?.resize();
    });
    return () => cancelAnimationFrame(id);
  }, [zenFullscreen]);

  // Push stats updates into live 3D scene
  useEffect(() => {
    sceneApiRef.current?.syncStats(stats);
  }, [stats]);

  // Push theme updates into live 3D scene
  useEffect(() => {
    sceneApiRef.current?.syncTheme(theme);
  }, [theme]);

  // Push conduit visibility into live 3D scene
  useEffect(() => {
    sceneApiRef.current?.syncConduitsVisibility(showConduits);
  }, [showConduits]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnsupported(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    const initialIsDark = themeRef.current === 'dark';
    const skyHex = initialIsDark ? 0x0b0f19 : 0xe8edf5;
    scene.background = new THREE.Color(skyHex);
    scene.fog = new THREE.FogExp2(skyHex, 0.028);

    // Mandatory Studio RoomEnvironment via PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.2;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.autoRotate = !isSoftwareGl && autoOrbitRef.current;
    controls.autoRotateSpeed = 0.65;

    // Three-point warm/cool studio lighting rig (1 shadow caster with tight frustum)
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.9);
    keyLight.position.set(8, 12, 7);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 32;
    keyLight.shadow.camera.left = -9;
    keyLight.shadow.camera.right = 9;
    keyLight.shadow.camera.top = 9;
    keyLight.shadow.camera.bottom = -9;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-8, 6, -9);
    scene.add(rimLight);

    // Procedural Textures
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    let gridTexture = createPolarGridTexture(maxAnisotropy, initialIsDark);
    const roughnessMap = createBrushedMetalRoughnessMap(maxAnisotropy);
    const shadowTexture = createContactShadowTexture();

    // Ground Observatory Disc
    const floorGeo = new THREE.CircleGeometry(18, 72);
    const floorMat = new THREE.MeshStandardMaterial({
      map: gridTexture,
      roughness: 0.78,
      metalness: 0.14,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    // Instanced Perimeter Pins (64 instances)
    const perimeterPins = buildPerimeterPinsInstancedMesh();
    scene.add(perimeterPins);

    // Hero Central Centroid Rig & 8 Answer Style Beacons
    const centroidRig: CentroidRigAssembly = buildCentralCentroidRig(
      roughnessMap,
      shadowTexture,
      !isSoftwareGl
    );
    scene.add(centroidRig.group);

    const beacons: StyleBeaconAssembly[] = buildStyleBeacons(
      statsRef.current?.knn_scores,
      roughnessMap,
      shadowTexture,
      !isSoftwareGl
    );
    const clickableProxies: THREE.Object3D[] = [];
    beacons.forEach((b) => {
      scene.add(b.group);
      clickableProxies.push(b.proxyMesh);
    });

    // Dynamic KNN Neighbor Conduit Group
    const conduitGroup = new THREE.Group();
    conduitGroup.visible = showConduitsRef.current;
    scene.add(conduitGroup);

    const rebuildConduits = (s: StatsResponse | null) => {
      while (conduitGroup.children.length > 0) {
        const child = conduitGroup.children[0] as THREE.Mesh;
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
        conduitGroup.remove(child);
      }

      const k = Math.max(1, Math.min(8, s?.n_neighbors ?? 3));
      const sorted = [...beacons].sort((a, b) => b.metadata.score - a.metadata.score);
      const topK = sorted.slice(0, k);

      topK.forEach((beacon, idx) => {
        const p0 = new THREE.Vector3(
          centroidRig.targetPos.x,
          1.65,
          centroidRig.targetPos.z
        );
        const p2 = new THREE.Vector3(
          beacon.group.position.x,
          beacon.targetHeight,
          beacon.group.position.z
        );
        const mid = p0.clone().lerp(p2, 0.5);
        mid.y = Math.max(p0.y, p2.y) + 0.85 + idx * 0.12;

        const curve = new THREE.CatmullRomCurve3([p0, mid, p2]);
        const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.026, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: beacon.colorHex,
          emissive: beacon.colorHex,
          emissiveIntensity: 0.45,
          metalness: 0.35,
          roughness: 0.25,
          transparent: true,
          opacity: idx === 0 ? 0.92 : 0.62,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        conduitGroup.add(tubeMesh);
      });
    };

    const syncStats = (s: StatsResponse | null) => {
      const scoreMap = new Map(s?.knn_scores.map((item) => [item.style, item]) || []);
      let weightedX = 0;
      let weightedZ = 0;
      let totalWeight = 0;

      beacons.forEach((b) => {
        const entry = scoreMap.get(b.style);
        const score = entry?.preference_score ?? 0.5;
        b.targetHeight = 1.25 + score * 1.45;
        b.metadata.score = score;
        b.metadata.knnProbability = entry?.knn_probability ?? 0.5;
        b.metadata.selectedCount = entry?.selected_count ?? 0;
        b.metadata.rejectedCount = entry?.rejected_count ?? 0;

        // Weighted attraction toward preferred styles
        const w = Math.max(0, score - 0.45) + (entry?.selected_count ?? 0) * 0.25;
        if (w > 0) {
          weightedX += b.group.position.x * w;
          weightedZ += b.group.position.z * w;
          totalWeight += w;
        }
      });

      if (totalWeight > 0 && (s?.comparisons ?? 0) > 0) {
        centroidRig.targetPos.set(
          THREE.MathUtils.clamp(weightedX / totalWeight, -3.5, 3.5),
          0,
          THREE.MathUtils.clamp(weightedZ / totalWeight, -3.5, 3.5)
        );
      } else {
        centroidRig.targetPos.set(0, 0, 0);
      }

      rebuildConduits(s);
    };

    syncStats(statsRef.current);

    // Smooth camera preset transition state (cancelled on OrbitControls 'start')
    let transitionActive = false;
    const desiredCamPos = new THREE.Vector3(...CAMERA_PRESETS.overview.pos);
    const desiredCamTarget = new THREE.Vector3(...CAMERA_PRESETS.overview.target);

    const onControlsStart = () => {
      transitionActive = false;
    };
    controls.addEventListener('start', onControlsStart);

    // Raycasting on Layer 1 for crisp beacon inspection
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();
    let lastMoveRaycast = 0;

    const updatePointerNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveRaycast < 50) return;
      lastMoveRaycast = now;
      updatePointerNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      if (hits.length > 0) {
        const hitStyle = hits[0].object.userData.style as AnswerStyle;
        setHoveredStyle(hitStyle);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredStyle(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    let pointerDownPos = { x: 0, y: 0 };
    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return; // Ignore orbit drags
      updatePointerNdc(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      if (hits.length > 0) {
        const hitStyle = hits[0].object.userData.style as AnswerStyle;
        setSelectedStyle(hitStyle);
        const match = beacons.find((b) => b.style === hitStyle);
        if (match) {
          desiredCamTarget.set(
            match.group.position.x,
            match.targetHeight,
            match.group.position.z
          );
          desiredCamPos.set(
            match.group.position.x + 3.4,
            match.targetHeight + 1.8,
            match.group.position.z + 3.4
          );
          transitionActive = true;
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Pre-warm shaders on GPU devices
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    sceneApiRef.current = {
      triggerPreset: (preset: CameraPreset, focusStyle?: AnswerStyle) => {
        if (focusStyle) {
          const match = beacons.find((b) => b.style === focusStyle);
          if (match) {
            desiredCamTarget.set(
              match.group.position.x,
              match.targetHeight,
              match.group.position.z
            );
            desiredCamPos.set(
              match.group.position.x + 3.4,
              match.targetHeight + 1.8,
              match.group.position.z + 3.4
            );
            transitionActive = true;
            return;
          }
        }
        const p = CAMERA_PRESETS[preset];
        desiredCamPos.set(...p.pos);
        desiredCamTarget.set(...p.target);
        if (preset === 'centroid') {
          desiredCamTarget.set(centroidRig.targetPos.x, 1.65, centroidRig.targetPos.z);
          desiredCamPos.set(
            centroidRig.targetPos.x + 3.8,
            3.2,
            centroidRig.targetPos.z + 4.2
          );
        }
        transitionActive = true;
      },
      syncStats,
      syncTheme: (t: ThemeMode) => {
        const dark = t === 'dark';
        const nextHex = dark ? 0x0b0f19 : 0xe8edf5;
        (scene.background as THREE.Color).setHex(nextHex);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(nextHex);
        }
        const nextGrid = createPolarGridTexture(maxAnisotropy, dark);
        floorMat.map = nextGrid;
        floorMat.needsUpdate = true;
        gridTexture.dispose();
        gridTexture = nextGrid;
      },
      syncConduitsVisibility: (visible: boolean) => {
        conduitGroup.visible = visible;
      },
      resize: handleResize,
    };

    // Animation loop with software WebGL fence-sync pacing & zero per-frame allocations
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.elapsedTime;
      const dampAlpha = 1 - Math.exp(-6.0 * dt);

      // Update OrbitControls auto-rotate state
      controls.autoRotate = !isSoftwareGl && autoOrbitRef.current && !transitionActive;

      // Damped camera preset transitions
      if (transitionActive) {
        camera.position.lerp(desiredCamPos, dampAlpha);
        controls.target.lerp(desiredCamTarget, dampAlpha);
        if (
          camera.position.distanceToSquared(desiredCamPos) < 0.002 &&
          controls.target.distanceToSquared(desiredCamTarget) < 0.002
        ) {
          camera.position.copy(desiredCamPos);
          controls.target.copy(desiredCamTarget);
          transitionActive = false;
        }
      }

      // Smoothly damp central user centroid position & animate gimbal rings
      _scratchVecA.copy(centroidRig.currentPos).lerp(centroidRig.targetPos, dampAlpha);
      centroidRig.currentPos.copy(_scratchVecA);
      centroidRig.group.position.copy(centroidRig.currentPos);
      centroidRig.coreMesh.rotation.y = elapsed * 0.55;
      centroidRig.innerRing.rotation.z = elapsed * 0.7;
      centroidRig.outerRing.rotation.y = elapsed * 0.4;

      // Smoothly damp each Style Beacon elevation & subtle orbital bobbing
      for (let i = 0; i < beacons.length; i += 1) {
        const b = beacons[i];
        b.currentHeight = THREE.MathUtils.lerp(b.currentHeight, b.targetHeight, dampAlpha);
        const bob = Math.sin(elapsed * 1.4 + i * 0.8) * 0.05;
        b.coreMesh.position.y = b.currentHeight + bob;
        b.gimbalMesh.position.y = b.currentHeight + bob;
        b.crestMesh.position.y = b.currentHeight + 0.46 + bob;
        b.coreMesh.rotation.y = elapsed * 0.45 + i * 0.4;
        b.gimbalMesh.rotation.z = elapsed * 0.35 - i * 0.25;
      }

      _scratchTarget.copy(controls.target);
      _scratchVecB.copy(camera.position);
      controls.update();

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlsStart);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      controls.dispose();
      envTarget.dispose();
      gridTexture.dispose();
      roughnessMap.dispose();
      shadowTexture.dispose();

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });

      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      sceneApiRef.current = null;
    };
  }, []);

  const inspectedStyle = hoveredStyle || selectedStyle;
  const inspectedEntry = useMemo(() => {
    if (!inspectedStyle) return null;
    return stats?.knn_scores.find((s) => s.style === inspectedStyle) || null;
  }, [inspectedStyle, stats]);

  const handleSelectPreset = useCallback((preset: CameraPreset) => {
    setActivePreset(preset);
    if (preset === 'overview') {
      setSelectedStyle(null);
    }
    sceneApiRef.current?.triggerPreset(preset);
  }, []);

  const handleFocusStyle = useCallback((style: AnswerStyle) => {
    setSelectedStyle(style);
    sceneApiRef.current?.triggerPreset('centroid', style);
  }, []);

  const allStyles = useMemo(
    () =>
      stats?.knn_scores.map((s) => s.style) || [
        'Simple Explanation',
        'Detailed Explanation',
        'Technical Explanation',
        'Example-Based Explanation',
        'Short Answer',
        'Step-by-Step Explanation',
        'Professional Explanation',
        'Beginner-Friendly Explanation',
      ],
    [stats]
  );

  return (
    <div
      className={
        zenFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[#0b0f19] overflow-hidden select-none'
          : 'relative w-full h-[calc(100vh-57px)] overflow-hidden select-none'
      }
    >
      {/* Dedicated empty Three.js WebGL container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* WebGL unavailable or lost fallback */}
      {(webglUnsupported || contextLost) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 text-slate-200 p-6 text-center">
          <div className="max-w-md space-y-2">
            <h3 className="font-display font-semibold text-lg">
              {webglUnsupported ? 'WebGL Unavailable' : 'Restoring 3D Viewport...'}
            </h3>
            <p className="text-xs text-slate-400">
              {webglUnsupported
                ? 'Your browser environment does not support WebGL rendering for the 3D KNN Observatory.'
                : 'The WebGL graphics context was interrupted and is attempting recovery.'}
            </p>
          </div>
        </div>
      )}

      {/* Minimal Top-Left HUD Badge / Selected Beacon Inspector (solid/rgba surface, NO backdrop-filter over WebGL) */}
      <div
        className="absolute top-4 left-4 z-10 max-w-xs rounded-xl border px-3.5 py-2.5 shadow-lg pointer-events-auto"
        style={{
          backgroundColor: theme === 'dark' ? 'rgba(15, 19, 29, 0.88)' : 'rgba(255, 255, 255, 0.92)',
          borderColor: theme === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.35)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-display font-semibold text-xs text-slate-900 dark:text-[#F8FAFC]">
            {inspectedStyle ? inspectedStyle : '3D KNN Vector Observatory'}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-[#2563EB] dark:text-[#4cd7f6]">
            k={stats?.n_neighbors ?? 3}
          </span>
        </div>

        {inspectedEntry ? (
          <div className="mt-1.5 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-3 font-mono tabular-nums">
              <span>Score: {Math.round(inspectedEntry.preference_score * 100)}%</span>
              <span>KNN: {Math.round(inspectedEntry.knn_probability * 100)}%</span>
              <span>
                +{inspectedEntry.selected_count}/-{inspectedEntry.rejected_count}
              </span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
              vec: [{inspectedEntry.feature_vector.map((v) => v.toFixed(1)).join(', ')}]
            </div>
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Drag to orbit · Scroll to zoom · Click any style beacon to inspect its KNN vector.
          </p>
        )}
      </div>

      {/* Unified Collapsible Bottom Control Dock (<= 15% viewport, solid/rgba surface, NO backdrop-filter) */}
      <div
        className="fixed z-20 transition-transform duration-200"
        style={{
          bottom: '16px',
          left: '50%',
          transform: dockCollapsed
            ? 'translate(-50%, calc(100% - 34px))'
            : 'translate(-50%, 0)',
          maxWidth: 'min(920px, 94vw)',
          width: 'max-content',
        }}
      >
        {/* Collapse / Expand Tab */}
        <div className="flex justify-center mb-1.5">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-medium transition-colors"
            style={{
              backgroundColor:
                theme === 'dark' ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255, 255, 255, 0.94)',
              borderColor:
                theme === 'dark' ? 'rgba(148, 163, 184, 0.22)' : 'rgba(148, 163, 184, 0.4)',
              color: theme === 'dark' ? '#dfe2f1' : '#0f172a',
            }}
            title="Toggle controls dock (Hotkey: H)"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide Controls (H)</span>
              </>
            )}
          </button>
        </div>

        {/* Main Dock Panel */}
        <div
          className="rounded-xl border px-3.5 py-2.5 shadow-xl space-y-2"
          style={{
            backgroundColor:
              theme === 'dark' ? 'rgba(15, 19, 29, 0.92)' : 'rgba(255, 255, 255, 0.95)',
            borderColor:
              theme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.35)',
          }}
        >
          {/* Row 1: Camera Presets + Scene Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                    activePreset === preset
                      ? 'bg-[#3B82F6] text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  {CAMERA_PRESETS[preset].label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowConduits((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border whitespace-nowrap transition-colors ${
                  showConduits
                    ? 'border-[#06B6D4]/50 bg-[#06B6D4]/15 text-[#0891B2] dark:text-[#4cd7f6]'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>KNN Links</span>
              </button>

              <button
                type="button"
                onClick={() => setAutoOrbit((prev) => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border whitespace-nowrap transition-colors ${
                  autoOrbit
                    ? 'border-[#3B82F6]/50 bg-[#3B82F6]/15 text-[#2563EB] dark:text-[#adc6ff]'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Orbit className="w-3 h-3" />
                <span>Auto-Orbit</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('overview')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#3B82F6] whitespace-nowrap"
                title="Reset camera view"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={() => setZenFullscreen((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#3B82F6] whitespace-nowrap"
                title="Toggle full-viewport Zen mode"
              >
                {zenFullscreen ? (
                  <Minimize2 className="w-3 h-3" />
                ) : (
                  <Maximize2 className="w-3 h-3" />
                )}
                <span>{zenFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Quick Style Focus Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-200/70 dark:border-slate-800/80">
            {allStyles.map((style) => {
              const shortLabel = style.replace(' Explanation', '');
              const isChosen = selectedStyle === style;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => handleFocusStyle(style as AnswerStyle)}
                  className={`px-2 py-1 rounded text-[11px] whitespace-nowrap shrink-0 transition-colors ${
                    isChosen
                      ? 'bg-[#3B82F6] text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
