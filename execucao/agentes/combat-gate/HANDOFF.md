# Handoff — T017 Combat Gate

## Estado
REVIEW.

A implementação jogável do P0 está integrada na branch `agent/t017-combat-gate` e o gate automatizado está verde.

## Evidência principal
- Commit: `dbdbe3bec294273c3bd2d85c489fd3695255a141`
- CI: `35997480492` PASS
- Vitest: 17 arquivos / 157 testes PASS
- Playwright: 4/4 PASS
- Build, typecheck e lint: PASS
- Evidência detalhada: `execucao/evidencias/P0.md`

## Cobertura atual
- movimento e colisão;
- básico;
- Q com movimento, dano e Ressonância;
- W com Vulnerável;
- E carregável;
- R / Campo Absoluto;
- esquiva real;
- Eco Rasteiro com FSM, telegraph e dano;
- vida real do Jão, derrota e restart;
- HUD conectado ao estado real;
- gate integrado de 5 minutos simulados em 30/60 FPS.

## Única pendência para DONE
Rodada manual humana de 5 minutos em hardware real, com registro de sensação, input, telegraphs e blur.

Não iniciar próxima fase antes de fechar essa evidência e passar por revisão independente.
