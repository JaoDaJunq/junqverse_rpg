# Handoff do agente de infraestrutura

## Estado atual
T001 está em implementação na branch agent/t001-infra.

## Já estruturado
- workspaces client/sim/content/protocol;
- server apenas reservado;
- cliente mínimo Phaser/Vite;
- scripts dev/build/typecheck/lint/test/test:content/test:e2e;
- versões exatas documentadas.

## Falta para concluir
- gerar package-lock.json;
- provar npm ci, build, typecheck, lint, Vitest e Playwright em checkout limpo;
- mover para REVIEW após evidência.

## Risco conhecido
O ambiente local do agente não alcança registry npm.
