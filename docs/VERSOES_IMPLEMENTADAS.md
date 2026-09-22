# Versões implementadas

Registro de T001. As versões são exatas para instalação reproduzível.

## Ambiente implementado
- Node.js: 22.16.0
- npm: 10.9.2
- package-lock.json: lockfileVersion 3

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

## Comandos validados em CI
- npm ci --ignore-scripts
- npm run build
- npm run typecheck
- npm run lint
- npm run test
- npm run test:content
- npm run test:e2e

## Comandos de desenvolvimento
- npm run dev: cliente Vite.
- npm run preview: preview do build.

O comando test:content informa explicitamente que os schemas e casos runtime serão implementados em T002/T003; T001 não mascara a ausência desses testes.
