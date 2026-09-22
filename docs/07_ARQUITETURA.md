# Arquitetura de implementação

## Decisão técnica
Cliente TypeScript strict + Phaser 3.90.0 + Vite, npm workspaces. Phaser desenha, toca áudio e traduz entrada. Regras são TypeScript puro. A versão 3.90 foi escolhida deliberadamente como base fixa conhecida; não migrar para Phaser 4 durante tickets de gameplay.

O planejamento original aceitava Node linha 22 com patch >=22.12. A resolução real de dependências da T001 estreitou o piso implementado para >=22.13; package.json e docs/VERSOES_IMPLEMENTADAS.md registram o ambiente efetivo.

Sem React, ECS genérico, Nx, banco, login ou ferramenta de backend até o marco online. Testes de domínio com Vitest; fluxo no navegador com Playwright.

## Limites de dependência
sim depende apenas de tipos de content e utilitários puros. content não importa sim nem cliente. protocol usa tipos serializáveis; não referencia scenes. cliente depende de sim/content/protocol. servidor depende dos mesmos pacotes puros, nunca de cliente.

## Simulação
WorldState é a única autoridade. stepWorld(world, inputs, 1) avança um tick. seeded RNG armazenado no estado; não usar Math.random em regras. Não integrar Arcade Physics para decidir vida/posição.

## Build e deploy
npm ci usa lockfile; build gera apps/client/dist. Hospedagem estática basta para solo; URL WSS separada para online. Segredos só no servidor. Qualquer variável VITE_* é pública.

## Comandos que T001 deve criar
npm run dev, build, typecheck, lint, test, test:content e test:e2e. dev inicia cliente. test não fica em watch na CI.
