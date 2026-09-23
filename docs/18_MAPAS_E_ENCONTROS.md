# Mapas e montagem de encontros
## Planta funcional
Mapas principais têm 80×48 tiles, 32 px cada. Cinco salas: r1 bounds(2,2,20,18), r2(30,2,20,18), r3(58,2,20,18), r4(58,28,20,18), r5(26,26,26,20). Bounds em tiles (x,y,largura,altura). Boss ocupa r5 visualmente quando seu estágio chega; M01/M04 estágio 4 usa r4 como entrada com transição para arena r5, estágio 5 permanece em r5. Implementar essa exceção explicitamente no mapa, sem teleportar no meio do combate.

Corredores andáveis, largura 3 tiles: r1→r2 entre centros das portas leste/oeste; r2→r3 igual; r3→r4 vertical; r4→r5 horizontal. Portas não fecham sobre entidade. Limite exterior é parede, sem queda instantânea. Para M01/M04, r4 é antecâmara e r5 arena; investigação/etapas anteriores usam r1–r3. Para demais mapas, etapas 1–5 usam r1–r5. M08 estágios 4–6 usam r5 como arena/epílogo, r4 é antecâmara. Ajustar vínculo stageRoom no conteúdo, mantendo cinco salas.

Layout A = planta base; B = espelhar horizontalmente; C = espelhar verticalmente; D = rotação 180°. Transformar também spawns/portas/targets/caminhos, não só desenho. Tiles diferentes, obstáculos internos e objetivos criam identidade; não prometer oito geometrias inéditas. Novas plantas podem entrar depois de validar custo, preservando os mesmos IDs lógicos.

## Spawn e leitura
Spawn do jogador 96 px dentro da porta de entrada, sem inimigo em raio 192. Inimigos distribuídos em slots perto do centro/terço oposto, espaçamento mínimo 48. Nenhum ranged atira antes de câmera/entrada revelar sala: grace de 1 s. Inimigos aparecem fora do collider de portas e objetivos. Spawn de onda avisa por 0,7 s; aviso não causa dano.

Cobertura: 2–4 AABBs por sala, corredores com largura mínima 64 px; para encontros de boss, centro e rotas de fuga sem obstrução. A* deve alcançar todo alvo interagível a até 56 px. Puzzles temporizados exigem caminho do herói mais lento mais 2 s de margem, sem depender de dash.

## IDs e encontro
Cada encontro possui id, lista de spawns, ativação, condição e limites. Encounters de clear rastreiam inimigos previstos, não todos os inimigos do mapa. Sobrevivência tem ondas em ticks fixos; se cap simultâneo é atingido, fila adia spawn até liberar vaga. Ao expirar tempo, cancelar fila, desativar hostis restantes e avançar. Nunca dropar loot por fade de término.

## Hazards
Linha/disco/anel com windup >=0,65 s no padrão. Ataque usa collider separado do sprite. Contorno avisa, preenchimento progride; som é redundante. Puzzle/hazard inicial dá 12 dano. S03 cria faixas alternadas, não dano aleatório. M04 travessia alterna faixas seguras com 1 s de aviso a cada 3 s.

## Escoltas
Waypoints em piso livre, uma parada segura por sala. Começar via F. NPC espera se nenhum jogador em raio 160, avança a 60 px/s; não exige que ele lute. Concluir quando NPC chega a 24 px do último waypoint. Somente inimigos do encontro podem causar dano; projétil continua respeitando parede. Se NPC morrer, retornar ao checkpoint do trecho.

## Opcionais
Copiar três salas conectadas da família indicada e usar IDs próprios side_sXX_r1/r2/r3. Não referenciar diretamente estado persistente da principal. Remover salas inacessíveis do minimapa. Toda saída leva ao hub depois da conclusão.
