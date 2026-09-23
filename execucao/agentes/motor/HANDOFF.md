# Handoff do agente de motor

## Estado atual
T004 implementada na branch agent/t004-engine e aguardando CI/revisão.

## O que existe
- packages/sim/src/clock.ts
- packages/sim/src/rng.ts
- packages/sim/src/world.ts
- exports em packages/sim/src/index.ts
- tests/sim-core.test.ts

## Contratos públicos
- TICKS_PER_SECOND
- FIXED_DT_SECONDS
- ticksToSeconds / secondsToTicks
- RngState / createRng / nextUint32 / nextFloat01
- WorldState / createWorld / stepWorld
- allocateEntityId
- emitWorldEvent
- nextWorldRandom
- WORLD_STEP_ORDER

## Próximo passo
1. validar T004 em CI;
2. revisão independente;
3. coordenador marca T004 DONE;
4. somente então T006 fica liberada.

## Riscos conhecidos
Input de gameplay ainda não é aceito por stepWorld; isso é deliberado até T005. Movimento/colisão não existem até T006.
