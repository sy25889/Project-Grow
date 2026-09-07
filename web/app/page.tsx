'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RotateCcw, Sparkles, TimerReset } from 'lucide-react';
import { BattleScene } from '@/components/battle-scene';
import { BOSS, CELION_PROTOTYPE_TUNING, PARTY, PROTOTYPE_TUNING, type PartyRole } from '@/lib/battle-config';
import { Button } from '@/components/ui/button';

type PartyBattleState = { id: PartyRole; hp: number; shield: number };
type BattleStatus = 'fighting' | 'clear' | 'timeout' | 'defeated';
type BattleState = {
  time: number; bossHp: number; barrier: number; groggyRemaining: number;
  enemyAttackCooldown: number; skillCooldown: number; lightBarrierCooldown: number;
  lightBarrierRemaining: number; lightBarrierCastPulse: number; members: PartyBattleState[];
  status: BattleStatus; lastEvent: string;
};

const TICK_SECONDS = 0.15;
const MAX_PARTY_HP = 100;

function createBattleState(): BattleState {
  return {
    time: PROTOTYPE_TUNING.stageTime,
    bossHp: PROTOTYPE_TUNING.bossMaxHp,
    barrier: PROTOTYPE_TUNING.barrierMax,
    groggyRemaining: 0,
    enemyAttackCooldown: PROTOTYPE_TUNING.bossAttackEvery,
    skillCooldown: PROTOTYPE_TUNING.normalSkillEvery,
    lightBarrierCooldown: CELION_PROTOTYPE_TUNING.lightBarrierCooldown,
    lightBarrierRemaining: 0,
    lightBarrierCastPulse: 0,
    members: PARTY.map((member) => ({ id: member.id, hp: MAX_PARTY_HP, shield: 0 })),
    status: 'fighting',
    lastEvent: '자동 전투 진행 중',
  };
}

