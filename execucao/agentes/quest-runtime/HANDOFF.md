# Handoff — T018 Quest Runtime

## Estado
DONE.

Branch: `agent/t018-quest-runtime`
PR: #22

## Entrega concluída
Runtime puro de `QuestProgress` com:
- prerequisites e disponibilidade;
- transição locked → available → active → completed;
- ativação com entryActions idempotentes;
- progressão de estágio;
- completionActions idempotentes;
- checkpoint por estágio;
- proteção contra conclusão repetida/stale;
- IDs derivados estáveis e compatíveis com o limite de `IdSchema`.

## Evidência
- Commit funcional final antes da documentação: `f9277a85f9f60c7a25d613186e9189a8f7f3588e`
- CI: `36018449319` PASS
- Vitest: 17 arquivos / 139 testes PASS
- Playwright: 4/4 PASS
- typecheck, lint, planning integrity, content gate e build: PASS
- QuestProgressSchema valida progresso mesmo com stage id no limite de 96 caracteres.

## Revisão
A revisão encontrou risco de IDs derivados excederem o limite serializável de 96 caracteres. O runtime foi corrigido com fragmento estável curto baseado no stage id, e o caso-limite ganhou teste dedicado.

## Fora do escopo
- matching de objetivos;
- execução concreta de spawn/dialogue/flags;
- M01;
- mapa;
- persistência.

Esses itens devem entrar em tickets seguintes, sem reabrir a base da T018.
