export type PartyRole = 'tank' | 'melee' | 'ranged' | 'support';

export type PartyMemberConfig = {
  id: PartyRole;
  name: string;
  roleLabel: string;
  color: string;
  basicAttack: number;
  barrierPressure: number;
};

export const PARTY: PartyMemberConfig[] = [
  { id: 'tank', name: '브람', roleLabel: '탱커', color: '#4aa6dc', basicAttack: 15, barrierPressure: 5 },
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

export const BOSS = { name: '세계수 수호 골렘', subtitle: 'CHAPTER 1 BOSS' } as const;
