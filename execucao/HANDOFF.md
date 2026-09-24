# Passagem de contexto

## Estado atual
T001-T012 estão concluídas e aprovadas por revisão independente.

## Protótipo visual atual
T007 permite movimentação, colisão, câmera e pausa no Phaser.

## Combate genérico disponível
- T008: cast, foco, cooldown, dodge e attackInstanceId.
- T009: dano, shield, cura e estados.
- T010: projéteis, cones, zonas e HitRegistry.
- T011: Ressonância com primer/detonator e cap global por vítima.

## Jão disponível após T012
- stats base: 320 HP / 180 px/s / raio 12;
- passiva Leitura de Campo: segunda ação distinta da mesma família em até 360 ticks aplica analyzed por 300 ticks;
- projéteis do mesmo enemyActionId não contam como repetições;
- analyzed concede outgoing x1.10 contra o alvo;
- básico Corte curto: 26 dano, cone 80°, alcance 60, cadência 33 ticks;
- Q Passo Relâmpago: dash 160 px, para em parede, 32 dano uma vez por alvo cruzado e aplica primer de Ressonância;
- fixture de sala de teste para inimigo repetindo ataque.

## Evidência T012
- CI geral final do código: 35951218964 PASS.
- revisão independente: 35951276420 PASS.
- limites 300 px e 360 ticks testados.
- refresh de analyzed sem stack confirmado.
- básico não atravessa parede.
- analyzed afeta também dano do Q.
- Q ordena hits pela trajetória e mantém determinismo sem localeCompare.

## Próxima tarefa
T013 - Jão W, E e ultimate Campo Absoluto.

T014 (IA) já tem suas dependências genéricas satisfeitas e pode ser executada em paralelo, mas a sequência do herói segue T013.
