# Relatório do agente de movimento

- Papel: motor/movimento
- Ticket: T006
- Branch: agent/t006-movement
- Estado: DONE após revisão independente
- Pull Request: #7

## Escopo
Implementada geometria compartilhada e movimento determinístico em packages/sim.

## Entregas
- AABB e circle vs AABB;
- normalização diagonal;
- movimento por tick;
- resolução por eixo para slide;
- swept segment para dash/projétil;
- linha de visão;
- spawn seguro;
- tratamento correto de contato tangente.

## Correção encontrada antes do merge
O primeiro swept test tratava contato tangente no instante zero como colisão mesmo ao mover para fora/ao longo da parede. Foi corrigido para exigir entrada real no interior do AABB expandido.

## Evidência
CI geral após rebase sobre T005: 35896407686 PASS.

Revisão independente T006: 35896281913 PASS, cobrindo:
- parede mais fina que deslocamento;
- tangente saindo da parede;
- tangente deslizando na parede;
- movimento para dentro bloqueado;
- toque de canto sem entrada;
- dash longo para no primeiro bloqueio;
- 60 ticks determinísticos;
- LOS/spawn seguro;
- boundaries de sim.

## Fora de escopo
- ligação visual Phaser T007;
- cast/combat T008+;
- projéteis de gameplay T010.
