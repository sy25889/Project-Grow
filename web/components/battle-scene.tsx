'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = {
  barrierRatio: number;
  bossHealthRatio: number;
  groggyRemaining: number;
  lightBarrierRemaining: number;
  lightBarrierCastPulse: number;
  partyShields: number[];
};

type Effect = {
  mesh: THREE.Object3D;
  life: number;
  maxLife: number;
  kind: 'bolt' | 'slash' | 'heal' | 'debris' | 'barrierWave' | 'shieldImpact';
  speed?: number;
  velocity?: THREE.Vector3;
};

type HeroRig = {
  root: THREE.Group;
  weapon?: THREE.Group;
  sprite?: THREE.Sprite;
  orb?: THREE.Mesh;
  shield?: THREE.Group;
  base: THREE.Vector3;
  baseScale: number;
};

const HERO_COLORS = [0x3c8fd3, 0xf09a45, 0xb875d7, 0x4dbd9a];
const HERO_POSITIONS = [
  new THREE.Vector3(-5.9, -1.45, 0.25),
  new THREE.Vector3(-1.55, -1.48, 0.05),
  new THREE.Vector3(-7.65, -1.12, 1.15),
  new THREE.Vector3(-3.55, -1.08, 1.05),
];

function material(color: number, roughness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.06 });
}

function addMesh(group: THREE.Object3D, geometry: THREE.BufferGeometry, meshMaterial: THREE.Material, position: THREE.Vector3Tuple, scale?: THREE.Vector3Tuple) {
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function transparentMaterial(color: number, opacity: number) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
}

type ConceptSprite = { spriteWidth: number; spriteHeight: number; scale: number };

const CONCEPT_SPRITES: ConceptSprite[] = [
  { spriteWidth: 3.1, spriteHeight: 3.85, scale: 1.08 },
  { spriteWidth: 2.72, spriteHeight: 3.52, scale: 1 },
  { spriteWidth: 2.82, spriteHeight: 3.34, scale: 0.98 },
  { spriteWidth: 2.68, spriteHeight: 3.48, scale: 0.98 },
];

const SPRITE_ATLAS_WIDTH = 2172;
const SPRITE_ATLAS_HEIGHT = 724;
const SPRITE_COLUMN_WIDTH = SPRITE_ATLAS_WIDTH / 4;

function removeCheckerboardBackground(imageData: ImageData) {
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const isBackground = (pixel: number) => {
    const offset = pixel * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    return Math.max(red, green, blue) - Math.min(red, green, blue) < 16 && Math.min(red, green, blue) > 175;
  };
  const enqueue = (pixel: number) => {
    if (!visited[pixel] && isBackground(pixel)) {
      visited[pixel] = 1;
      queue[tail] = pixel;
      tail += 1;
    }
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixel = queue[head];
    head += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(pixel - 1);
    if (x < width - 1) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y < height - 1) enqueue(pixel + width);
  }

  visited.forEach((isTransparent, pixel) => {
    if (isTransparent) data[pixel * 4 + 3] = 0;
  });
}

function createConceptSpriteTexture(index: number) {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_COLUMN_WIDTH;
  canvas.height = SPRITE_ATLAS_HEIGHT;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (!context) return texture;
  const image = new Image();
  image.onload = () => {
    context.drawImage(
      image,
      index * SPRITE_COLUMN_WIDTH,
      0,
      SPRITE_COLUMN_WIDTH,
      SPRITE_ATLAS_HEIGHT,
      0,
      0,
      SPRITE_COLUMN_WIDTH,
      SPRITE_ATLAS_HEIGHT,
    );
    const imageData = context.getImageData(0, 0, SPRITE_COLUMN_WIDTH, SPRITE_ATLAS_HEIGHT);
    removeCheckerboardBackground(imageData);
    context.putImageData(imageData, 0, 0);
    texture.needsUpdate = true;
  };
  image.src = '/concepts/project-grow-party-sprites.png';
  return texture;
}

function createConceptHero(index: number): HeroRig {
  const conceptSprite = CONCEPT_SPRITES[index];
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createConceptSpriteTexture(index),
    transparent: true,
    depthWrite: false,
    alphaTest: 0.03,
  }));
  sprite.center.set(0.5, 0);
  sprite.scale.set(conceptSprite.spriteWidth, conceptSprite.spriteHeight, 1);
  const root = new THREE.Group();
  root.add(sprite);
  root.scale.setScalar(conceptSprite.scale);
  root.position.copy(HERO_POSITIONS[index]);
  return { root, sprite, base: HERO_POSITIONS[index].clone(), baseScale: conceptSprite.scale };
}

