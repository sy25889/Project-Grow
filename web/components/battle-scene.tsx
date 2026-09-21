'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

type Props = {
  barrierRatio: number;
  bossHealthRatio: number;
  groggyRemaining: number;
  lightBarrierRemaining: number;
  lightBarrierCastPulse: number;
  partyShields: number[];
  partyHealth: number[];
  lastEvent: string;
};

type BackgroundMode = 'party' | 'golem';

const PARTY_SPRITES = [
  { name: '셀리온', role: 'tank' },
  { name: '리오', role: 'melee' },
  { name: '세나', role: 'ranged' },
  { name: '미아', role: 'support' },
] as const;

function removeBackground(imageData: ImageData, mode: BackgroundMode) {
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
    if (mode === 'golem') return green > 150 && green > red * 1.35 && green > blue * 1.35;
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
  visited.forEach((transparent, pixel) => {
    if (transparent) data[pixel * 4 + 3] = 0;
  });
}

function AtlasSprite({ source, columns, index, mode, className, label }: {
  source: string;
  columns: number;
  index: number;
  mode: BackgroundMode;
  className: string;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const image = new Image();
    image.onload = () => {
      const columnWidth = Math.floor(image.naturalWidth / columns);
      canvas.width = columnWidth;
      canvas.height = image.naturalHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, index * columnWidth, 0, columnWidth, image.naturalHeight, 0, 0, columnWidth, image.naturalHeight);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      removeBackground(imageData, mode);
      context.putImageData(imageData, 0, 0);
    };
    image.src = source;
  }, [columns, index, mode, source]);

  return <canvas ref={canvasRef} className={className} aria-label={label} role="img" />;
}

export function BattleScene({ barrierRatio, bossHealthRatio, groggyRemaining, lightBarrierRemaining, lightBarrierCastPulse, partyShields, partyHealth, lastEvent }: Props) {
  const lightBarrierActive = lightBarrierRemaining > 0;
  const earthSlam = lastEvent.includes('대지 강타');
  const battleStyle = { '--boss-health': `${Math.max(0.2, bossHealthRatio)}` } as CSSProperties;

  return (
    <section className={`battle-stage ${groggyRemaining > 0 ? 'is-groggy' : ''} ${earthSlam ? 'is-earth-slam' : ''}`} style={battleStyle} aria-label="세계수 하층 고정형 횡스크롤 전투">
      <div className="world-tree-backdrop" />
      <div className="world-tree-mist mist-one" />
      <div className="world-tree-mist mist-two" />
      <div className="world-tree-rays" />
      <div className="battle-ground" />

      <div className="party-formation">
        {PARTY_SPRITES.map((member, index) => {
          const isDefeated = partyHealth[index] <= 0;
          const hasShield = partyShields[index] > 0.05;
          return (
            <div className={`fighter fighter-${member.role} ${isDefeated ? 'is-defeated' : ''} ${lightBarrierActive ? 'is-protected' : ''} ${hasShield ? 'has-shield' : ''}`} key={member.role}>
              <div className="fighter-shadow" />
              <div className="fighter-ring" />
              {member.role === 'tank' && lightBarrierActive && <div className="celion-sigil" key={lightBarrierCastPulse} />}
              <AtlasSprite source="/concepts/project-grow-party-sprites.png" columns={4} index={index} mode="party" className="fighter-sprite" label={`${member.name} ${member.role}`} />
            </div>
          );
        })}
      </div>

      <div className="boss-formation">
        <div className="boss-shadow" />
        <div className="slam-warning" />
        <div className={`boss-armor ${barrierRatio <= 0.015 ? 'is-broken' : ''}`} />
        {groggyRemaining > 0 && <div className="break-callout">BREAK</div>}
        <AtlasSprite source="/battle/world-tree-golem.png" columns={1} index={0} mode="golem" className="boss-sprite" label="세계수 골렘" />
      </div>
    </section>
  );
}
