# Relatório de saneamento P0

## Objetivo
Corrigir os bloqueios encontrados na revisão total sem implementar gameplay.

## Restaurado do pacote original
- execucao/tarefas/T005.md
- execucao/tarefas/T007.md até T017.md
- docs/03_GAMEPLAY_E_COMBATE.md
- docs/06_UX_E_ACESSIBILIDADE.md
- docs/18_MAPAS_E_ENCONTROS.md
- personagens/jao.md

T006 já existia e foi preservado.

## Grafo
execucao/manifest.json agora representa T001-T017 e suas dependências/referências P0.

## CI
- workflow global .github/workflows/ci.yml;
- npm audit --audit-level=high;
- npm run test:plan;
- typecheck, lint, tests, content gate, build e Playwright.

## Proteção da main
Não aplicada automaticamente porque a conexão GitHub não oferece mutação administrativa de branch protection/rulesets. Permanece ação operacional externa.

## Dívida conhecida
A validação semântica completa de MapDefinition (spawn fora de parede, conectividade, saída e coordenadas) continua registrada como dívida antes de conteúdo real de mapas.

## Próximo passo
Após CI e revisão deste saneamento, T005 e T006 ficam realmente executáveis usando somente o repositório como contexto P0.
