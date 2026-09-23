# Handoff do agente de input

## Estado atual
T005 implementada na branch agent/t005-input e aguardando CI/revisão.

## Arquivos principais
- apps/client/src/input/bindings.ts
- apps/client/src/input/InputMapper.ts
- apps/client/src/input/index.ts
- tests/input-mapper.test.ts

## Contrato produzido
InputMapper.nextFrame(clientTick) retorna InputFrame de @junqverse/protocol.

## Próximo passo
1. CI completa;
2. revisão independente;
3. T005 DONE após aprovação;
4. T007 somente quando T006 também estiver DONE.
