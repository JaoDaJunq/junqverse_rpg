# Relatório de revisão — T020

Data: 2026-09-24
Branch revisada: `agent/t020-quest-objective-progress`
PR: #24

## Escopo revisado
- aplicação de evento no objetivo ativo;
- idempotência por eventId;
- coleta única por collectibleId;
- contagem de collect/defeat;
- avanço automático de estágio;
- preservação de dedupe após transição;
- serialização de QuestProgress.

## Achado R1 — cobertura insuficiente de defeat count
O código compartilhava a mesma regra de count entre collect e defeat, mas a primeira versão de testes comprovava count > 1 somente para collect.

### Correção
Teste dedicado adicionado no commit:
`23d377f102796ff4279e4a1e6eb29c4f25bf69f9`

O teste exige dois eventos entity_died únicos antes de concluir o estágio.

## Verificações
- evento repetido não incrementa;
- collectibleId repetido com eventId novo não incrementa;
- collect count > 1 funciona;
- defeat count > 1 funciona;
- evento de outro run não altera estado;
- replay após troca de estágio não progride estágio seguinte;
- eventId inválido não é persistido;
- conclusão terminal mantém QuestProgressSchema válido.

## Resultado
APROVADO.

CI `36020420310`:
- typecheck PASS;
- lint PASS;
- 19 arquivos / 157 testes PASS;
- planning integrity PASS;
- content gate PASS;
- build PASS;
- 4 Playwright PASS.
