'use client';

import { type CSSProperties } from 'react';
import { SpriteAnimator } from '@/components/sprite-animator';
import type { PartyRole, StageWaveConfig } from '@/lib/battle-config';
import type { SpriteAnimation } from '@/lib/sprite-config';

type Props = {
  currentWave: StageWaveConfig;
  currentWaveNumber: number;
  totalWaves: number;
  enemyHealthRatio: number;
  barrierRatio: number;
  groggyRemaining: number;
  lightBarrierRemaining: number;
  lightBarrierCastPulse: number;
  partyShields: number[];
  partyHealth: number[];
  partyAnimations: Record<PartyRole, SpriteAnimation>;
  partyActionTokens: Record<PartyRole, number>;
  enemyAnimation: SpriteAnimation;
  enemyActionToken: number;
  lastEvent: string;
};

const PARTY_SPRITES = [
  { name: '셀리온', role: 'tank', sheet: 'tank' },
  { name: '리오', role: 'melee', sheet: 'melee' },
  { name: '세나', role: 'ranged', sheet: 'ranged' },
  { name: '미아', role: 'support', sheet: 'support' },
] as const;

export function BattleScene({ currentWave, currentWaveNumber, totalWaves, enemyHealthRatio, barrierRatio, groggyRemaining, lightBarrierRemaining, lightBarrierCastPulse, partyShields, partyHealth, partyAnimations, partyActionTokens, enemyAnimation, enemyActionToken, lastEvent }: Props) {
  const lightBarrierActive = lightBarrierRemaining > 0;
  const earthSlam = currentWave.isBoss && lastEvent.includes('대지 강타');
  const battleStyle = { '--enemy-health': `${Math.max(0.2, enemyHealthRatio)}` } as CSSProperties;

  return (
    <section className={`battle-stage ${currentWave.isBoss ? 'is-boss-wave' : 'is-monster-wave'} ${groggyRemaining > 0 ? 'is-groggy' : ''} ${earthSlam ? 'is-earth-slam' : ''}`} style={battleStyle} aria-label="세계수 하층 고정형 횡스크롤 2D 전투">
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
            <div className={`fighter fighter-${member.role} ${isDefeated ? 'is-defeated' : ''} ${lightBarrierActive ? 'is-protected' : ''} ${hasShield ? 'has-shield' : ''} action-${partyAnimations[member.role]}`} key={member.role}>
              <div className="fighter-shadow" />
              <div className="fighter-ring" />
              {member.role === 'tank' && lightBarrierActive && <div className="celion-sigil" key={lightBarrierCastPulse} />}
              <SpriteAnimator sheet={member.sheet} animation={isDefeated ? 'death' : partyAnimations[member.role]} actionToken={partyActionTokens[member.role]} className="fighter-sprite" label={`${member.name} ${member.role}`} />
            </div>
          );
        })}
      </div>

      <div className={`enemy-formation ${currentWave.isBoss ? 'enemy-formation-boss' : ''}`}>
        {currentWave.isBoss && <div className={`boss-armor ${barrierRatio <= 0.015 ? 'is-broken' : ''}`} />}
        {currentWave.isBoss && <div className="slam-warning" />}
        {groggyRemaining > 0 && <div className="break-callout">BREAK</div>}
        {currentWave.enemies.map((enemy, index) => (
          <div className={`enemy enemy-${index} ${currentWave.isBoss ? 'enemy-boss' : ''} action-${enemyAnimation}`} key={enemy.sheet}>
            <div className="enemy-shadow" />
            <SpriteAnimator sheet={enemy.sheet} animation={groggyRemaining > 0 ? 'hit' : enemyAnimation} actionToken={enemyActionToken} className="enemy-sprite" label={enemy.name} />
          </div>
        ))}
      </div>
      <div className="wave-tag">WAVE {currentWaveNumber} / {totalWaves}</div>
    </section>
  );
}
