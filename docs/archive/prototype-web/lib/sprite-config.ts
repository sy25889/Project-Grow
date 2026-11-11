export type SpriteAnimation = 'idle' | 'move' | 'attack' | 'skill' | 'hit' | 'death';

export type SpriteSheetId =
  | 'tank'
  | 'melee'
  | 'ranged'
  | 'support'
  | 'assassin'
  | 'sprout'
  | 'vineHound'
  | 'rockGolem'
  | 'ruinTurtle'
  | 'fireWisp'
  | 'windSylph'
  | 'ancientTreeGuardian'
  | 'stoneGatekeeper'
  | 'elementalHeart';

export type SpriteSheetConfig = {
  source: string;
  columns: number;
  rows: number;
  animationRows: Record<SpriteAnimation, number>;
};

// Finder-added sheets were measured at 1122 x 1402 px. They use a 4 x 6 atlas:
// idle, move, attack, skill, hit, death. Calculated bounds preserve effect frames.
export const SPRITE_SHEETS: Record<SpriteSheetId, SpriteSheetConfig> = {
  tank: { source: '/assets/character/tank_paladin_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  melee: { source: '/assets/character/melee_swordsman_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  ranged: { source: '/assets/character/ranged_archer_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  support: { source: '/assets/character/support_healer_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  assassin: { source: '/assets/character/assassin_shadow_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  sprout: { source: '/assets/monsters/tree/sprout_popo_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  vineHound: { source: '/assets/monsters/tree/vine_hound_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  rockGolem: { source: '/assets/monsters/stone/rock_golem_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  ruinTurtle: { source: '/assets/monsters/stone/ruin_turtle_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  fireWisp: { source: '/assets/monsters/element/fire_wisp_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  windSylph: { source: '/assets/monsters/element/wind_sylph_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  ancientTreeGuardian: { source: '/assets/monsters/bosses/ancient_tree_guardian_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  stoneGatekeeper: { source: '/assets/monsters/stone/stone_gatekeeper_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
  elementalHeart: { source: '/assets/monsters/bosses/elemental_heart_sheet.png', columns: 4, rows: 6, animationRows: { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, death: 5 } },
};

export const SPRITE_FRAME_DURATION_MS = {
  idle: 190,
  move: 105,
  attack: 95,
  skill: 110,
  hit: 120,
  death: 170,
} as const;
