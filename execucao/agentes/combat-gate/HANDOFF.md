# Handoff — T017 Combat Gate

## Estado
REVIEW.

A implementação jogável do P0 está integrada na branch `agent/t017-combat-gate` e o gate automatizado está verde.

## Evidência principal
- Commit funcional base: `60892899c17ce5b238615ca4438e8dd56f3692e6`
- Commit visual atual: `20aeb105f092aa543356dd738bb5e184823409aa`
- CI funcional: `36002062824` PASS
- CI visual: `36029555697` PASS
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
- Pixel Crawler aplicado como visual temporário de mapa/personagem/inimigo;
- telegraphs visuais para básico, Q, W, E, R e ataque inimigo;
- VFX CC0 do Brackeys para slash, impacto, magia, faísca e aura;
- gate integrado de 5 minutos simulados em 30/60 FPS.

## Revisão independente

A revisão técnica encontrou e corrigiu dois bloqueios antes do playtest:
- mira zero agora usa a última direção válida;
- básico agora respeita windup de 8 ticks e recovery de 11 ticks.

A passiva Leitura de Campo foi registrada como continuidade fora do aceite da T017.

## Única pendência para DONE
Rodada manual humana de 5 minutos em hardware real, com registro de sensação, input, telegraphs e blur.

Não iniciar próxima fase antes de fechar essa evidência e passar por revisão independente.
