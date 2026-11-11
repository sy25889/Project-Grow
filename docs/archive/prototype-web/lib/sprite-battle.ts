import { CELION_PROTOTYPE_TUNING, CHAPTER_1_WAVES, PARTY, PROTOTYPE_TUNING, type PartyRole, type StageWaveConfig } from '@/lib/battle-config';
import type { SpriteAnimation } from '@/lib/sprite-config';

export type PartyBattleState = { id: PartyRole; hp: number; shield: number };
export type BattleStatus = 'fighting' | 'clear' | 'timeout' | 'defeated';
type AnimationMap = Record<PartyRole, SpriteAnimation>;
type CountdownMap = Record<PartyRole, number>;
type TokenMap = Record<PartyRole, number>;

export type SpriteBattleState = {
  time: number;
  waveIndex: number;
  enemyHp: number;
  barrier: number;
  groggyRemaining: number;
  enemyAttackCooldown: number;
  basicAttackCooldown: number;
  skillCooldown: number;
  lightBarrierCooldown: number;
  lightBarrierRemaining: number;
  lightBarrierCastPulse: number;
  partyAnimations: AnimationMap;
  partyAnimationRemaining: CountdownMap;
  partyActionTokens: TokenMap;
  enemyAnimation: SpriteAnimation;
  enemyAnimationRemaining: number;
  enemyActionToken: number;
  members: PartyBattleState[];
  status: BattleStatus;
  lastEvent: string;
};

const TICK_SECONDS = 0.15;
const MAX_PARTY_HP = 100;
const PARTY_IDS: PartyRole[] = ['tank', 'melee', 'ranged', 'support'];

const idleAnimations = (): AnimationMap => ({ tank: 'idle', melee: 'idle', ranged: 'idle', support: 'idle' });
const emptyCountdowns = (): CountdownMap => ({ tank: 0, melee: 0, ranged: 0, support: 0 });
const emptyTokens = (): TokenMap => ({ tank: 0, melee: 0, ranged: 0, support: 0 });

export function getCurrentWave(state: SpriteBattleState): StageWaveConfig {
  return CHAPTER_1_WAVES[state.waveIndex];
}

export function createSpriteBattleState(): SpriteBattleState {
  const firstWave = CHAPTER_1_WAVES[0];
  return {
    time: PROTOTYPE_TUNING.stageTime,
    waveIndex: 0,
    enemyHp: firstWave.maxHp,
    barrier: firstWave.barrierMax ?? 0,
    groggyRemaining: 0,
    enemyAttackCooldown: firstWave.attackEvery,
    basicAttackCooldown: PROTOTYPE_TUNING.basicAttackEvery,
    skillCooldown: PROTOTYPE_TUNING.normalSkillEvery,
    lightBarrierCooldown: CELION_PROTOTYPE_TUNING.lightBarrierCooldown,
    lightBarrierRemaining: 0,
    lightBarrierCastPulse: 0,
    partyAnimations: idleAnimations(),
    partyAnimationRemaining: emptyCountdowns(),
    partyActionTokens: emptyTokens(),
    enemyAnimation: 'idle',
    enemyAnimationRemaining: 0,
    enemyActionToken: 0,
    members: PARTY.map((member) => ({ id: member.id, hp: MAX_PARTY_HP, shield: 0 })),
    status: 'fighting',
    lastEvent: '자동 전투 진행 중',
  };
}

function applyIncomingDamage(member: PartyBattleState, rawDamage: number, damageTakenMultiplier: number) {
  const reducedDamage = rawDamage * damageTakenMultiplier;
  const absorbedDamage = Math.min(member.shield, reducedDamage);
  return { ...member, shield: Math.max(0, member.shield - absorbedDamage), hp: Math.max(0, member.hp - (reducedDamage - absorbedDamage)) };
}

