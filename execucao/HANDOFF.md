# Passagem de contexto

## Estado atual
T001-T014 estão concluídas e aprovadas por revisão independente.

## Protótipo visual e combate
- T007: movimentação, colisão, câmera e pausa no Phaser.
- T008-T010: cast, recursos, dano, status, projéteis, cones e zonas.
- T011: Ressonância.
- T012-T013: kit completo do Jão na simulação.
- T014: IA inicial de eco_rasteiro e eco_atirador.

## T014
- FSM: idle → approach → telegraph → attack → recovery.
- decisão a cada 6 ticks.
- A* determinístico em grid.
- linha de visão para ataques.
- atirador cancela tiro se LOS some no ataque.
- attacksEnabled cancela telegraph de qualquer arquétipo.
- telegraph/attack compartilham enemyActionId.
- IDs cancelados não são reutilizados.
- IA emite eventos; não aplica dano por frame.

## Evidência T014
- CI geral final do código: 35954193771 PASS.
- revisão R1: 35954090576 encontrou cancelamento incorreto do rasteiro.
- correção aplicada.
- revisão independente R2: 35954274211 PASS.

## Próximas tarefas
- T015 - derrota e reinício da sala de teste.
- T016 - HUD funcional de combate.

As duas estão liberadas. T017 fecha o gate integrado depois de T015 + T016.