function createVineblight() {
  const root = new THREE.Group();
  const bark = material(0x49634a, 0.92);
  const vine = material(0x397450, 0.86);
  const core = new THREE.MeshStandardMaterial({ color: 0xb6ff5d, emissive: 0x4fbd4b, emissiveIntensity: 1.35, roughness: 0.3 });
  addMesh(root, new THREE.DodecahedronGeometry(0.48, 0), bark, [0, 0.42, 0], [1.05, 0.92, 0.9]);
  addMesh(root, new THREE.SphereGeometry(0.13, 12, 8), core, [0.1, 0.48, 0.43]);
  [-0.32, 0.32].forEach((x) => {
    const rootLeg = addMesh(root, new THREE.ConeGeometry(0.1, 0.72, 5), vine, [x, -0.02, 0]);
    rootLeg.rotation.z = x < 0 ? 0.62 : -0.62;
  });
  [-0.42, 0.42].forEach((x) => {
    const tendril = addMesh(root, new THREE.TorusGeometry(0.32, 0.045, 6, 14, Math.PI * 1.1), vine, [x, 0.48, -0.02]);
    tendril.rotation.z = x < 0 ? 2.1 : -0.55;
  });
  return root;
}

function createBarkBeetle() {
  const root = new THREE.Group();
  const shell = material(0x6d7050, 0.96);
  const plate = material(0x475646, 0.95);
  const underbody = material(0x2e4439, 1);
  addMesh(root, new THREE.SphereGeometry(0.58, 14, 10), shell, [0, 0.35, 0], [1.28, 0.58, 0.88]);
  addMesh(root, new THREE.DodecahedronGeometry(0.34, 0), plate, [0.52, 0.26, 0.03], [1.05, 0.68, 0.72]);
  [-0.26, 0, 0.26].forEach((x) => {
    const segment = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 16, Math.PI), plate);
    segment.position.set(x, 0.42, 0.12); segment.rotation.set(Math.PI / 2, 0, Math.PI / 2); root.add(segment);
  });
  [-0.35, 0, 0.35].forEach((x) => {
    [-1, 1].forEach((side) => {
      const leg = addMesh(root, new THREE.ConeGeometry(0.055, 0.55, 4), underbody, [x, 0.06, side * 0.3]);
      leg.rotation.z = side * 1.05;
    });
  });
  addMesh(root, new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xb4ef80, emissive: 0x3d9b57, emissiveIntensity: 1 }), [0.78, 0.32, 0.26]);
  return root;
}

function createBlightedFairy() {
  const root = new THREE.Group();
  const leaf = material(0x5a8f6b, 0.7);
  const corruption = new THREE.MeshStandardMaterial({ color: 0xa77bf0, emissive: 0x6332ba, emissiveIntensity: 1.2, roughness: 0.25 });
  addMesh(root, new THREE.ConeGeometry(0.25, 0.62, 5), leaf, [0, 0.34, 0], [1, 1, 0.65]);
  addMesh(root, new THREE.SphereGeometry(0.2, 12, 10), material(0xd7ac88, 0.9), [0, 0.86, 0]);
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.38), transparentMaterial(side < 0 ? 0xa8f5c6 : 0xbf8eff, 0.52));
    wing.position.set(side * 0.34, 0.66, -0.04); wing.rotation.y = side * 0.5; wing.rotation.z = side * 0.22; root.add(wing);
  });
  addMesh(root, new THREE.SphereGeometry(0.08, 10, 8), corruption, [0, 0.94, 0.18]);
  return root;
}

function createAncientGuardian() {
  const root = new THREE.Group();
  const bark = material(0x594b35, 0.95);
  const darkBark = material(0x383c31, 1);
  const moss = material(0x5f9654, 0.88);
  addMesh(root, new THREE.CylinderGeometry(0.4, 0.56, 1.55, 6), bark, [0, 0.7, 0]);
  addMesh(root, new THREE.DodecahedronGeometry(0.4, 0), darkBark, [0, 1.68, 0], [1.08, 0.78, 0.8]);
  [-0.72, 0.72].forEach((x) => {
    const arm = addMesh(root, new THREE.CapsuleGeometry(0.19, 0.72, 4, 8), bark, [x, 0.98, 0]);
    arm.rotation.z = x < 0 ? 0.78 : -0.78;
    addMesh(root, new THREE.DodecahedronGeometry(0.25, 0), darkBark, [x * 1.25, 0.58, 0]);
  });
  [-0.3, 0.3].forEach((x) => addMesh(root, new THREE.ConeGeometry(0.12, 0.7, 5), darkBark, [x, -0.12, 0]));
  addMesh(root, new THREE.DodecahedronGeometry(0.27, 0), moss, [-0.34, 1.24, -0.2]);
  addMesh(root, new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd2c275, emissive: 0x8c8b38, emissiveIntensity: 0.8 }), [0, 1.67, 0.32]);
  return root;
}