function advanceAnimations(state: SpriteBattleState): SpriteBattleState {
  const partyAnimationRemaining = { ...state.partyAnimationRemaining };
  const partyAnimations = { ...state.partyAnimations };
  PARTY_IDS.forEach((id) => {
    partyAnimationRemaining[id] = Math.max(0, partyAnimationRemaining[id] - TICK_SECONDS);
    if (partyAnimationRemaining[id] === 0) partyAnimations[id] = 'idle';
  });
  const enemyAnimationRemaining = Math.max(0, state.enemyAnimationRemaining - TICK_SECONDS);
  return { ...state, partyAnimations, partyAnimationRemaining, enemyAnimation: enemyAnimationRemaining === 0 ? 'idle' : state.enemyAnimation, enemyAnimationRemaining };
}

function playParty(state: SpriteBattleState, roles: PartyRole[], animation: SpriteAnimation, duration: number): SpriteBattleState {
  const partyAnimations = { ...state.partyAnimations };
  const partyAnimationRemaining = { ...state.partyAnimationRemaining };
  const partyActionTokens = { ...state.partyActionTokens };
  roles.forEach((role) => {
    partyAnimations[role] = animation;
    partyAnimationRemaining[role] = duration;
    partyActionTokens[role] += 1;
  });
  return { ...state, partyAnimations, partyAnimationRemaining, partyActionTokens };
}

function playEnemy(state: SpriteBattleState, animation: SpriteAnimation, duration: number): SpriteBattleState {
  return { ...state, enemyAnimation: animation, enemyAnimationRemaining: duration, enemyActionToken: state.enemyActionToken + 1 };
}

function applyEnemyDamage(state: SpriteBattleState, rawDamage: number, barrierPressure: number, event?: string): SpriteBattleState {
  const wave = getCurrentWave(state);
  if (!wave.isBoss) return { ...state, enemyHp: Math.max(0, state.enemyHp - rawDamage), lastEvent: event ?? state.lastEvent };
  const barrier = Math.max(0, state.barrier - barrierPressure);
  const firstBreak = state.barrier > 0 && barrier === 0;
  const multiplier = barrier > 0 ? PROTOTYPE_TUNING.shieldedDamageMultiplier : state.groggyRemaining > 0 || firstBreak ? PROTOTYPE_TUNING.groggyDamageMultiplier : 1;
  return { ...state, barrier, enemyHp: Math.max(0, state.enemyHp - rawDamage * multiplier), groggyRemaining: firstBreak ? PROTOTYPE_TUNING.groggyDuration : state.groggyRemaining, lastEvent: firstBreak ? '방어 게이지 파괴 - GROGGY' : event ?? state.lastEvent };
}

function castLightBarrier(state: SpriteBattleState): SpriteBattleState {
  const breakthrough = CELION_PROTOTYPE_TUNING.celionBreakthrough;
  const members = state.members.map((member) => {
    if (member.hp <= 0) return member;
    const shieldAmount = (breakthrough >= 5 ? CELION_PROTOTYPE_TUNING.partyShieldAt5 : 0) + (member.id === 'tank' && breakthrough >= 3 ? CELION_PROTOTYPE_TUNING.selfShieldAt3 : 0);
    return { ...member, shield: Math.min(CELION_PROTOTYPE_TUNING.shieldMax, member.shield + shieldAmount) };
  });
  return playParty({ ...state, members, lightBarrierRemaining: CELION_PROTOTYPE_TUNING.lightBarrierDuration, lightBarrierCastPulse: state.lightBarrierCastPulse + 1, lastEvent: '빛의 결계' }, ['tank'], 'skill', 0.85);
}

function advanceWave(state: SpriteBattleState): SpriteBattleState {
  const nextIndex = state.waveIndex + 1;
  if (nextIndex >= CHAPTER_1_WAVES.length) return { ...state, status: 'clear', lastEvent: 'Chapter 1 정복' };
  const wave = CHAPTER_1_WAVES[nextIndex];
  return playEnemy({ ...state, waveIndex: nextIndex, enemyHp: wave.maxHp, barrier: wave.barrierMax ?? 0, groggyRemaining: 0, enemyAttackCooldown: wave.attackEvery, enemyAnimation: 'move', enemyAnimationRemaining: 0.7, lastEvent: `${wave.name} 등장` }, 'move', 0.7);
}

