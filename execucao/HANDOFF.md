# Passagem de contexto

## Estado atual
T001, T002, T003 e T004 estão concluídas e aprovadas por revisão independente.

O saneamento P0 restaurou no repositório:
- tickets T005-T017;
- docs/03_GAMEPLAY_E_COMBATE.md;
- docs/06_UX_E_ACESSIBILIDADE.md;
- docs/18_MAPAS_E_ENCONTROS.md;
- personagens/jao.md;
- manifesto P0 T001-T017;
- CI global;
- teste automático de integridade do planejamento.

## Camada disponível
- T001: infraestrutura/workspaces
- T002: schemas e tipos públicos
- T003: validação de conteúdo e grafo
- T004: relógio fixo, WorldState, RNG seeded e IDs/eventos determinísticos

## Próximas tarefas liberadas
- T005 - entrada e remapeamento básico.
- T006 - movimento e colisão compartilhados.

T005 e T006 podem ser desenvolvidas em paralelo. T007 depende de T004 + T005 + T006.

## Testabilidade
- T005 permite testar teclado/mouse e estados de input.
- T006 permite testar movimento/colisão em camada de simulação.
- T007 é o primeiro ponto planejado em que input + simulação + Phaser ficam ligados numa sessão local visual.
- T008-T010 adicionam combate genérico.
- T012-T013 implementam o kit específico de Jão.
- T017 é o gate integrado do protótipo de combate.

## Pendência operacional
A conexão GitHub disponível não expõe escrita administrativa para proteção/ruleset da main. A CI global está configurada, mas branch protection deve ser habilitada manualmente caso a permissão administrativa continue indisponível.
