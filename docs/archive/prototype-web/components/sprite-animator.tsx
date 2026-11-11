'use client';

import { useEffect, useRef, useState } from 'react';
import { SPRITE_FRAME_DURATION_MS, SPRITE_SHEETS, type SpriteAnimation, type SpriteSheetId } from '@/lib/sprite-config';

type Props = {
  sheet: SpriteSheetId;
  animation: SpriteAnimation;
  actionToken?: number;
  className?: string;
  label: string;
};

export function SpriteAnimator({ sheet, animation, actionToken = 0, className, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [frame, setFrame] = useState(0);
  const config = SPRITE_SHEETS[sheet];

  useEffect(() => {
    setReady(false);
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      imageRef.current = image;
      setReady(true);
    };
    image.src = config.source;
    return () => { imageRef.current = null; };
  }, [config.source]);

  useEffect(() => { setFrame(0); }, [animation, actionToken, sheet]);

  useEffect(() => {
    const interval = window.setInterval(() => setFrame((current) => (current + 1) % config.columns), SPRITE_FRAME_DURATION_MS[animation]);
    return () => window.clearInterval(interval);
  }, [animation, config.columns]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !ready) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const row = config.animationRows[animation];
    const left = Math.round((frame * image.naturalWidth) / config.columns);
    const right = Math.round(((frame + 1) * image.naturalWidth) / config.columns);
    const top = Math.round((row * image.naturalHeight) / config.rows);
    const bottom = Math.round(((row + 1) * image.naturalHeight) / config.rows);
    const width = right - left;
    const height = bottom - top;
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.drawImage(image, left, top, width, height, 0, 0, width, height);
  }, [animation, config, frame, ready]);

  return <canvas ref={canvasRef} className={className} aria-label={label} role="img" />;
}
