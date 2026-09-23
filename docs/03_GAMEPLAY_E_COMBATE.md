# Gameplay e combate
## Coordenadas e entrada
Visão superior. Tile 32×32 px; origem superior esquerda, x à direita, y para baixo. Herói com collider circular de raio 12. Diagonal normalizada. Simulação 60 ticks/s, apresentação interpolada. Colisão círculo contra AABBs estáticos; entidades vivas não bloqueiam passagem entre si.

| Ação | Padrão |
| --- | --- |
| Movimento | WASD |
| Mirar | Cursor em coordenadas do mundo |
| Básico | Mouse esquerdo, pode segurar |
| Slots Q/W/E | 1/2/3 |
| Ultimate | R |
| Esquiva | Espaço |
| Interagir | F |
| Inventário/diário | I/J |
| Pausa | Esc |
| Ping online | Mouse do meio |

Q/W/E são nomes de slots. Não mapear W de habilidade sobre movimento. Remapeamento rejeita conflitos no mesmo contexto. UI captura pointer sem disparar básico. Perda de foco zera teclas. Mira zero usa última direção válida.

## Estados e tempo
idle, moving, windup, active, recovery, dashing, stunned, downed, dead. Prioridade: morte > stun > esquiva > habilidade aceita > básico > movimento. Canalização cancela ao andar, agir ou receber dano. Habilidade dispara na borda, segurar não recasta. Básico repete pela cadência.

Custo/cooldown começam no aceite, antes do windup. Alvo inválido rejeita sem custo. Interrupção posterior não reembolsa. E de Jão carrega ao pressionar e solta ao soltar ou no limite; cooldown começa no aceite da carga. Um attackInstanceId atinge cada alvo uma vez, salvo zonas com pulso próprio.

## Recursos
Foco 100, regen 10/s após 1 s sem gastar. Ultimate 0–100: +5 por comum, +15 por elite, +1/s em combate, cap total 6/s. Chefe fornece +1 por 100 de dano efetivo dentro do cap. Sem carga por aliados, bonecos, escudos ou invulneráveis. Arena tem regra própria. Q/W/E gastam foco; R gasta 100 de carga.

Esquiva: 2 cargas, recarga sequencial de 4 s, 112 px em 0,2 s, invulnerável ticks 2–8, bloqueada por parede. Cooldowns em ticks inteiros.

## Dano
Dano = max(1, floor(base × powerMultiplier × outgoing × incoming × 100/(100+armor))). Armadura de heróis 0; nunca negativa. Cada modificador aplica uma vez. outgoing/incoming são produtos de fontes distintas, limitados a 0,25–2. Sem crítico aleatório. Escudo absorve antes da vida. Cura limitada à vida máxima e não revive. Invulnerabilidade bloqueia dano e efeitos hostis de acerto. DoT não ativa Ressonância.

Campanha: powerMultiplier = 1 + 0,04 × (rank−1); vida máxima = base × (1 + 0,06 × (rank−1)), arredondada para baixo. Foco/cooldown/mobilidade não escalam. Arena rank 1 sem relíquias.

## Estados compartilhados
| Estado | Regra |
| --- | --- |
| slow | 0–50%; maior vence |
| root | Impede movimento, permite atacar; até 1,5 s PvE |
| stun | Impede comandos; até 1 s PvE |
| vulnerable | +15% incoming por 3 s; não acumula |
| shield | Fontes diferentes somam; mesma renova maior valor; cap 50% vida |
| haste | +15% velocidade por 3 s; não acumula |
| analyzed | Exclusivo de Jão; ver ficha |

Chefes ignoram root/stun/knockback/puxão; recebem vulnerable por 2 s quando esses controles seriam aplicados, com imunidade à conversão por 4 s. Arena: controle forte máximo 0,75 s, imunidade por 2 s após terminar; slow máximo 30%.

## Ressonância
Primer aplica marca por 4 s; uma por alvo, reaplicar renova. Detonator consome e causa 25 de dano extra em raio 64, incluindo alvo primário, e slow 20% por 1 s. Vítima recebe no máximo uma explosão a cada 1,5 s de qualquer autor. Explosão não marca nem detona outra marca. Usa rank do detonador. Marca com ícone e contorno, não só cor. Sem bônus por composição específica.

