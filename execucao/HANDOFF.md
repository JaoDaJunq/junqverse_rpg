# Passagem de contexto

## Estado atual
T001-T013 estão concluídas e aprovadas por revisão independente.

## Protótipo visual
T007 já permite movimentação, colisão, câmera e pausa no Phaser.

## Combate e Jão
- T008-T010: cast, recursos, dano, estados, projéteis, cones e zonas.
- T011: Ressonância.
- T012: Jão básico, Leitura de Campo e Q.
- T013: W Dedução, E Corte da Aurora e R Campo Absoluto.

## T013
### W
- raio 240;
- reveal 300 ticks;
- vulnerable 180 ticks;
- reveal de inimigos/pistas/armadilhas.

### E
- carga 12-60 ticks;
- dano 40-80 linear;
- direção fixada na aceitação;
- movimento x0,5 na carga;
- detonator de Ressonância;
- durante Campo Absoluto, carga máxima em 12 ticks.

### R
- consome 100 de ultimate;
- windup 12 ticks;
- duração 360 ticks após o windup;
- recovery 12 ticks via cast spec T008;
- haste local 20%;
- básico em 27 ticks de cadência;
- reset único do Q no aceite;
- sem slow global, worldTimeScale=1 e enemyTimeScale=1.

## Correções descobertas na T013
- Campo Absoluto inicialmente ativava o buff antes do windup; corrigido.
- E letal inicialmente não consumia/detonava Ressonância; corrigido com confirmação explícita do hit detonador.
- teste confirmou vizinho fora do cone mas dentro da explosão.

## Evidência
- CI geral final: 35952850650 PASS.
- revisão independente: 35952969118 PASS.

## Próxima tarefa recomendada
T014 - IA de rasteiro e atirador.

T016 também está liberada e pode ser executada em paralelo. T015 aguarda T014; depois T017 fecha o gate integrado.
