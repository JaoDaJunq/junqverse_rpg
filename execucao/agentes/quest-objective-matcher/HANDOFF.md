# Handoff — T019 Quest Objective Matcher

## Estado
IN_PROGRESS.

Branch: `agent/t019-quest-objective-matcher`

## Escopo
Matcher puro evento → objetivo para:
- enter_area;
- interact;
- collect;
- defeat;
- choose.

## Arquitetura
O matcher usa uma interface estrutural mínima compatível com EventEnvelope. `packages/sim` não importa `packages/protocol`.

## Fora do escopo
- contadores;
- dedupe de eventId;
- mutação de QuestProgress;
- conclusão automática de stage;
- survive/escort;
- sequence/all/any.
