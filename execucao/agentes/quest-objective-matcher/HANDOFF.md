# Handoff — T019 Quest Objective Matcher

## Estado
DONE.

Branch: `agent/t019-quest-objective-matcher`
PR: #23

## Entrega concluída
Matcher puro evento → objetivo para:
- enter_area;
- interact;
- collect;
- defeat;
- choose.

Filtros:
- runId obrigatório;
- questId quando presente no payload;
- tipo de evento;
- alvo configurado.

Resultados distinguem:
- matched;
- run_mismatch;
- quest_mismatch;
- event_type_mismatch;
- target_mismatch;
- invalid_objective;
- unsupported_objective.

## Arquitetura
`packages/sim` não importa `packages/protocol`.
O matcher usa uma interface estrutural mínima e os testes passam um `EventEnvelopeSchema` real do protocol.

## Evidência
- Commit funcional: `0f266c8d691363fedff8c148c91a3d918afcfc10`
- CI: `36019365915` PASS
- Vitest: 18 arquivos / 149 testes PASS
- Playwright: 4/4 PASS
- typecheck, lint, planning integrity, content gate e build: PASS

## Fora do escopo
- contadores;
- dedupe de eventId;
- mutação de QuestProgress;
- conclusão automática de stage;
- survive/escort;
- sequence/all/any.

Esses itens seguem para tickets posteriores.