export function tickSpriteBattle(current: SpriteBattleState): SpriteBattleState {
  if (current.status !== 'fighting') return current;
  let next = advanceAnimations({ ...current, time: current.time - TICK_SECONDS, groggyRemaining: Math.max(0, current.groggyRemaining - TICK_SECONDS), enemyAttackCooldown: current.enemyAttackCooldown - TICK_SECONDS, basicAttackCooldown: current.basicAttackCooldown - TICK_SECONDS, skillCooldown: current.skillCooldown - TICK_SECONDS, lightBarrierCooldown: current.lightBarrierCooldown - TICK_SECONDS, lightBarrierRemaining: Math.max(0, current.lightBarrierRemaining - TICK_SECONDS) });
  const wave = getCurrentWave(next);
  const alive = next.members.filter((member) => member.hp > 0);

  if (next.basicAttackCooldown <= 0) {
    const rawDamage = alive.reduce((sum, member) => sum + (PARTY.find((entry) => entry.id === member.id)?.basicAttack ?? 0), 0) * PROTOTYPE_TUNING.basicAttackEvery;
    const barrierPressure = alive.reduce((sum, member) => sum + (PARTY.find((entry) => entry.id === member.id)?.barrierPressure ?? 0), 0) * PROTOTYPE_TUNING.basicAttackEvery;
    next = playEnemy(applyEnemyDamage(next, rawDamage, barrierPressure, '기본 공격 자동 사용'), 'hit', 0.42);
    next = playParty(next, alive.map((member) => member.id), 'attack', 0.45);
    next.basicAttackCooldown = PROTOTYPE_TUNING.basicAttackEvery;
  }
  if (next.skillCooldown <= 0) {
    next = playEnemy(applyEnemyDamage(next, PROTOTYPE_TUNING.normalSkillDamage, 28, '일반 스킬 자동 사용'), 'hit', 0.62);
    next = playParty(next, alive.filter((member) => member.id !== 'tank').map((member) => member.id), 'skill', 0.65);
    next.skillCooldown = PROTOTYPE_TUNING.normalSkillEvery;
  }
  if (next.lightBarrierCooldown <= 0 && next.members.some((member) => member.id === 'tank' && member.hp > 0)) {
    next = castLightBarrier(next);
    next.lightBarrierCooldown = CELION_PROTOTYPE_TUNING.lightBarrierCooldown;
  }
  if (next.enemyAttackCooldown <= 0 && next.groggyRemaining <= 0) {
    const tauntActive = next.lightBarrierRemaining > 0 && next.members.some((member) => member.id === 'tank' && member.hp > 0);
    const damageTakenMultiplier = next.lightBarrierRemaining > 0 ? CELION_PROTOTYPE_TUNING.damageTakenMultiplier : 1;
    next.members = next.members.map((member) => {
      if (tauntActive && member.id !== 'tank') return member;
      const rawDamage = member.id === 'tank' ? wave.damageTank : wave.damageOther;
      return applyIncomingDamage(member, rawDamage, damageTakenMultiplier);
    });
    next = playEnemy(next, wave.isBoss ? 'skill' : 'attack', 0.65);
    next = playParty(next, next.members.filter((member) => member.hp > 0).map((member) => member.id), 'hit', 0.4);
    next.enemyAttackCooldown = wave.attackEvery;
    next.lastEvent = tauntActive ? '빛의 결계 - 적 도발' : wave.isBoss ? '골렘의 대지 강타' : `${wave.name}의 공격`;
  }
  if (next.members.some((member) => member.id === 'support' && member.hp > 0)) next.members = next.members.map((member) => ({ ...member, hp: Math.min(MAX_PARTY_HP, member.hp + PROTOTYPE_TUNING.supportHealingPerSecond * TICK_SECONDS) }));
  if (next.enemyHp <= 0) return advanceWave(next);
  if (!next.members.some((member) => member.hp > 0)) return { ...next, status: 'defeated', lastEvent: '원정대 전멸' };
  if (next.time <= 0) return { ...next, time: 0, status: 'timeout', lastEvent: '제한시간 초과' };
  return next;
}

export { MAX_PARTY_HP };
