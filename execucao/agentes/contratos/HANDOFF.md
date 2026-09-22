# Handoff do agente de contratos

## Estado atual
T002 implementada na branch agent/t002-contracts e aguardando validação/revisão.

## O que existe
- schemas runtime em packages/content e packages/protocol;
- tipos inferidos dos schemas;
- fixtures/casos de aceitação em tests/contracts.test.ts;
- lockfile sincronizado com zod no protocol.

## Próximo passo
1. rodar CI em checkout limpo;
2. corrigir qualquer falha real;
3. passar por revisão independente;
4. somente após T002 DONE liberar T003.

## Arquivos importantes
- docs/08_CONTRATOS_DE_DADOS.md
- packages/content/src/contracts.ts
- packages/protocol/src/contracts.ts
- tests/contracts.test.ts

## Riscos conhecidos
Campos cujo formato interno não está definido no contrato usam objetos JSON serializáveis conservadores. T003 deverá validar referências e grafo, sem reescrever os formatos públicos de T002.
