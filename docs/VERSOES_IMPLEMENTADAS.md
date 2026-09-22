# Versões implementadas

Registro de T001. As versões são exatas para instalação reproduzível.

## Ambiente implementado
- Node.js: linha 22, mínimo 22.13.0 e menor que 23.
- npm: lockfileVersion 3; instalação de aceite usa `npm ci`.
- Motivo do piso 22.13: o lockfile atual resolve `@eslint/config-array@0.23.5`, que exige `^22.13.0` na linha Node 22.

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

## Comandos
- npm run dev: cliente Vite.
- npm run build: build estático do cliente.
- npm run preview: preview do build.
- npm run typecheck: TypeScript estrito nos quatro workspaces.
- npm run lint: ESLint.
- npm run test: smoke real do contrato de workspace.
- npm run test:content: informa explicitamente que os casos runtime pertencem a T002/T003.
- npm run test:e2e: smoke real da página mínima via Playwright.
