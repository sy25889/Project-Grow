'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = {
  barrierRatio: number;
  bossHealthRatio: number;
  groggyRemaining: number;
  lightBarrierRemaining: number;
};

type Effect = {
  mesh: THREE.Object3D;
  life: number;
  maxLife: number;
  kind: 'bolt' | 'slash' | 'heal' | 'debris';
  speed?: number;
  velocity?: THREE.Vector3;
};

type HeroRig = {
  root: THREE.Group;
  weapon: THREE.Group;
  orb?: THREE.Mesh;
  shield?: THREE.Group;
  base: THREE.Vector3;
};

const HERO_COLORS = [0x3c8fd3, 0xf09a45, 0xb875d7, 0x4dbd9a];
const HERO_POSITIONS = [
  new THREE.Vector3(-5.05, -1.45, 0.2),
  new THREE.Vector3(-1.85, -1.48, 0.05),
  new THREE.Vector3(-4.0, -0.88, 1.1),
  new THREE.Vector3(-2.8, -0.92, 0.92),
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

function createHero(index: number): HeroRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const weapon = new THREE.Group();
  const color = HERO_COLORS[index];
  const cloth = material(color, 0.64);
  const clothDark = material(new THREE.Color(color).multiplyScalar(0.56).getHex(), 0.78);
  const skin = material(0xf4c99f, 0.9);
  const hair = material(index === 2 ? 0x54375f : index === 3 ? 0x315e5a : 0x342d2e, 0.9);
  const metal = material(index === 0 ? 0x7996a9 : 0xe5d5bb, 0.38);

  const boots = addMesh(body, new THREE.BoxGeometry(0.7, 0.2, 0.55), clothDark, [0, 0.08, 0]);
  boots.rotation.y = 0.12;
  addMesh(body, new THREE.CapsuleGeometry(0.17, 0.42, 4, 8), clothDark, [-0.19, 0.43, 0]);
  addMesh(body, new THREE.CapsuleGeometry(0.17, 0.42, 4, 8), clothDark, [0.19, 0.43, 0]);
  const torso = addMesh(body, new THREE.ConeGeometry(0.46, 0.86, 6), cloth, [0, 0.98, 0]);
  torso.scale.z = 0.82;
  addMesh(body, new THREE.SphereGeometry(0.52, 18, 14), skin, [0, 1.72, 0], [1, 0.96, 0.94]);
  const fringe = addMesh(body, new THREE.SphereGeometry(0.54, 16, 10), hair, [0, 1.98, -0.02], [1.02, 0.42, 0.96]);
  fringe.rotation.x = -0.16;
  addMesh(body, new THREE.SphereGeometry(0.08, 10, 8), skin, [-0.5, 1.7, 0], [0.65, 1, 0.8]);
  addMesh(body, new THREE.SphereGeometry(0.08, 10, 8), skin, [0.5, 1.7, 0], [0.65, 1, 0.8]);
  const leftArm = addMesh(body, new THREE.CapsuleGeometry(0.13, 0.42, 4, 8), skin, [-0.48, 1.15, 0]);
  leftArm.rotation.z = 0.32;
  const rightArm = addMesh(body, new THREE.CapsuleGeometry(0.13, 0.42, 4, 8), skin, [0.48, 1.15, 0]);
  rightArm.rotation.z = -0.32;

  if (index === 0) {
    addMesh(body, new THREE.DodecahedronGeometry(0.5, 0), metal, [0, 1.25, -0.03], [1.08, 0.45, 0.8]);
    const shield = new THREE.Group();
    const face = addMesh(shield, new THREE.CylinderGeometry(0.63, 0.63, 0.16, 8), material(0x427b9b, 0.45), [0, 0, 0]);
    face.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.065, 8, 20), material(0xdce2d2, 0.34));
    rim.rotation.x = Math.PI / 2;
    shield.add(rim);
    addMesh(shield, new THREE.ConeGeometry(0.17, 0.16, 4), material(0xf4d172, 0.3), [0, 0, 0.14]);
    shield.position.set(0.76, 1.06, 0.08);
    shield.rotation.z = -0.12;
    body.add(shield);
    const holyGrip = addMesh(weapon, new THREE.CylinderGeometry(0.05, 0.05, 0.64, 8), material(0x6f5633, 0.34), [-0.42, 0.78, -0.08]);
    holyGrip.rotation.z = 0.48;
    const holyBlade = addMesh(weapon, new THREE.ConeGeometry(0.15, 1.02, 4), material(0xf6edcf, 0.2), [-0.68, 1.27, -0.08]);
    holyBlade.rotation.z = 0.48;
    addMesh(weapon, new THREE.BoxGeometry(0.48, 0.08, 0.1), material(0xe7c968, 0.28), [-0.5, 0.91, -0.08]);
    root.userData.shield = shield;
  } else if (index === 1) {
    const grip = addMesh(weapon, new THREE.CylinderGeometry(0.055, 0.055, 0.72, 8), material(0x50392b), [0.24, 0.55, 0]);
    grip.rotation.z = -0.52;
    const blade = addMesh(weapon, new THREE.ConeGeometry(0.18, 1.28, 4), material(0xf7ecd1, 0.26), [0.52, 1.17, 0]);
    blade.rotation.z = -0.52;
    addMesh(weapon, new THREE.BoxGeometry(0.64, 0.09, 0.11), material(0xd89b42, 0.35), [0.31, 0.68, 0]);
  } else if (index === 2) {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 8, 32, Math.PI * 1.45), material(0x82583f));
    bow.rotation.z = Math.PI / 2;
    bow.position.set(0.55, 1.2, 0);
    weapon.add(bow);
    const string = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.55, 0.58, 0.02), new THREE.Vector3(0.83, 1.2, 0.02), new THREE.Vector3(0.55, 1.82, 0.02)]),
      new THREE.LineBasicMaterial({ color: 0xf7ecc4, transparent: true, opacity: 0.8 }),
    );
    weapon.add(string);
    addMesh(weapon, new THREE.ConeGeometry(0.04, 0.6, 5), material(0xd8e0dd, 0.3), [0.32, 1.2, 0]);
    weapon.children.at(-1)?.rotateZ(-Math.PI / 2);
  } else {
    addMesh(body, new THREE.ConeGeometry(0.55, 0.9, 5), clothDark, [0, 0.72, -0.07]);
    const staff = addMesh(weapon, new THREE.CylinderGeometry(0.045, 0.045, 1.45, 8), material(0xe6c779, 0.32), [0.54, 1.1, 0]);
    staff.rotation.z = -0.15;
    const crystal = addMesh(weapon, new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: 0x86f3c7, emissive: 0x1da77f, emissiveIntensity: 1.4, roughness: 0.25 }), [0.66, 1.8, 0]);
    crystal.rotation.z = 0.2;
    root.userData.orb = crystal;
  }

  root.add(body, weapon);
  root.scale.setScalar(1.18);
  root.position.copy(HERO_POSITIONS[index]);
  return { root, weapon, orb: root.userData.orb as THREE.Mesh | undefined, shield: root.userData.shield as THREE.Group | undefined, base: HERO_POSITIONS[index].clone() };
}

