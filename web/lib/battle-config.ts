export type PartyRole = 'tank' | 'melee' | 'ranged' | 'support';
export type CelionBreakthrough = 0 | 1 | 2 | 3 | 4 | 5;

export type PartyMemberConfig = {
  id: PartyRole;
  name: string;
  roleLabel: string;
  color: string;
  basicAttack: number;
  barrierPressure: number;
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

export const BOSS = { name: '세계수 수호 골렘', subtitle: 'CHAPTER 1 BOSS' } as const;