## Geometria
Projétil testa segmento anterior–novo contra colliders; parede bloqueia primeiro. Cone verifica distância/ângulo/linha de visão. Dash para no bloqueio com margem do raio. Zona verifica posição a cada pulso, não por frame de animação. Escala visual não altera collider. Morte do autor cancela casts e remove seus projéteis, zonas e dispositivos. Buffs/escudos já dados a aliados continuam até a própria expiração. Encerrar/reiniciar encontro remove todos os efeitos daquela instância.

## Derrota e dificuldade
Solo morre e reinicia sala do checkpoint, vida/foco/esquiva cheios e ultimate igual ao checkpoint. Abandonar volta ao hub; conserva recompensas confirmadas, descarta loot da tentativa. Sem perda de item. Recuperação antes de chefe cura 100%, indisponível durante combate.

Aventura: catálogo padrão. Assistido: dano inimigo ×0,7, telegraphs ×1,25, mira assistida opcional; recompensas iguais. Troca no hub/checkpoint, nunca durante ataque. Sem permadeath/Desafio.

## Câmera
Segue suavemente, look-ahead até 64 px, respeita mapa. Shake desligável até 4 px. Hit stop visual local até 40 ms sem parar simulação. Ultimate de Jão altera Jão e apresentação; nunca desacelera o mundo inteiro.

## Inimigos
Rank 1. Multiplicador de ato em vida/dano: I = 1; II = 1,2; III = 1,4. Velocidade e aviso não escalam.
| ID | Vida/armadura | Ataque | Velocidade px/s | Aviso/recarga | IA |
| --- | --- | --- | --- | --- | --- |
| eco_rasteiro | 70/0 | 12, cone 48 px | 95 | 0,65/1,5 s | aproxima e recua |
| eco_lanceiro | 110/10 | 18, linha 120×24 | 70 | 0,8/2 s | distância média |
| eco_atirador | 80/0 | 14, projétil 300 px/s | 60 | 0,9/2,2 s | busca linha de visão |
| eco_guardiao | 180/25 | 22, raio 70 | 55 | 1,1/2,5 s | protege objetivo |
| eco_tecedor | 100/0 | 8/pulso, zona raio 72 | 65 | 1/4 s | 3 pulsos, intervalo 1 s |
| eco_fragmento | 45/0 | 16, explosão raio 56 | 115 | aviso 1 s | explode após avisar |

Elites: guardiao_elite tem vida ×2 e impacto duplo anunciado; atirador_elite tem vida ×2 e leque de 3 projéteis, um acerto máximo por alvo/leque. Dano base igual. Sem afixos aleatórios. FSM decide a cada 6 ticks; A* em grid ao invalidar caminho ou a cada 0,5 s. Spawns por missão.

## Empates e modificadores de movimento
Velocidade normal = base × (1 + soma dos bônus de velocidade das relíquias) × (1 + maior haste ativo) × (1 − maior slow ativo) × multiplicador do estado de ação. Assim, haste 20% de Jão prevalece sobre haste 15%, sem somar; carga de E aplica seu ×0,5 no fim. Dash/esquiva usam sua trajetória própria. Não aplicar velocidade de locomoção ao dash.

Um abate pertence ao autor do último dano efetivo. Em arena, dano de ambiente credita o último rival que atingiu nos 5 s anteriores; sem rival, não há ponto de abate. Assistência registra rival que causou dano nos 5 s anteriores, sem pontos adicionais. Geração de ultimate por abate vai ao autor, não a todos os presentes. Regeneração passiva de ultimate exige autor vivo e em combate; em combate significa dar/receber dano ou ter inimigo aggro nos últimos 3 s. Nenhum efeito gera carga depois da morte do autor.

Armadura e multiplicador de ato são aplicados uma vez, na criação da entidade. Números dos chefes nos roteiros são base antes do ato. Partículas não participam da colisão.
