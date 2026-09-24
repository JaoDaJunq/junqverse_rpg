# Relatório — T018 Motor de objetivos básicos

Data: 2026-09-24
Branch: `agent/t018-quest-objectives`
PR: #20
Commit validado: `0704a38130dbd442c323c02ed6cf902b63a49ede`
CI: `36008599138` PASS

## Escopo entregue
- máquina de estados `locked → available → active → completed`;
- um stage ativo por instância;
- objetivos básicos `enter_area`, `interact`, `collect` e `defeat`;
- composição `all/any` com máximo de dois níveis;
- filtro por `runId`;
- deduplicação por `eventId`;
- IDs autorais únicos para itens e alvos;
- ações de entrada/conclusão emitidas uma única vez por ID;
- conclusão final congelada após `completed`;
- coleta global limitada aos IDs declarados no objetivo ativo.

## Decisões
- `defeat` não usa “mapa vazio”. O evento final deve ser `entity_died` com `encounterId` correspondente e `encounterCleared: true`.
- `holdTicks` pertence à camada que produz `interaction_completed`; T018 apenas consome o evento confirmado.
- Ação passa a constar em `executedActionIds` no momento em que o engine a emite. Confirmação persistente/checkpoint é responsabilidade de T020.
- Eventos de outra run são ignorados.
- Evento repetido não pode avançar um stage posterior mesmo se o objetivo for semanticamente igual.

## Arquivos principais
- `packages/sim/src/quests/objectives.ts`
- `packages/sim/src/quests/engine.ts`
- `tests/quest-objectives.test.ts`
- `tests/quest-engine.test.ts`
- `docs/08_CONTRATOS_DE_DADOS.md`
- `docs/09_QUEST_ENGINE.md`

## Verificação real
CI `36008599138`:
- typecheck PASS;
- lint PASS;
- 19 arquivos / 172 testes PASS;
- planning integrity PASS;
- content gate PASS;
- build PASS;
- 4 Playwright PASS.

## Dependência upstream
T018 depende formalmente de T017. O MVP autorizou desenvolvimento empilhado enquanto o playtest manual da T017 fica para depois. Por isso T018 permanece REVIEW e não DONE.

## Próximo passo
T019 pode ser desenvolvido de forma empilhada por autorização explícita do MVP, mas não deve ser integrado à main enquanto a cadeia upstream não for fechada.
