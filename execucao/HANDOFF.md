# Passagem de contexto

## Estado atual
T001-T011 estão concluídas e aprovadas por revisão independente.

## Protótipo visual atual
T007 permite movimentação, colisão, câmera e pausa no Phaser.

## Combate genérico disponível
- T008: cast, foco, cooldown, dodge e attackInstanceId.
- T009: dano, shield, cura e estados.
- T010: projéteis, cones, zonas e HitRegistry.
- T011: Ressonância com primer/detonator, raio 64, slow, rank scaling e cap global por vítima.

## Evidência T011
- CI geral do código: 35902193336 PASS.
- revisão independente: 35902273423 PASS.
- cap global confirmado até N+89 e liberado em N+90.
- explosão não propaga nem consome marcas vizinhas.
- DoT/resonance_explosion não detonam.
- cue visual exige outline + icon.

## Próxima tarefa
T012 - básico, passiva e Q do Jão.

T013 permanece bloqueada até T012 DONE.
