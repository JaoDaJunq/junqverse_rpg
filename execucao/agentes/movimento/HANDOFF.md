# Handoff do agente de movimento

## Estado atual
T006 implementada na branch agent/t006-movement e aguardando CI/revisão.

## Arquivos
- packages/sim/src/geometry.ts
- packages/sim/src/movement.ts
- tests/movement.test.ts

## Contratos públicos principais
- Aabb
- circleIntersectsAabb
- isCirclePositionFree
- firstSegmentHit
- segmentIntersectsAnyAabb
- hasLineOfSight
- normalizeMovementInput
- movementDeltaPerTick
- moveCircle
- moveCircleForTick
- moveCircleAlongSegment

## Próximo passo
CI + revisão independente. Quando T005 e T006 estiverem DONE, T007 fica liberada para o primeiro teste visual integrado.
