# Handoff do agente de motor

## Estado atual
T004 implementada e em REVIEW na branch agent/t004-engine, PR #4.

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

## Evidência
Run 35891871360 passou integralmente no head de código 22e0d75718b79c85b577ff83a28ae63fc17147ae.

## Próximo passo
Revisão independente da T004. T006 permanece bloqueada até T004 DONE.

## Riscos conhecidos
Input de gameplay ainda não é aceito por stepWorld; isso é deliberado até T005. Movimento/colisão não existem até T006.
