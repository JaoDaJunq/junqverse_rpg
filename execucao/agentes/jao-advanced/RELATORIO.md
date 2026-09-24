# Relatório do agente T013

- Papel: hero gameplay advanced
- Ticket: T013
- Branch: agent/t013-jao-advanced
- Estado: DONE após revisão independente
- Pull Request: #14

## Implementado
- W Dedução com reveal e vulnerable.
- E Corte da Aurora com carga, dano linear, movimento reduzido, direção fixada e Resonance detonator.
- R Campo Absoluto com windup/recovery, haste local, E acelerado, básico acelerado e reset único de Q.
- apresentação local sem alterar relógio global/inimigos.

## Correções durante a implementação
1. E letal não detonava Ressonância: a camada de Resonance passou a aceitar detonação de primário morto somente quando o chamador confirma que o hit detonador acabou de conectar.
2. Campo Absoluto ativava o buff no aceite: agora activeFromTick respeita windup de 12 ticks.
3. Reveal IDs foram namespaced por tipo.
4. Carga do E captura o limite máximo no aceite.
5. Dano/detonação do E usa effectiveDamage real.

## Evidência
- CI geral: 35952850650 PASS.
- revisão independente: 35952969118 PASS.
- npm audit, typecheck, lint, regressões, planning integrity, build e preview verdes.

## Fora de escopo
T014 IA, T015 defeat/restart, T016 HUD e T017 gate integrado.