function formatTime(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function applyDamage(state: BattleState, rawDamage: number, barrierPressure: number, event?: string) {
  const barrier = Math.max(0, state.barrier - barrierPressure);
  const firstBreak = state.barrier > 0 && barrier === 0;
  const multiplier = barrier > 0 ? PROTOTYPE_TUNING.shieldedDamageMultiplier : state.groggyRemaining > 0 || firstBreak ? PROTOTYPE_TUNING.groggyDamageMultiplier : 1;
  return {
    ...state,
    barrier,
    bossHp: Math.max(0, state.bossHp - rawDamage * multiplier),
    groggyRemaining: firstBreak ? PROTOTYPE_TUNING.groggyDuration : state.groggyRemaining,
    lastEvent: firstBreak ? '방어 게이지 파괴 - GROGGY' : event ?? state.lastEvent,
  };
}

function applyIncomingDamage(member: PartyBattleState, rawDamage: number, damageTakenMultiplier: number) {
  const reducedDamage = rawDamage * damageTakenMultiplier;
  const absorbedDamage = Math.min(member.shield, reducedDamage);
  return {
    ...member,
    shield: Math.max(0, member.shield - absorbedDamage),
    hp: Math.max(0, member.hp - (reducedDamage - absorbedDamage)),
  };
}

function castLightBarrier(state: BattleState): BattleState {
  const breakthrough = CELION_PROTOTYPE_TUNING.celionBreakthrough;
  return {
    ...state,
    lightBarrierRemaining: CELION_PROTOTYPE_TUNING.lightBarrierDuration,
    lightBarrierCastPulse: state.lightBarrierCastPulse + 1,
    members: state.members.map((member) => {
      if (member.hp <= 0) return member;
      const shieldAmount = (breakthrough >= 5 ? CELION_PROTOTYPE_TUNING.partyShieldAt5 : 0)
        + (member.id === 'tank' && breakthrough >= 3 ? CELION_PROTOTYPE_TUNING.selfShieldAt3 : 0);
      return { ...member, shield: Math.min(CELION_PROTOTYPE_TUNING.shieldMax, member.shield + shieldAmount) };
    }),
    lastEvent: '빛의 결계',
  };
}

function tickBattle(current: BattleState): BattleState {
  if (current.status !== 'fighting') return current;
  let next: BattleState = {
    ...current,
    time: current.time - TICK_SECONDS,
    groggyRemaining: Math.max(0, current.groggyRemaining - TICK_SECONDS),
    enemyAttackCooldown: current.enemyAttackCooldown - TICK_SECONDS,
    skillCooldown: current.skillCooldown - TICK_SECONDS,
    lightBarrierCooldown: current.lightBarrierCooldown - TICK_SECONDS,
    lightBarrierRemaining: Math.max(0, current.lightBarrierRemaining - TICK_SECONDS),
  };
  const alive = next.members.filter((member) => member.hp > 0);
  const basicDamage = alive.reduce((sum, member) => sum + (PARTY.find((entry) => entry.id === member.id)?.basicAttack ?? 0), 0) * TICK_SECONDS;
  const barrierPressure = alive.reduce((sum, member) => sum + (PARTY.find((entry) => entry.id === member.id)?.barrierPressure ?? 0), 0) * TICK_SECONDS;
  next = applyDamage(next, basicDamage, barrierPressure);
  if (next.skillCooldown <= 0) {
    next = applyDamage(next, PROTOTYPE_TUNING.normalSkillDamage, 28, '일반 스킬 자동 사용');
    next.skillCooldown = PROTOTYPE_TUNING.normalSkillEvery;
  }
  if (next.lightBarrierCooldown <= 0 && next.members.some((member) => member.id === 'tank' && member.hp > 0)) {
    next = castLightBarrier(next);
    next.lightBarrierCooldown = CELION_PROTOTYPE_TUNING.lightBarrierCooldown;
  }
  if (next.enemyAttackCooldown <= 0) {
    const tauntActive = next.lightBarrierRemaining > 0 && next.members.some((member) => member.id === 'tank' && member.hp > 0);
    const damageTakenMultiplier = next.lightBarrierRemaining > 0 ? CELION_PROTOTYPE_TUNING.damageTakenMultiplier : 1;
    next.members = next.members.map((member) => {
      if (tauntActive && member.id !== 'tank') return member;
      const rawDamage = member.id === 'tank' ? PROTOTYPE_TUNING.bossDamageTank : PROTOTYPE_TUNING.bossDamageOther;
      return applyIncomingDamage(member, rawDamage, damageTakenMultiplier);
    });
    next.enemyAttackCooldown = PROTOTYPE_TUNING.bossAttackEvery;
    next.lastEvent = tauntActive ? '빛의 결계 - 골렘 도발' : '골렘의 대지 강타';
  }
  if (next.members.some((member) => member.id === 'support' && member.hp > 0)) {
    next.members = next.members.map((member) => ({ ...member, hp: Math.min(MAX_PARTY_HP, member.hp + PROTOTYPE_TUNING.supportHealingPerSecond * TICK_SECONDS) }));
  }
  if (next.bossHp <= 0) return { ...next, status: 'clear', lastEvent: '세계수 수호 골렘 격파' };
  if (!next.members.some((member) => member.hp > 0)) return { ...next, status: 'defeated', lastEvent: '원정대 전멸' };
  if (next.time <= 0) return { ...next, time: 0, status: 'timeout', lastEvent: '제한시간 초과' };
  return next;
}

export default function Home() {
  const [battle, setBattle] = useState<BattleState>(createBattleState);
  const [showLightBarrierAnnouncement, setShowLightBarrierAnnouncement] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setBattle(tickBattle), TICK_SECONDS * 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (battle.lightBarrierCastPulse === 0) return;
    setShowLightBarrierAnnouncement(true);
    const timer = window.setTimeout(() => setShowLightBarrierAnnouncement(false), 1050);
    return () => window.clearTimeout(timer);
  }, [battle.lightBarrierCastPulse]);
  const totalPartyHp = useMemo(() => battle.members.reduce((sum, member) => sum + member.hp, 0) / (PARTY.length * MAX_PARTY_HP), [battle.members]);
  const bossHealthRatio = battle.bossHp / PROTOTYPE_TUNING.bossMaxHp;
  const barrierRatio = battle.barrier / PROTOTYPE_TUNING.barrierMax;
  const partyShields = useMemo(() => battle.members.map((member) => member.shield), [battle.members]);
  return (
    <main className="game-shell">
      <BattleScene barrierRatio={barrierRatio} bossHealthRatio={bossHealthRatio} groggyRemaining={battle.groggyRemaining} lightBarrierRemaining={battle.lightBarrierRemaining} lightBarrierCastPulse={battle.lightBarrierCastPulse} partyShields={partyShields} />
      <header className="game-topbar">
        <div className="stage-lockup"><span className="chapter-mark">01</span><div><p>세계수 하층</p><strong>Chapter 1 Boss</strong></div></div>
        <div className="timer-lockup" aria-label={`남은 시간 ${formatTime(battle.time)}`}><TimerReset size={17} strokeWidth={2.3} /><strong>{formatTime(battle.time)}</strong></div>
        <div className="prototype-mark"><Sparkles size={14} /><span>PHASE 1</span></div>
      </header>
      <section className="boss-hud" aria-label="보스 상태">
        <div className="boss-heading"><div><p>{BOSS.subtitle}</p><h1>{BOSS.name}</h1></div>{battle.groggyRemaining > 0 && <span className="groggy-chip">GROGGY {battle.groggyRemaining.toFixed(1)}s</span>}</div>
        <div className="meter-block boss-meter"><div className="meter-label"><span>HP</span><b>{Math.ceil(battle.bossHp).toLocaleString()} / {PROTOTYPE_TUNING.bossMaxHp.toLocaleString()}</b></div><div className="meter-track"><span className="boss-fill" style={{ width: `${bossHealthRatio * 100}%` }} /></div></div>
        <div className="meter-block barrier-meter"><div className="meter-label"><span>방어 게이지</span><b>{Math.ceil(battle.barrier)} / {PROTOTYPE_TUNING.barrierMax}</b></div><div className="meter-track"><span className="barrier-fill" style={{ width: `${barrierRatio * 100}%` }} /></div></div>
      </section>
      <div className="battle-callout" aria-live="polite"><span className="event-spark" />{battle.lastEvent}</div>
      {showLightBarrierAnnouncement && <div className="light-barrier-announcement" key={battle.lightBarrierCastPulse} aria-live="polite"><span>빛의 결계</span></div>}
      <section className="party-hud" aria-label="원정대 상태">
        <div className="party-caption"><span>EXPEDITION</span>{battle.lightBarrierRemaining > 0 && <span className="light-barrier-status">빛의 결계 {battle.lightBarrierRemaining.toFixed(1)}s</span>}<b>{Math.ceil(totalPartyHp * 100)}%</b></div>
        <div className="party-list">{PARTY.map((member) => {
          const state = battle.members.find((entry) => entry.id === member.id)!;
          const shieldRatio = Math.min(100, (state.shield / CELION_PROTOTYPE_TUNING.shieldMax) * 100);
          return <div className="party-member" key={member.id} aria-label={`${member.name} HP ${Math.ceil(state.hp)}, 보호막 ${Math.ceil(state.shield)}`}><span className={`party-avatar role-${member.id}`} style={{ '--member-color': member.color } as CSSProperties}><i /><b>{member.name.slice(0, 1)}</b></span><div className="party-health"><div><b>{member.name}</b><span>{member.roleLabel}</span></div><div className="member-bars"><div className="member-health-track"><i style={{ width: `${state.hp}%` }} /></div>{state.shield > 0 && <div className="member-shield-row" aria-label={`보호막 ${Math.ceil(state.shield)}`}><div className="member-shield-track"><i style={{ width: `${shieldRatio}%` }} /></div><span>{Math.ceil(state.shield)}</span></div>}</div></div></div>;
        })}</div>
      </section>
      {battle.status !== 'fighting' && <section className="result-overlay" role="dialog" aria-modal="true" aria-label="전투 결과"><div className="result-card"><p>{battle.status === 'clear' ? 'CHAPTER 1 BOSS' : 'BATTLE RESULT'}</p><h2>{battle.status === 'clear' ? 'CLEAR' : battle.status === 'timeout' ? 'TIME OUT' : 'DEFEATED'}</h2><Button type="button" onClick={() => setBattle(createBattleState)}><RotateCcw size={17} />다시 전투</Button></div></section>}
    </main>
  );
}
