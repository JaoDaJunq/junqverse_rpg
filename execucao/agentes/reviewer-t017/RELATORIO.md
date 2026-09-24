# Relatório de revisão — T017

Data: 2026-09-24
Branch revisada: `agent/t017-combat-gate`
Commit após correções: `60892899c17ce5b238615ca4438e8dd56f3692e6`
CI: `36002062824` PASS

## Escopo revisado
- ponte InputFrame → simulação;
- básico, Q/W/E/R e esquiva;
- recursos e HUD;
- IA e ataques inimigos;
- dano, derrota e restart;
- determinismo 30/60 FPS;
- contratos de gameplay de Jão relevantes à T017.

## Achados bloqueadores

### R1 — mira zero divergente do contrato
O contrato em `docs/03_GAMEPLAY_E_COMBATE.md` determina que mira zero reutiliza a última direção válida. A LocalSession convertia essa situação em alvo inválido.

Correção: commit `00d6c92831487aae3d51a1ecda2b8d05a5bb0747`.

Resultado: corrigido e coberto por teste.

### R2 — básico sem windup/recovery
O básico respeitava cadência e dano, mas aplicava o golpe imediatamente. A ficha de Jão define windup de 8 ticks e recovery de 11 ticks.

Correção: commit `60892899c17ce5b238615ca4438e8dd56f3692e6`.

Resultado: corrigido. O hit agora ocorre após windup e preserva a cadência de 33 ticks.

## Observação não bloqueadora
A passiva Leitura de Campo possui implementação pura, mas ainda não está conectada aos eventos inimigos no protótipo. Ela não consta como critério de aceite da T017 e não bloqueia este gate.

## Verificação
CI `36002062824`:
- typecheck PASS;
- lint PASS;
- 17 arquivos / 157 testes PASS;
- planning/content gate PASS;
- build PASS;
- 4 Playwright PASS.

## Resultado da revisão
Revisão técnica aprovada para playtest manual.

T017 permanece REVIEW porque o ticket exige 5 minutos jogados em hardware real com avaliação de sensação, input, telegraphs e blur.
