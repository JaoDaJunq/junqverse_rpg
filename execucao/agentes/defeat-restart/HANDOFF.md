# Handoff do agente T015

## Estado atual
T015 implementada na branch agent/t015-defeat-restart, aguardando CI/revisão.

## Arquivos principais
- packages/sim/src/encounter.ts
- apps/client/src/adapters/LocalSession.ts
- apps/client/src/ui/DefeatPanel.ts
- apps/client/src/scenes/ExpeditionScene.ts
- tests/encounter-restart.test.ts
- tests/e2e/defeat.spec.ts

## Teste manual técnico
Abrir a sala com ?debugDefeat=1 e pressionar K.
- Tentar novamente: reset in-place da sessão.
- Retornar: restart completo da scene.

## Próximo passo
1. CI;
2. revisão independente;
3. T015 DONE;
4. T016;
5. T017 após T015 + T016.
