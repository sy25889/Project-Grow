export type PartyRole = 'tank' | 'melee' | 'ranged' | 'support';
export type CelionBreakthrough = 0 | 1 | 2 | 3 | 4 | 5;
import type { SpriteSheetId } from '@/lib/sprite-config';

export type PartyMemberConfig = {
  id: PartyRole;
  name: string;
  roleLabel: string;
  color: string;
  basicAttack: number;
  barrierPressure: number;
};

export type WaveEnemyVisual = { name: string; sheet: SpriteSheetId };
export type StageWaveConfig = {
  name: string;
  subtitle: string;
  maxHp: number;
  attackEvery: number;
  damageTank: number;
  damageOther: number;
  enemies: WaveEnemyVisual[];
  isBoss?: boolean;
  barrierMax?: number;
};

export const PARTY: PartyMemberConfig[] = [
  { id: 'tank', name: '셀리온', roleLabel: 'SS 탱커', color: '#d8b85e', basicAttack: 15, barrierPressure: 5 },
  { id: 'melee', name: '리오', roleLabel: '근거리', color: '#f4a54a', basicAttack: 26, barrierPressure: 31 },
  { id: 'ranged', name: '세나', roleLabel: '원거리', color: '#bc71e6', basicAttack: 22, barrierPressure: 6 },
  { id: 'support', name: '미아', roleLabel: '서포터', color: '#58c79d', basicAttack: 12, barrierPressure: 4 },
];

// TODO Prototype tuning: detailed values remain temporary until Balance defines them.
export const PROTOTYPE_TUNING = {
  stageTime: 90,
  basicAttackEvery: 0.9,
  bossMaxHp: 3600,
  barrierMax: 920,
  bossAttackEvery: 3.2,
  bossDamageTank: 13,
  bossDamageOther: 7,
  supportHealingPerSecond: 3.4,
  normalSkillEvery: 5.5,
  normalSkillDamage: 155,
  groggyDuration: 8,
  shieldedDamageMultiplier: 0.24,
  groggyDamageMultiplier: 1.6,
} as const;

// TODO Prototype tuning: final values must be defined by Balance.
export const CELION_PROTOTYPE_TUNING = {
  celionBreakthrough: 5 as CelionBreakthrough,
  lightBarrierCooldown: 6,
  lightBarrierDuration: 4.5,
  damageTakenMultiplier: 0.55,
  selfShieldAt3: 95,
  partyShieldAt5: 65,
  shieldMax: 240,
} as const;

// TODO Prototype tuning: wave HP and damage are temporary verification values.
export const CHAPTER_1_WAVES: StageWaveConfig[] = [
  { name: '오염된 덩굴수 무리', subtitle: 'WAVE 1 · 일반 몬스터', maxHp: 980, attackEvery: 3.5, damageTank: 8, damageOther: 5, enemies: [{ name: '새싹 포포', sheet: 'sprout' }, { name: '덩굴 하운드', sheet: 'vineHound' }] },
  { name: '세계수 하층 방어대', subtitle: 'WAVE 2 · 일반 몬스터', maxHp: 1320, attackEvery: 3.25, damageTank: 10, damageOther: 6, enemies: [{ name: '암석 골렘', sheet: 'rockGolem' }, { name: '바람 실프', sheet: 'windSylph' }] },
  { name: '고목 수호자', subtitle: 'WAVE 3 · 정예 몬스터', maxHp: 1720, attackEvery: 2.9, damageTank: 13, damageOther: 8, enemies: [{ name: '폐허 거북 수호자', sheet: 'ruinTurtle' }] },
  { name: '세계수 수호 골렘', subtitle: 'FINAL WAVE · CHAPTER 1 BOSS', maxHp: 3600, attackEvery: 3.2, damageTank: 13, damageOther: 7, barrierMax: 920, isBoss: true, enemies: [{ name: '고대 세계수 수호자', sheet: 'ancientTreeGuardian' }] },
];

export const BOSS = { name: '세계수 수호 골렘', subtitle: 'CHAPTER 1 BOSS' } as const;
