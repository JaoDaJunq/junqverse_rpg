# Handoff — T020 Quest Objective Progress

## Estado
DONE.

Branch: `agent/t020-quest-objective-progress`
PR: #24

## Entrega concluída
- aplicação de eventos no objetivo do estágio ativo;
- dedupe global de eventId dentro da quest;
- count para collect e defeat;
- dedupe de collectibleId em collectedIds;
- avanço automático do estágio via runtime da T018;
- preservação de processedEventIds após troca de estágio;
- validação de eventId antes de persistir;
- progresso final compatível com QuestProgressSchema.

## Evidência
- Commit funcional: `23d377f102796ff4279e4a1e6eb29c4f25bf69f9`
- CI: `36020420310` PASS
- Vitest: 19 arquivos / 157 testes PASS
- Playwright: 4/4 PASS
- typecheck, lint, planning integrity, content gate e build: PASS

## Revisão
A revisão pediu cobertura explícita para `defeat` com count > 1. O comportamento já era compartilhado com collect, mas ganhou teste dedicado antes do fechamento.

## Fora do escopo
- survive;
- escort;
- sequence;
- all/any;
- executor concreto de actions;
- mapas;
- persistência.
