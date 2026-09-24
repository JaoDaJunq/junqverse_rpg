import {
  DEFAULT_LAB_LOADOUT,
  LAB_EFFECTS,
  LAB_SKILLS,
  normalizeLabLoadout,
  type LabEffectId,
  type LabLoadout,
  type LabSlotId,
  type PrototypeHeroId
} from './LabCatalog.js';

const HERO_KEY = 'junqverse.prototype.hero';
const LOADOUT_KEY = 'junqverse.prototype.lab-loadout';

export function loadPrototypeHeroId(): PrototypeHeroId {
  return window.localStorage.getItem(HERO_KEY) === 'test'
    ? 'test'
    : 'jao';
}

export function savePrototypeHeroId(heroId: PrototypeHeroId): void {
  window.localStorage.setItem(HERO_KEY, heroId);
}

export function loadLabLoadout(): LabLoadout {
  const raw = window.localStorage.getItem(LOADOUT_KEY);
  if (!raw) return DEFAULT_LAB_LOADOUT;

  try {
    return normalizeLabLoadout(JSON.parse(raw));
  } catch {
    return DEFAULT_LAB_LOADOUT;
  }
}

export function saveLabLoadout(loadout: LabLoadout): void {
  window.localStorage.setItem(LOADOUT_KEY, JSON.stringify(loadout));
}

export interface LabPanelOptions {
  readonly heroId: PrototypeHeroId;
  readonly loadout: LabLoadout;
  readonly onHeroChange: (heroId: PrototypeHeroId) => void;
  readonly onLoadoutChange: (loadout: LabLoadout) => void;
  readonly onPreview: (slot: LabSlotId, effectId: LabEffectId) => void;
}

function button(text: string, className: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = text;
  return element;
}

export class LabPanel {
  private readonly root: HTMLDivElement;
  private readonly options: LabPanelOptions;
  private loadout: LabLoadout;
  private selectedSlot: LabSlotId = 'basic';
  private previewTimers: number[] = [];

  public constructor(parent: HTMLElement, options: LabPanelOptions) {
    this.options = options;
    this.loadout = options.loadout;
    this.root = document.createElement('div');
    this.root.className = 'prototype-tools';
    parent.appendChild(this.root);
    this.render();
  }

  public destroy(): void {
    this.clearPreviewTimers();
    this.root.remove();
  }

  private clearPreviewTimers(): void {
    for (const timer of this.previewTimers) {
      window.clearTimeout(timer);
    }
    this.previewTimers = [];
  }

  private previewAllEffects(): void {
    this.clearPreviewTimers();

    LAB_EFFECTS.forEach((effect, index) => {
      const timer = window.setTimeout(() => {
        this.options.onPreview(this.selectedSlot, effect.id);
      }, index * 420);
      this.previewTimers.push(timer);
    });
  }

