# Mapas e montagem de encontros
## Planta funcional
Mapas principais têm 80×48 tiles, 32 px cada. Cinco salas: r1 bounds(2,2,20,18), r2(30,2,20,18), r3(58,2,20,18), r4(58,28,20,18), r5(26,26,26,20). Bounds em tiles (x,y,largura,altura). Boss ocupa r5 visualmente quando seu estágio chega; M01/M04 estágio 4 usa r4 como entrada com transição para arena r5, estágio 5 permanece em r5.

Corredores andáveis, largura 3 tiles. Portas não fecham sobre entidade. Limite exterior é parede, sem queda instantânea. Layout A = planta base; B = espelhar horizontalmente; C = espelhar verticalmente; D = rotação 180°. Transformar também spawns/portas/targets/caminhos.

## Spawn e leitura
Spawn do jogador 96 px dentro da porta de entrada, sem inimigo em raio 192. Inimigos distribuídos em slots perto do centro/terço oposto, espaçamento mínimo 48. Nenhum ranged atira antes de câmera/entrada revelar sala: grace de 1 s. Spawn de onda avisa por 0,7 s; aviso não causa dano.

Cobertura: 2–4 AABBs por sala, corredores com largura mínima 64 px; para encontros de boss, centro e rotas de fuga sem obstrução. A* deve alcançar todo alvo interagível a até 56 px. Puzzles temporizados exigem caminho do herói mais lento mais 2 s de margem, sem depender de dash.

## IDs e encontro
Cada encontro possui id, lista de spawns, ativação, condição e limites. Encounters de clear rastreiam inimigos previstos. Sobrevivência tem ondas em ticks fixos.

## Hazards
Linha/disco/anel com windup >=0,65 s no padrão. Ataque usa collider separado do sprite. Contorno avisa, preenchimento progride; som é redundante.

## Escoltas
Waypoints em piso livre, uma parada segura por sala. NPC espera se nenhum jogador em raio 160, avança a 60 px/s.

## Opcionais
Copiar três salas conectadas da família indicada e usar IDs próprios side_sXX_r1/r2/r3. Toda saída leva ao hub depois da conclusão.
