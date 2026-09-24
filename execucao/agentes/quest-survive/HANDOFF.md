# Handoff — T021 Quest Survive

## Estado
IN_PROGRESS.

Branch: `agent/t021-quest-survive`

## Escopo
Objetivo `survive` determinístico por tick:
- `durationTicks`;
- `surviveStartedAtTick`;
- `elapsedTicks`;
- conclusão via runtime T018;
- preservação de dedupe global de eventos.

## Decisão importante
O timer não incrementa por chamada. Ele deriva de ticks absolutos da simulação.

Isso evita diferenças entre:
- 30 FPS e 60 FPS;
- chamadas repetidas no mesmo tick;
- pausa;
- render atrasado.

## Fora do escopo
- wave manager;
- spawn de encounter;
- dano/vida como condição de reset;
- escort;
- objetivos compostos;
- HUD de cronômetro.