  private render(): void {
    this.root.replaceChildren();

    const heroRow = document.createElement('div');
    heroRow.className = 'prototype-hero-tabs';

    for (const hero of [
      { id: 'jao' as const, label: 'JÃO' },
      { id: 'test' as const, label: 'TESTE' }
    ]) {
      const heroButton = button(hero.label, 'prototype-hero-button');
      heroButton.classList.toggle('is-active', this.options.heroId === hero.id);
      heroButton.addEventListener('click', () => {
        if (hero.id !== this.options.heroId) {
          this.options.onHeroChange(hero.id);
        }
      });
      heroRow.appendChild(heroButton);
    }

    this.root.appendChild(heroRow);

    if (this.options.heroId !== 'test') {
      const hint = document.createElement('div');
      hint.className = 'prototype-lab-hint';
      hint.textContent = 'Selecione TESTE para abrir o laboratório de skills e efeitos.';
      this.root.appendChild(hint);
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'prototype-lab-panel';

    const heading = document.createElement('div');
    heading.className = 'prototype-lab-heading';
    heading.innerHTML = '<strong>LAB V3</strong><span>Escolha slot → efeito → preview</span>';
    panel.appendChild(heading);

    const slotRow = document.createElement('div');
    slotRow.className = 'prototype-lab-slots';

    for (const skill of LAB_SKILLS) {
      const slotButton = button(
        skill.slot === 'basic' ? 'BÁSICO' : skill.slot.toUpperCase(),
        'prototype-slot-button'
      );
      slotButton.title = `${skill.label} • ${skill.mechanic}`;
      slotButton.classList.toggle('is-active', skill.slot === this.selectedSlot);
      slotButton.addEventListener('click', () => {
        this.selectedSlot = skill.slot;
        this.render();
      });
      slotRow.appendChild(slotButton);
    }

    panel.appendChild(slotRow);

    const skillCatalog = document.createElement('details');
    skillCatalog.className = 'prototype-effect-catalog';
    const skillSummary = document.createElement('summary');
    skillSummary.textContent = `CATÁLOGO DE SKILLS (${LAB_SKILLS.length})`;
    skillCatalog.appendChild(skillSummary);

    for (const skill of LAB_SKILLS) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'prototype-effect-item';
      item.innerHTML =
        `<strong>${skill.slot === 'basic' ? 'BÁSICO' : skill.slot.toUpperCase()} • ${skill.label}</strong><span>${skill.mechanic}</span>`;
      item.addEventListener('click', () => {
        this.selectedSlot = skill.slot;
        this.render();
      });
      skillCatalog.appendChild(item);
    }

    panel.appendChild(skillCatalog);

    const selectedSkill = LAB_SKILLS.find(
      (skill) => skill.slot === this.selectedSlot
    )!;

    const skillCard = document.createElement('div');
    skillCard.className = 'prototype-skill-card';
    skillCard.innerHTML =
      `<strong>${selectedSkill.label}</strong><span>${selectedSkill.mechanic}</span>`;
    panel.appendChild(skillCard);

    const select = document.createElement('select');
    select.className = 'prototype-effect-select';

    for (const effect of LAB_EFFECTS) {
      const option = document.createElement('option');
      option.value = effect.id;
      option.textContent = `${effect.label} — ${effect.description}`;
      option.selected = this.loadout.effects[this.selectedSlot] === effect.id;
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      const effectId = select.value as LabEffectId;
      this.loadout = {
        effects: {
          ...this.loadout.effects,
          [this.selectedSlot]: effectId
        }
      };
      saveLabLoadout(this.loadout);
      this.options.onLoadoutChange(this.loadout);
    });
    panel.appendChild(select);

    const assignments = document.createElement('div');
    assignments.className = 'prototype-assignments';

    for (const skill of LAB_SKILLS) {
      const effect = LAB_EFFECTS.find(
        (candidate) => candidate.id === this.loadout.effects[skill.slot]
      );
      const row = document.createElement('div');
      row.innerHTML =
        `<span>${skill.slot === 'basic' ? 'BÁSICO' : skill.slot.toUpperCase()}</span><strong>${effect?.label ?? this.loadout.effects[skill.slot]}</strong>`;
      assignments.appendChild(row);
    }

    panel.appendChild(assignments);

    const actions = document.createElement('div');
    actions.className = 'prototype-lab-actions';

    const preview = button('PREVIEW EFEITO', 'prototype-lab-action');
    preview.addEventListener('click', () => {
      this.options.onPreview(
        this.selectedSlot,
        this.loadout.effects[this.selectedSlot]
      );
    });

    const previewAll = button('RODAR TODOS', 'prototype-lab-action');
    previewAll.addEventListener('click', () => {
      this.previewAllEffects();
    });

    const reset = button('RESET VFX', 'prototype-lab-action secondary');
    reset.addEventListener('click', () => {
      this.loadout = DEFAULT_LAB_LOADOUT;
      saveLabLoadout(this.loadout);
      this.options.onLoadoutChange(this.loadout);
      this.render();
    });

    actions.append(preview, previewAll, reset);
    panel.appendChild(actions);

    const catalog = document.createElement('details');
    catalog.className = 'prototype-effect-catalog';
    const summary = document.createElement('summary');
    summary.textContent = `CATÁLOGO DE EFEITOS (${LAB_EFFECTS.length})`;
    catalog.appendChild(summary);

    for (const effect of LAB_EFFECTS) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'prototype-effect-item';
      item.innerHTML = `<strong>${effect.label}</strong><span>${effect.description}</span>`;
      item.addEventListener('click', () => {
        this.loadout = {
          effects: {
            ...this.loadout.effects,
            [this.selectedSlot]: effect.id
          }
        };
        saveLabLoadout(this.loadout);
        this.options.onLoadoutChange(this.loadout);
        this.options.onPreview(this.selectedSlot, effect.id);
        this.render();
      });
      catalog.appendChild(item);
    }

    panel.appendChild(catalog);
    this.root.appendChild(panel);
  }
}
