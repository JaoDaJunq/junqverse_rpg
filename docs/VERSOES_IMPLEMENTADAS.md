# Versões implementadas

Registro de T001. As versões são exatas para instalação reproduzível.

## Ambiente-alvo
- Node.js: linha 22, mínimo 22.12 e menor que 23.
- npm: lockfile gerado no CI com Node 22.

## Dependências fixadas
- Phaser: 3.90.0
- TypeScript: 6.0.3
- Vite: 8.3.0
- Zod: 4.6.5
- Vitest: 5.0.1
- Playwright Test: 1.63.0
- ESLint: 10.11.0
- @typescript-eslint/parser: 8.70.0
- @typescript-eslint/eslint-plugin: 8.70.0

## Compatibilidade
TypeScript 7.0.2 existe, mas @typescript-eslint 8.70.0 declara peer range TypeScript >=4.8.4 e <6.1.0. T001 fixa 6.0.3 para manter o lint dentro da faixa declarada.

## Comandos
- npm run dev: cliente Vite.
- npm run build: build estático do cliente.
- npm run preview: preview do build.
- npm run typecheck: projetos TypeScript referenciados.
- npm run lint: ESLint.
- npm run test: Vitest em modo não-watch.
- npm run test:content: informa explicitamente que os casos runtime pertencem a T002/T003.
- npm run test:e2e: smoke real da página mínima via Playwright.
