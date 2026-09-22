# Handoff do agente de contratos

## Estado atual
T002 está em REVIEW na branch agent/t002-contracts, PR #2.

## O que funciona
- schemas runtime em packages/content e packages/protocol;
- tipos inferidos dos schemas;
- testes de aceitação reais em tests/contracts.test.ts;
- npm ci/typecheck/lint/test/build/preview verdes;
- lockfile sincronizado.

## Próximo passo
Reviewer independente deve validar o head atual. T003 só pode ser liberada depois de T002 DONE pelo coordenador.

## Arquivos importantes
- docs/08_CONTRATOS_DE_DADOS.md
- packages/content/src/contracts.ts
- packages/protocol/src/contracts.ts
- tests/contracts.test.ts
- execucao/agentes/contratos/RELATORIO.md

## Riscos conhecidos
Campos cujo formato interno não está definido no contrato usam objetos JSON serializáveis conservadores. T003 deverá validar referências e grafo, sem reescrever os formatos públicos de T002.
