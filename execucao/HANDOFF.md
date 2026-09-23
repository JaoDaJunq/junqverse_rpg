# Passagem de contexto

## Estado atual
T001-T008 estão concluídas e aprovadas por revisão independente.

## Protótipo visual
T007 já permite:
- WASD;
- colisão;
- câmera;
- pausa;
- render por snapshots no Phaser.

## T008 integrado
A simulação agora possui:
- foco 0-100;
- regen de 10/s após 60 ticks sem gasto;
- cooldowns em ticks;
- cast windup → active → recovery;
- custo/cooldown iniciados no aceite;
- interrupção sem refund;
- attackInstanceId monotônico;
- duas cargas de esquiva com recarga sequencial de 240 ticks;
- i-frames relativos ticks 2-8;
- prioridade morte > stun > esquiva > habilidade > básico > movimento.

## Evidência T008
- CI geral: 35899583961 PASS.
- revisão independente: 35899785025 PASS.
- limites de tick, imutabilidade e IDs testados adversarialmente.

## Próxima tarefa
T009 - dano, escudo, cura e estados compartilhados.

T010 continua dependendo de T006 + T009.
