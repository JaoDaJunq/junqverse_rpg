# Handoff — T021 Quest Survive

## Estado
DONE.

Branch: `agent/t021-quest-survive`
PR: #25

## Entrega concluída
Objetivo `survive` determinístico por tick com:
- `durationTicks` inteiro positivo;
- `surviveStartedAtTick`;
- `elapsedTicks`;
- `remainingTicks`;
- cálculo por tick absoluto;
- conclusão via runtime T018;
- preservação de `processedEventIds` na troca de estágio;
- estágio terminal compatível com QuestProgressSchema.

## Decisão importante
O timer não incrementa por chamada. Ele deriva de:

`currentTick - surviveStartedAtTick`

Isso evita diferença por FPS, render, chamadas repetidas ou pausa.

## Evidência
- Commit funcional: `b9db7c4b20b9a7edb7351b49e567bbfa6e590fef`
- CI: `36067908463` PASS
- Vitest: 20 arquivos / 165 testes PASS
- Playwright: 4/4 PASS
- typecheck, lint, planning integrity, content gate e build: PASS

## Fora do escopo
- wave manager;
- spawn automático;
- reset ao tomar dano;
- escort;
- sequence/all/any;
- HUD de cronômetro;
- mapas;
- persistência.
