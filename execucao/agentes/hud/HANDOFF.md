# Handoff do agente T016

## Estado atual
T016 DONE na branch agent/t016-hud após revisão do diff e CI completo verde.

## Evidências
- CI P0 35955830871: PASS.
- Typecheck: PASS.
- Lint: PASS.
- Build: PASS.
- Vitest: 16 arquivos, 133 testes, todos PASS.
- Playwright: 4 testes, todos PASS.
- Critérios do ticket conferidos: remap no slot, 960x540 e 1280x720 usáveis, HUD sem captura de pointer.

## Arquivos principais
- apps/client/src/presentation/hud-model.ts
- apps/client/src/presentation/Hud.ts
- apps/client/src/ui/styles.css
- apps/client/src/scenes/ExpeditionScene.ts
- tests/hud-model.test.ts

## Limite preservado
A ligação do HUD e do combate em tempo real não foi puxada para T016. O gate jogável e a validação observável de Q/W/E/R, básico e esquiva pertencem à T017.

## Próximo passo
T017 está liberada por T003 + T015 + T016 DONE.