export function BattleScene({ barrierRatio, bossHealthRatio, groggyRemaining, lightBarrierRemaining }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ barrierRatio, bossHealthRatio, groggyRemaining, lightBarrierRemaining });
  stateRef.current = { barrierRatio, bossHealthRatio, groggyRemaining, lightBarrierRemaining };

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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    const heroes = HERO_COLORS.map((_, index) => createHero(index));
    heroes.forEach((hero) => scene.add(hero.root));
    const lightBarrierAuras = heroes.map((hero, index) => {
      const aura = new THREE.Group();
      const color = index === 0 ? 0xffda82 : 0x8edcf0;
      const ringMaterial = transparentMaterial(color, 0.46);
      const domeMaterial = transparentMaterial(color, 0.1);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 28), ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.28;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.78, 18, 12), domeMaterial);
      dome.position.y = 1.08;
      dome.scale.set(0.88, 1.42, 0.88);
      aura.add(ring, dome);
      aura.visible = false;
      hero.root.add(aura);
      return { aura, ring, dome, ringMaterial, domeMaterial };
    });

    const golem = new THREE.Group();
    const golemModel = new THREE.Group();
    const rocks = [material(0x526a62, 0.95), material(0x6f8071, 0.92), material(0x384f4b, 1), material(0x899785, 0.88)];
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
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xaef8e8, emissive: 0x34bba4, emissiveIntensity: 2.4, roughness: 0.2 });
    addMesh(golemModel, new THREE.SphereGeometry(0.11, 12, 8), eyeMat, [-0.36, 3.64, 0.7]);
    addMesh(golemModel, new THREE.SphereGeometry(0.11, 12, 8), eyeMat, [0.36, 3.64, 0.7]);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x7df4dd, emissive: 0x18b99f, emissiveIntensity: 2.2, roughness: 0.22 });
    const core = addMesh(golemModel, new THREE.IcosahedronGeometry(0.36, 1), coreMat, [0, 2.05, 0.96]);
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 28), new THREE.MeshBasicMaterial({ color: 0x88ffe8, transparent: true, opacity: 0.66, blending: THREE.AdditiveBlending }));
    coreRing.position.set(0, 2.05, 1); golemModel.add(coreRing);
    const leftArm = new THREE.Group(); const rightArm = new THREE.Group();
    [[-1.7, 2.5, -0.18], [-2.4, 1.55, 0], [-2.7, 0.65, 0.1], [1.7, 2.5, -0.18], [2.4, 1.55, 0], [2.7, 0.65, 0.1]].forEach(([x, y, z], index) => {
      const target = index < 3 ? leftArm : rightArm;
      const size = index % 3 === 0 ? [1.05, 1.05, 1] : index % 3 === 1 ? [0.88, 1.25, 0.9] : [1.12, 1.0, 1.0];
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), rocks[(index + 1) % rocks.length]);
      rock.position.set(x, y, z); rock.scale.set(...size); rock.rotation.set(index * 0.15, index * 0.2, index < 3 ? 0.28 : -0.28); rock.castShadow = true; target.add(rock);
    });
    golemModel.add(leftArm, rightArm);
    makeRock([-0.62, 0.45, 0], [0.72, 1.2, 0.78], 2, new THREE.Euler(0.1, 0, 0.08));
    makeRock([0.62, 0.45, 0], [0.72, 1.2, 0.78], 0, new THREE.Euler(-0.1, 0, -0.08));
    makeRock([-0.72, -0.45, 0.1], [0.85, 0.42, 0.9], 3);
    makeRock([0.72, -0.45, 0.1], [0.85, 0.42, 0.9], 3);
    golem.add(golemModel);
    golem.position.set(4.7, -1.55, 0.2);
    golem.scale.setScalar(1.36);
    scene.add(golem);

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
    let frame = 0;
    let previousTime = 0;
    let attackClock = 0;
    let attackIndex = 0;
    let previousBarrier = stateRef.current.barrierRatio;
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
      const lightBarrierActive = live.lightBarrierRemaining > 0;
      lightBarrierAuras.forEach(({ aura, ring, dome, ringMaterial, domeMaterial }, index) => {
        aura.visible = lightBarrierActive;
        if (!lightBarrierActive) return;
        const pulse = 1 + Math.sin(frame * 5 + index) * 0.08;
        ring.scale.setScalar(pulse);
        ring.rotation.z += delta * (1.8 + index * 0.12);
        dome.scale.set(0.88 * pulse, 1.42 * pulse, 0.88 * pulse);
        ringMaterial.opacity = index === 0 ? 0.62 : 0.42;
        domeMaterial.opacity = index === 0 ? 0.16 : 0.1;
      });

      heroes.forEach((hero, index) => {
        const rhythm = (frame * 2.1 + index * 0.86) % (Math.PI * 2);
        const action = Math.max(0, Math.sin(rhythm));
        hero.root.position.copy(hero.base);
        hero.root.position.y += Math.sin(frame * 2.6 + index) * 0.045;
        if (index === 1) hero.root.position.x += action * 0.16;
        hero.root.rotation.z = index === 1 ? -action * 0.08 : Math.sin(frame * 2.4 + index) * 0.018;
        hero.weapon.rotation.z = index === 1 ? -action * 0.82 : index === 2 ? Math.sin(frame * 2 + index) * 0.08 : 0;
        if (hero.shield) hero.shield.rotation.y = 0.05 + Math.sin(frame * 2) * 0.08;
        if (hero.orb) { hero.orb.rotation.y += delta * 2.5; hero.orb.scale.setScalar(1 + Math.sin(frame * 4) * 0.12); }
      });
      mist.forEach((cloud, index) => { cloud.position.x += Math.sin(frame * 0.2 + index) * 0.003; });
      lightRays.forEach((ray, index) => { ray.material.opacity = 0.045 + Math.sin(frame * 0.55 + index) * 0.018; });
      leaves.forEach((leaf, index) => { leaf.position.x += Math.sin(frame * 0.8 + index) * 0.003; leaf.position.y -= 0.002 + (index % 3) * 0.0008; leaf.rotation.z += delta * 0.75; if (leaf.position.y < -2.2) leaf.position.y = 7.5; });

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
