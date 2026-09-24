export type PrototypeHeroId = 'jao' | 'test';

export type LabSlotId = 'basic' | 'q' | 'w' | 'e' | 'r';

export type LabEffectId =
  | 'slash_white'
  | 'spark_blue'
  | 'magic_violet'
  | 'circle_cyan'
  | 'impact_gold'
  | 'arcane_combo'
  | 'electric_combo';

export interface LabEffectDefinition {
  readonly id: LabEffectId;
  readonly label: string;
  readonly description: string;
}

export interface LabSkillDefinition {
  readonly slot: LabSlotId;
  readonly label: string;
  readonly mechanic: string;
}

export interface LabLoadout {
  readonly effects: Readonly<Record<LabSlotId, LabEffectId>>;
}

export const LAB_SKILLS: readonly LabSkillDefinition[] = [
  { slot: 'basic', label: 'Corte de Laboratório', mechanic: 'Slash frontal curto' },
  { slot: 'q', label: 'Dash Cortante', mechanic: 'Dash direcional' },
  { slot: 'w', label: 'Nova Arcana', mechanic: 'Pulso radial' },
  { slot: 'e', label: 'Corte Energético', mechanic: 'Cone carregável' },
  { slot: 'r', label: 'Sobrecarga Experimental', mechanic: 'Estado de poder' }
];

export const LAB_EFFECTS: readonly LabEffectDefinition[] = [
  { id: 'slash_white', label: 'Slash Branco', description: 'Corte limpo e rápido' },
  { id: 'spark_blue', label: 'Faísca Azul', description: 'Explosão elétrica curta' },
  { id: 'magic_violet', label: 'Magia Violeta', description: 'Burst arcano' },
  { id: 'circle_cyan', label: 'Anel Ciano', description: 'Pulso circular' },
  { id: 'impact_gold', label: 'Impacto Dourado', description: 'Hit pesado' },
  { id: 'arcane_combo', label: 'Combo Arcano', description: 'Magia + anel + impacto' },
  { id: 'electric_combo', label: 'Combo Elétrico', description: 'Faísca + slash + impacto' }
];

export const DEFAULT_LAB_LOADOUT: LabLoadout = {
  effects: {
    basic: 'slash_white',
    q: 'electric_combo',
    w: 'arcane_combo',
    e: 'impact_gold',
    r: 'circle_cyan'
  }
};

const EFFECT_IDS = new Set(LAB_EFFECTS.map((effect) => effect.id));

export function normalizeLabLoadout(value: unknown): LabLoadout {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_LAB_LOADOUT;
  }

  const effects = (value as { effects?: unknown }).effects;
  if (typeof effects !== 'object' || effects === null) {
    return DEFAULT_LAB_LOADOUT;
  }

  const candidate = effects as Record<string, unknown>;
  const next = { ...DEFAULT_LAB_LOADOUT.effects };

  for (const slot of ['basic', 'q', 'w', 'e', 'r'] as const) {
    const effect = candidate[slot];
    if (typeof effect === 'string' && EFFECT_IDS.has(effect as LabEffectId)) {
      next[slot] = effect as LabEffectId;
    }
  }

  return { effects: next };
}

export function effectForSlot(
  loadout: LabLoadout,
  slot: LabSlotId
): LabEffectId {
  return loadout.effects[slot];
}