export function BattleScene({ barrierRatio, bossHealthRatio, groggyRemaining, lightBarrierRemaining, lightBarrierCastPulse, partyShields }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ barrierRatio, bossHealthRatio, groggyRemaining, lightBarrierRemaining, lightBarrierCastPulse, partyShields });
  stateRef.current = { barrierRatio, bossHealthRatio, groggyRemaining, lightBarrierRemaining, lightBarrierCastPulse, partyShields };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7bb8ca);
    scene.fog = new THREE.FogExp2(0x79b6c4, 0.045);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 80);
    const cameraTarget = new THREE.Vector3(0.25, 0.15, 0);
    camera.position.set(0.1, 2.25, 17);
    camera.lookAt(cameraTarget);
    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    scene.add(new THREE.HemisphereLight(0xdbf8ff, 0x3b5f46, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffedbd, 3.3);
    keyLight.position.set(-7, 11, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x6fe7d5, 10, 14, 2);
    rimLight.position.set(3.8, 4, -1.5);
    scene.add(rimLight);

    const ground = new THREE.Group();
    const grass = material(0x609760, 0.98);
    const platform = addMesh(ground, new THREE.CylinderGeometry(8.8, 9.7, 0.72, 18), grass, [0, -2.05, 0], [1, 1, 0.57]);
    platform.receiveShadow = true;
    const soil = addMesh(ground, new THREE.CylinderGeometry(8.75, 9.7, 0.4, 18), material(0x465d45, 1), [0, -2.33, 0], [1, 1, 0.57]);
    soil.receiveShadow = true;
    [[-5.8, -1.68, 1.2], [-1.4, -1.65, 0.65], [1.2, -1.67, 1.15], [6.2, -1.68, 0.5]].forEach(([x, y, z]) => {
      const tuft = new THREE.Group();
      for (let index = 0; index < 4; index += 1) {
        const blade = addMesh(tuft, new THREE.ConeGeometry(0.05, 0.35, 4), material(index % 2 ? 0x9dc86c : 0x78ae55), [index * 0.1, 0.15, (index % 2) * 0.08]);
        blade.rotation.z = -0.25 + index * 0.16;
      }
      tuft.position.set(x, y, z); scene.add(tuft);
    });
    scene.add(ground);

    const distantTree = new THREE.Group();
    const trunkMat = material(0x536f54, 1);
    const trunkGlow = material(0x72925f, 0.95);
    const trunk = addMesh(distantTree, new THREE.CylinderGeometry(3.3, 4.7, 25, 14), trunkMat, [1.6, 7.5, -11]);
    trunk.rotation.z = -0.07;
    addMesh(distantTree, new THREE.CylinderGeometry(1.15, 2.0, 10.5, 10), trunkGlow, [6.4, 7, -10.6]);
    distantTree.children.at(-1)?.rotateZ(-0.98);
    addMesh(distantTree, new THREE.CylinderGeometry(1.0, 1.65, 11, 10), trunkGlow, [-4.6, 8.1, -11]);
    distantTree.children.at(-1)?.rotateZ(0.95);
    const canopyMat = [material(0x3e7d55, 0.9), material(0x6caf67, 0.88), material(0x4c965d, 0.9)];
    [[-7, 7.6, -12, 2.3], [-3, 10.7, -12, 2.8], [3.8, 11, -12, 3.2], [8.4, 7.2, -12.6, 2.1], [7.2, 3.8, -11, 2.15]].forEach(([x, y, z, scale], index) => {
      const canopy = addMesh(distantTree, new THREE.DodecahedronGeometry(scale, 1), canopyMat[index % canopyMat.length], [x, y, z], [1.6, 0.65, 0.85]);
      canopy.rotation.set(index * 0.3, index * 0.55, 0);
    });
    scene.add(distantTree);

    const mountainMat = [material(0x527a75, 1), material(0x416f6d, 1), material(0x6f8d7f, 1)];
    [[-9.5, 0, -7.8, 3.5], [-6.8, -0.2, -8.3, 2.55], [7.9, -0.3, -8.5, 3.2], [10.7, -0.2, -9, 3.9]].forEach(([x, y, z, scale], index) => {
      const cliff = addMesh(scene, new THREE.DodecahedronGeometry(scale, 0), mountainMat[index % 3], [x, y, z], [0.82, 1.65, 0.8]);
      cliff.rotation.y = index * 0.55;
    });
    const mistMaterial = new THREE.MeshBasicMaterial({ color: 0xc5f0df, transparent: true, opacity: 0.12, depthWrite: false });
    const mist: THREE.Mesh[] = [];
    [[-5.8, -0.1, -5.1, 2.1], [0.3, -0.5, -5.4, 2.8], [5.7, 0.45, -5.8, 2.25]].forEach(([x, y, z, scale]) => {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), mistMaterial);
      cloud.position.set(x, y, z); cloud.scale.set(scale * 1.9, scale * 0.28, 0.35); scene.add(cloud); mist.push(cloud);
    });
    const lightRays: THREE.Mesh[] = [];
    for (let index = 0; index < 3; index += 1) {
      const ray = new THREE.Mesh(new THREE.ConeGeometry(1.1, 12, 3, 1, true), new THREE.MeshBasicMaterial({ color: 0xf9f0bc, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
      ray.position.set(-5 + index * 4.6, 4.8, -6.5 - index * 0.2); ray.rotation.z = 0.2 - index * 0.12; scene.add(ray); lightRays.push(ray);
    }
    const leaves: THREE.Mesh[] = [];
    for (let index = 0; index < 20; index += 1) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.32), new THREE.MeshBasicMaterial({ color: index % 2 ? 0xa7db69 : 0x6bae5c, transparent: true, opacity: 0.82, side: THREE.DoubleSide }));
      leaf.position.set(-7 + Math.random() * 15, -0.4 + Math.random() * 7, -3.5 - Math.random() * 4);
      leaf.rotation.set(Math.random(), Math.random(), Math.random()); scene.add(leaf); leaves.push(leaf);
    }

    const heroes = HERO_COLORS.map((_, index) => createConceptHero(index));
    heroes.forEach((hero) => scene.add(hero.root));
    const lightBarrierAuras = heroes.map((hero, index) => {
      const aura = new THREE.Group();
      const color = index === 0 ? 0xffda82 : 0x8edcf0;
      const ringMaterial = transparentMaterial(color, 0.46);
      const domeMaterial = transparentMaterial(color, 0.1);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 28), ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.28;
      const glyphMaterial = transparentMaterial(color, 0.28);
      const glyph = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.018, 6, 20), glyphMaterial);
      glyph.rotation.x = Math.PI / 2;
      glyph.position.y = 0.34;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.78, 18, 12), domeMaterial);
      dome.position.y = 1.08;
      dome.scale.set(0.88, 1.42, 0.88);
      aura.add(ring, glyph, dome);
      aura.visible = false;
      hero.root.add(aura);
      return { aura, ring, glyph, dome, ringMaterial, glyphMaterial, domeMaterial };
    });
    const celionCastLight = new THREE.PointLight(0xffdf91, 0, 5, 2);
    celionCastLight.position.set(0, 1.2, 1.5);
    heroes[0].root.add(celionCastLight);

    const golem = new THREE.Group();
    const golemModel = new THREE.Group();
    const rocks = [material(0x526a62, 0.95), material(0x6f8071, 0.92), material(0x384f4b, 1), material(0x899785, 0.88)];
    const rootBark = material(0x4c5137, 0.95);
    const moss = material(0x648b56, 0.9);
    const makeRock = (position: THREE.Vector3Tuple, scale: THREE.Vector3Tuple, materialIndex: number, rotation = new THREE.Euler()) => {
      const rock = addMesh(golemModel, new THREE.DodecahedronGeometry(0.72, 0), rocks[materialIndex % rocks.length], position, scale);
      rock.rotation.copy(rotation); return rock;
    };
    makeRock([0, 2.1, 0], [1.6, 1.8, 1.05], 0, new THREE.Euler(0.1, 0.2, 0));
    makeRock([-0.72, 2.05, 0.1], [0.9, 1.4, 1], 1, new THREE.Euler(0.2, 0.2, 0.35));
    makeRock([0.75, 2.15, -0.05], [0.95, 1.35, 1], 2, new THREE.Euler(-0.1, -0.2, -0.25));
    makeRock([0, 3.65, 0.03], [1.05, 0.78, 0.85], 3, new THREE.Euler(0.15, 0.1, 0));
    makeRock([-0.86, 3.75, 0.02], [0.62, 0.56, 0.68], 0, new THREE.Euler(0, 0.1, 0.2));
    makeRock([0.86, 3.75, 0.02], [0.62, 0.56, 0.68], 0, new THREE.Euler(0, -0.1, -0.2));
    addMesh(golemModel, new THREE.BoxGeometry(1.6, 0.22, 0.38), rocks[2], [0, 4.03, 0.52]);
    addMesh(golemModel, new THREE.DodecahedronGeometry(0.46, 0), rocks[1], [0, 3.2, 0.56], [1.15, 0.7, 0.58]);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xa9e9ff, emissive: 0x2387e8, emissiveIntensity: 2.7, roughness: 0.2 });
    addMesh(golemModel, new THREE.SphereGeometry(0.11, 12, 8), eyeMat, [-0.36, 3.64, 0.7]);
    addMesh(golemModel, new THREE.SphereGeometry(0.11, 12, 8), eyeMat, [0.36, 3.64, 0.7]);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x82deff, emissive: 0x1383ed, emissiveIntensity: 2.45, roughness: 0.18 });
    const core = addMesh(golemModel, new THREE.IcosahedronGeometry(0.36, 1), coreMat, [0, 2.05, 0.96]);
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 28), new THREE.MeshBasicMaterial({ color: 0x86dcff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }));
    coreRing.position.set(0, 2.05, 1); golemModel.add(coreRing);
    [-0.9, -0.35, 0.35, 0.9].forEach((x, index) => {
      const rootTendril = addMesh(golemModel, new THREE.CylinderGeometry(0.075, 0.11, 1.8, 6), rootBark, [x, 2.12 + (index % 2) * 0.22, 0.75]);
      rootTendril.rotation.z = -0.32 + index * 0.22;
    });
    addMesh(golemModel, new THREE.DodecahedronGeometry(0.4, 0), moss, [-1.36, 3.03, -0.14], [1.4, 0.48, 0.78]);
    addMesh(golemModel, new THREE.DodecahedronGeometry(0.34, 0), moss, [1.37, 3.12, -0.12], [1.48, 0.46, 0.82]);
    const leftArm = new THREE.Group(); const rightArm = new THREE.Group();
    [[-1.7, 2.5, -0.18], [-2.4, 1.55, 0], [-2.7, 0.65, 0.1], [1.7, 2.5, -0.18], [2.4, 1.55, 0], [2.7, 0.65, 0.1]].forEach(([x, y, z], index) => {
      const target = index < 3 ? leftArm : rightArm;
      const size = index % 3 === 0 ? [1.05, 1.05, 1] : index % 3 === 1 ? [0.88, 1.25, 0.9] : [1.12, 1.0, 1.0];
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), rocks[(index + 1) % rocks.length]);
      rock.position.set(x, y, z); rock.scale.set(...size); rock.rotation.set(index * 0.15, index * 0.2, index < 3 ? 0.28 : -0.28); rock.castShadow = true; target.add(rock);
    });
    golemModel.add(leftArm, rightArm);
    [-1, 1].forEach((side) => {
      [-0.18, 0.08, 0.34].forEach((offset) => {
        const finger = addMesh(golemModel, new THREE.BoxGeometry(0.24, 0.5, 0.34), rocks[2], [side * 2.85, 0.75 + offset, 0.32]);
        finger.rotation.z = side * -0.2;
      });
    });
    makeRock([-0.62, 0.45, 0], [0.72, 1.2, 0.78], 2, new THREE.Euler(0.1, 0, 0.08));
    makeRock([0.62, 0.45, 0], [0.72, 1.2, 0.78], 0, new THREE.Euler(-0.1, 0, -0.08));
    makeRock([-0.72, -0.45, 0.1], [0.85, 0.42, 0.9], 3);
    makeRock([0.72, -0.45, 0.1], [0.85, 0.42, 0.9], 3);
    golem.add(golemModel);
    golem.position.set(4.7, -1.55, 0.2);
    golem.scale.setScalar(1.42);
    scene.add(golem);

    // Passive distant silhouettes keep Chapter 1's creature language present without affecting the boss encounter.
    const ambientCreatures = [
      { root: createVineblight(), base: new THREE.Vector3(-6.65, -1.05, 0.62), scale: 0.84, phase: 0 },
      { root: createBarkBeetle(), base: new THREE.Vector3(0.28, -1.38, 0.7), scale: 0.8, phase: 1.1 },
      { root: createBlightedFairy(), base: new THREE.Vector3(-0.12, 0.82, 0.78), scale: 0.82, phase: 2.1 },
      { root: createAncientGuardian(), base: new THREE.Vector3(7.65, -1.1, 0.72), scale: 0.74, phase: 3.2 },
    ];
    ambientCreatures.forEach(({ root, base, scale }) => {
      root.position.copy(base); root.scale.setScalar(scale); scene.add(root);
    });

    const armor = new THREE.Group();
    const armorRing = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.065, 8, 48), transparentMaterial(0x8edcf0, 0.56));
    armorRing.scale.y = 1.18; armor.add(armorRing);
    const armorShards: THREE.Mesh[] = [];
    for (let index = 0; index < 10; index += 1) {
      const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + (index % 3) * 0.08, 0), rocks[index % rocks.length]);
      shard.position.set(Math.cos((index / 10) * Math.PI * 2) * 2.72, 1.8 + Math.sin((index / 10) * Math.PI * 2) * 2.2, 0.45);
      shard.castShadow = true; armor.add(shard); armorShards.push(shard);
    }
    armor.position.copy(golem.position); armor.scale.copy(golem.scale); scene.add(armor);

    const effects: Effect[] = [];
    const addEffect = (effect: Effect) => { scene.add(effect.mesh); effects.push(effect); };
    const spawnBolt = (heroIndex: number) => {
      const start = heroes[heroIndex].root.position.clone().add(new THREE.Vector3(0.5, 1.25, 0.3));
      const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), transparentMaterial(HERO_COLORS[heroIndex], 0.85));
      bolt.position.copy(start); bolt.scale.set(1.8, 1.2, 1); addEffect({ mesh: bolt, life: 0.65, maxLife: 0.65, kind: 'bolt', speed: 10 });
    };
    const spawnSlash = () => {
      const slash = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.065, 6, 22, Math.PI * 0.75), transparentMaterial(0xffcf72, 0.92));
      slash.position.set(3.5, 0.55, 0.7); slash.rotation.set(0.25, 0.12, -0.8); addEffect({ mesh: slash, life: 0.32, maxLife: 0.32, kind: 'slash' });
    };
    const spawnHeal = () => {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.035, 8, 28), transparentMaterial(0x8cf4bd, 0.72));
      halo.position.set(-3.5, 0.15, 0.55); halo.rotation.x = Math.PI / 2; addEffect({ mesh: halo, life: 0.72, maxLife: 0.72, kind: 'heal' });
    };
    const spawnDebris = () => {
      for (let index = 0; index < 22; index += 1) {
        const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.14, 0), rocks[index % rocks.length]);
        shard.position.set(4.7 + (Math.random() - 0.5) * 3.7, 1.2 + Math.random() * 3.4, 0.9 + Math.random());
        addEffect({ mesh: shard, life: 1.25, maxLife: 1.25, kind: 'debris', velocity: new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 1.4) });
      }
    };
    const spawnLightBarrierCast = () => {
      heroes.forEach((hero, index) => {
        const color = index === 0 ? 0xffdc86 : 0x9eeeff;
        const wave = new THREE.Mesh(new THREE.TorusGeometry(index === 0 ? 0.78 : 0.46, index === 0 ? 0.07 : 0.035, 8, 32), transparentMaterial(color, index === 0 ? 0.9 : 0.58));
        wave.position.copy(hero.root.position).add(new THREE.Vector3(0, 0.2, 0.2));
        wave.rotation.x = Math.PI / 2;
        addEffect({ mesh: wave, life: index === 0 ? 0.9 : 0.65, maxLife: index === 0 ? 0.9 : 0.65, kind: 'barrierWave', speed: index === 0 ? 3.8 : 2.5 });
      });
    };
    const spawnShieldImpact = (heroIndex: number) => {
      const impact = new THREE.Mesh(new THREE.SphereGeometry(heroIndex === 0 ? 0.82 : 0.58, 16, 12), transparentMaterial(heroIndex === 0 ? 0xffe3a2 : 0xa9efff, 0.52));
      impact.position.copy(heroes[heroIndex].root.position).add(new THREE.Vector3(0, 1.05, 0.15));
      impact.scale.set(0.88, 1.38, 0.88);
      addEffect({ mesh: impact, life: 0.34, maxLife: 0.34, kind: 'shieldImpact' });
    };
    let frame = 0;
    let previousTime = 0;
    let attackClock = 0;
    let attackIndex = 0;
    let previousBarrier = stateRef.current.barrierRatio;
    let previousCastPulse = stateRef.current.lightBarrierCastPulse;
    let previousShields = [...stateRef.current.partyShields];
    let celionCastPulse = 0;
    let shake = 0;
    let hitFlash = 0;
    const cameraBase = camera.position.clone();
    const animate = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000 || 0, 0.05);
      previousTime = time; frame += delta; attackClock += delta;
      const live = stateRef.current;
      if (attackClock > 0.42) {
        attackClock = 0; attackIndex = (attackIndex + 1) % 4;
        if (attackIndex === 1) spawnSlash();
        else if (attackIndex === 3) spawnHeal();
        else spawnBolt(attackIndex);
      }
      if (previousBarrier > 0.02 && live.barrierRatio <= 0.02) { spawnDebris(); shake = 0.7; }
      previousBarrier = live.barrierRatio;
      if (previousCastPulse !== live.lightBarrierCastPulse) {
        previousCastPulse = live.lightBarrierCastPulse;
        spawnLightBarrierCast();
        celionCastPulse = 0.9;
      }
      live.partyShields.forEach((shield, index) => {
        if (shield < (previousShields[index] ?? 0) - 0.05) spawnShieldImpact(index);
      });
      previousShields = [...live.partyShields];
      const lightBarrierActive = live.lightBarrierRemaining > 0;
      lightBarrierAuras.forEach(({ aura, ring, glyph, dome, ringMaterial, glyphMaterial, domeMaterial }, index) => {
        const hasShield = (live.partyShields[index] ?? 0) > 0.05;
        aura.visible = lightBarrierActive || hasShield;
        if (!aura.visible) return;
        const pulse = 1 + Math.sin(frame * 5 + index) * 0.08;
        ring.scale.setScalar(pulse);
        ring.rotation.z += delta * (1.8 + index * 0.12);
        glyph.rotation.z -= delta * (2.5 + index * 0.18);
        dome.scale.set(0.88 * pulse, 1.42 * pulse, 0.88 * pulse);
        ringMaterial.opacity = lightBarrierActive ? (index === 0 ? 0.62 : 0.42) : (index === 0 ? 0.5 : 0.3);
        glyphMaterial.opacity = lightBarrierActive ? (index === 0 ? 0.46 : 0.25) : 0.18;
        domeMaterial.opacity = lightBarrierActive ? (index === 0 ? 0.16 : 0.1) : 0.07;
      });
      celionCastPulse = Math.max(0, celionCastPulse - delta);
      celionCastLight.intensity = celionCastPulse * 5.2;

      heroes.forEach((hero, index) => {
        const rhythm = (frame * 2.1 + index * 0.86) % (Math.PI * 2);
        const action = Math.max(0, Math.sin(rhythm));
        hero.root.position.copy(hero.base);
        hero.root.position.y += Math.sin(frame * 2.6 + index) * 0.045;
        const castScale = index === 0 ? 1 + Math.sin(celionCastPulse * Math.PI) * 0.12 : 1;
        const attackScale = 1 + action * (index === 1 ? 0.055 : 0.022);
        hero.root.scale.setScalar(hero.baseScale * castScale * attackScale);
        if (index === 1) hero.root.position.x += action * 0.18;
        hero.root.rotation.z = index === 1 ? -action * 0.08 : Math.sin(frame * 2.4 + index) * 0.018;
        if (hero.weapon) hero.weapon.rotation.z = index === 1 ? -action * 0.82 : index === 2 ? Math.sin(frame * 2 + index) * 0.08 : 0;
        if (hero.shield) hero.shield.rotation.y = 0.05 + Math.sin(frame * 2) * 0.08;
        if (hero.orb) { hero.orb.rotation.y += delta * 2.5; hero.orb.scale.setScalar(1 + Math.sin(frame * 4) * 0.12); }
      });
      mist.forEach((cloud, index) => { cloud.position.x += Math.sin(frame * 0.2 + index) * 0.003; });
      lightRays.forEach((ray, index) => { ray.material.opacity = 0.045 + Math.sin(frame * 0.55 + index) * 0.018; });
      leaves.forEach((leaf, index) => { leaf.position.x += Math.sin(frame * 0.8 + index) * 0.003; leaf.position.y -= 0.002 + (index % 3) * 0.0008; leaf.rotation.z += delta * 0.75; if (leaf.position.y < -2.2) leaf.position.y = 7.5; });
      ambientCreatures.forEach((creature, index) => {
        creature.root.position.copy(creature.base);
        creature.root.position.y += Math.sin(frame * (index === 2 ? 2.4 : 1.4) + creature.phase) * (index === 2 ? 0.16 : 0.035);
        creature.root.rotation.y = Math.sin(frame * 0.55 + creature.phase) * 0.15;
      });

      const groggy = live.groggyRemaining > 0;
      golemModel.rotation.z = groggy ? -0.24 + Math.sin(frame * 7) * 0.018 : Math.sin(frame * 1.3) * 0.016;
      golemModel.position.y = groggy ? -0.62 : Math.sin(frame * 1.7) * 0.04;
      leftArm.rotation.z = groggy ? 0.22 : Math.sin(frame * 1.2) * 0.08;
      rightArm.rotation.z = groggy ? -0.22 : -Math.sin(frame * 1.2) * 0.08;
      core.rotation.y += delta * 2.4;
      core.scale.setScalar(groggy ? 1.55 + Math.sin(frame * 11) * 0.15 : 1 + (1 - live.bossHealthRatio) * 0.16);
      coreMat.emissiveIntensity = groggy ? 4.5 : 2.2 + (1 - live.bossHealthRatio) * 1.1;
      coreRing.rotation.z += delta * 1.8;
      armor.visible = live.barrierRatio > 0.015;
      armor.rotation.y += delta * 0.55;
      armorRing.material.opacity = 0.22 + live.barrierRatio * 0.4;
      armorShards.forEach((shard, index) => { shard.rotation.x += delta * (0.8 + index * 0.05); shard.rotation.y += delta * 0.65; });

      for (let index = effects.length - 1; index >= 0; index -= 1) {
        const effect = effects[index]; effect.life -= delta;
        const progress = 1 - effect.life / effect.maxLife;
        if (effect.kind === 'bolt') { effect.mesh.position.x += (effect.speed ?? 10) * delta; effect.mesh.position.y += Math.sin(progress * Math.PI) * delta * 1.2; }
        if (effect.kind === 'slash') { effect.mesh.rotation.z += delta * 5; effect.mesh.scale.setScalar(1 + progress * 0.7); }
        if (effect.kind === 'heal') { effect.mesh.position.y += delta * 1.2; effect.mesh.scale.setScalar(1 + progress * 0.45); }
        if (effect.kind === 'debris' && effect.velocity) { effect.mesh.position.addScaledVector(effect.velocity, delta); effect.velocity.y -= delta * 6; effect.mesh.rotation.x += delta * 7; effect.mesh.rotation.z += delta * 5; }
        if (effect.kind === 'barrierWave') { effect.mesh.scale.setScalar(1 + progress * (effect.speed ?? 3)); effect.mesh.rotation.z += delta * 1.8; }
        if (effect.kind === 'shieldImpact') effect.mesh.scale.setScalar(1 + progress * 0.65);
        const effectMaterial = (effect.mesh as THREE.Mesh).material;
        if (effectMaterial instanceof THREE.MeshBasicMaterial) effectMaterial.opacity = Math.max(0, effect.life / effect.maxLife);
        if (effect.kind === 'bolt' && effect.mesh.position.x > 4.2) { hitFlash = 0.18; effect.life = 0; }
        if (effect.life <= 0) { scene.remove(effect.mesh); (effect.mesh as THREE.Mesh).geometry?.dispose(); if (effectMaterial instanceof THREE.Material) effectMaterial.dispose(); effects.splice(index, 1); }
      }
      if (hitFlash > 0) { hitFlash -= delta; rocks.forEach((rock) => { rock.emissive = new THREE.Color(0x37665e); rock.emissiveIntensity = Math.max(0, hitFlash * 3.2); }); }
      else rocks.forEach((rock) => { rock.emissiveIntensity = 0; });
      shake = Math.max(0, shake - delta);
      camera.position.copy(cameraBase);
      if (shake > 0) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * shake * 0.16, (Math.random() - 0.5) * shake * 0.1, 0));
      camera.lookAt(cameraTarget);
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);
    return () => { observer.disconnect(); renderer.setAnimationLoop(null); renderer.dispose(); mount.removeChild(renderer.domElement); };
  }, []);

  return <div ref={mountRef} className="battle-canvas" aria-label="세계수 수호 골렘 전투 장면" />;
}
