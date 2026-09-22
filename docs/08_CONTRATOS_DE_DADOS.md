# Contratos de dados
Estes contratos são normativos. T002 converte em TypeScript e schemas de runtime; exemplos cobrem apenas casos de referência.

## Primitivos
Id: string ASCII [a-z0-9_:-], 1–96 caracteres. HeroId: jao, alice, kauan, gui, thomas. QuestId: quest_m01…quest_m08 e quest_s01…quest_s10. Tick: inteiro não negativo. Vec2: {x:number,y:number}, finitos. Quantidades e contadores inteiros. Não aceitar NaN, Infinity, chaves __proto__ ou caminhos de arquivo vindos de save/mensagem.

## InputFrame
```ts
type InputFrame = {
  seq: number; clientTick: number;
  moveX: number; moveY: number;
  aimX: number; aimY: number;
  basicHeld: boolean;
  pressed: Array<"q"|"w"|"e"|"r"|"dodge"|"interact">;
  released: Array<"e"|"interact">;
  interactHeld: boolean;
};
```
pressed/released são sets sem duplicatas. Max 6 ações por frame. seq cresce monotonicamente por conexão.

## HeroDefinition e AbilityDefinition
Hero: id, nameKey, roleKey, hp, speedPxPerSecond, basic, passive, abilities {q,w,e,r}, assetId. Habilidade: id, nameKey, costFocus, cooldownTicks, windupTicks, recoveryTicks, target, rangePx, shapes/effects, tags, limits. Efeitos discriminados: damage, heal, shield, status, dash, projectile, zone, device, reveal.

## MapDefinition
id, tileSize=32, widthTiles, heightTiles, rooms[], spawnPoints[], blockers[], interactables[], exits[]. Validator verifica referências, coordenadas, conectividade e ponto de saída.

## QuestDefinition
id, kind ("main"|"side"), titleKey, mapId, prerequisites[], stages[], rewards, firstClearFlag. Stage: id, objective, entryActions[], completionActions[], checkpointAfter:boolean, nextStageId ou null. Objectives: enter_area, interact, collect, defeat, survive, escort, sequence, choose, all/any. Não há script string nem eval.

## QuestProgress
questId, runId, currentStageId, completedStageIds[], objectiveState, flags{}, collectedIds[], executedActionIds[], checkpointId, status. IDs duplicados não incrementam coleta.

## Eventos de domínio
EventEnvelope: eventId, tick, runId, type, payload. Tipos mínimos: entity_spawned, entity_moved, attack_started, damage_applied, entity_died, status_applied, item_collected, interaction_completed, area_entered, choice_committed, stage_completed, quest_completed, reward_granted, checkpoint_committed.

## SaveGame schemaVersion 1
```ts
type SaveGame = {
  schemaVersion: 1; contentVersion: string;
  profileId: string; updatedAt: string;
  xp: number; fragments: number;
  unlockedHeroes: string[]; unlockedRelics: string[];
  loadouts: Record<string,string[]>;
  completedQuests: string[]; storyFlags: Record<string,boolean|string>;
  cosmetics: string[]; mastery: Record<string,number>;
  rewardLedger: Record<string,{xp:number;fragments:number}>;
  activeRun: null | CheckpointSave;
  settings: Settings;
};
```

## Validação obrigatória
Hero/quest/asset referenciados devem existir; cada quest termina; prerequisites sem ciclo; etapas alcançáveis; spawn sem parede; texto não vazio; moedas não negativas; loadout máximo 2 diferentes; payload de save até 2 MiB antes de parse. Erro de conteúdo em build bloqueia release e aponta caminho + ID.
