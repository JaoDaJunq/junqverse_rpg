# Jão O Leitor da Tempestade
ID `jao` • Duelista e investigador • Dificuldade 4/5 • Vida 320 • Velocidade 180 px/s

## Conceito e arco
Encontra padrões, se reposiciona e converte uma abertura curta em dano. Roupa cinza ampla, detalhes azuis, katana original Fio da Aurora e bainha presa à cintura. Efeitos elétricos só nos momentos de ação.

Começa tentando antecipar tudo. Aprende que confiar em alguém também é uma escolha inteligente. Sua missão pessoal é S01.

## Kit
Passiva: Leitura de Campo: ao observar dentro de 300 px a mesma família de ataque de um inimigo pela segunda vez em 6 s, aplica analyzed por 5 s. Ataques de Jão contra esse alvo têm outgoing ×1,10. Uma marca por alvo, renovar não acumula. Usar enemyActionId para não contar projéteis de um mesmo ataque como repetições.

Básico: Corte curto: 26 dano, cone 80°, alcance 60 px, cadência 0,55 s, windup 0,12 s, recovery 0,18 s.

Valores abaixo são rank 1 antes de modificadores; Q/W/E são slots acionados por 1/2/3. Foco máximo 100. Distância em pixels do mundo. Tempo em segundos convertido para ticks por ceil(t×60). As regras de [combate](../docs/03_GAMEPLAY_E_COMBATE.md) prevalecem para imunidade, Ressonância, custo e cooldown.

| Slot | Nome | Custo | Cooldown | Alvo | Windup / recovery | Efeito |
| --- | --- | --- | --- | --- | --- | --- |
| Q | Passo Relâmpago | 20 | 6 s | Direção, 160 px | 0 / 0,15 s | Dash de 0,18 s; 32 dano a cada inimigo cruzado uma vez e primer. Para na parede. Não concede invulnerabilidade própria. |
| W | Dedução | 15 | 10 s | Área própria, raio 240 | 0,15 / 0,15 s | Revela pistas, armadilhas e inimigos por 5 s; aplica vulnerable 3 s aos hostis presentes. Pistas obrigatórias sempre têm alternativa por F. |
| E | Corte da Aurora | 25 | 7 s | Cone 55°, 110 px | Carga / 0,25 s | Carrega de 0,2 a 1 s. Dano linear 40–80 conforme carga, detonator. Pode andar a 50% durante carga; soltar antes de 0,2 espera esse mínimo. Mira fixa no disparo. |
| R | Campo Absoluto | 100 ult | Carga | Próprio, 6 s | 0,2 / 0,2 s | Haste 20% exclusivo do kit, reset de Q uma vez na ativação; E carrega ao máximo em 0,2 s. Básico tem cadência ×0,8. Pós-imagem local sugere velocidade; tempo global permanece normal. |

## Sequência e contrajogo
Q marca → básico → E detona → esquiva. W facilita abertura, R permite uma sequência rápida; não reseta Q a cada abate.

Fraqueza: Vida menor, exige mira próxima e sofre quando gasta os dois deslocamentos cedo.

## Relações e vozes
As falas são propostas ficcionais, ajustáveis pelo MVP. O kit permanece funcional sem diálogo específico. Falas não podem interromper comandos.
- Quando todo mundo vê caos, eu vejo padrões.
- Alice, vai. Eu cubro.
- Tá, essa eu não tinha calculado.
- Foi mal. Quer revanche?

## Visual alternativo
Cinza de Chuva: roupas grafite e efeito elétrico branco-azulado. Compra cosmética de 60 Fragmentos, sem estatística. Arma/equipamento deve continuar legível na recoloração.

## Aceite do personagem
- Básico e quatro habilidades podem ser usados em sala de teste sem erro.
- Custo/cooldown não duplicam ao segurar tecla; cancelar e receber stun seguem contrato.
- Primer e detonator funcionam sem outro herói; com aliado, explosão respeita cap por vítima.
- Parede, alvo inválido, morte durante cast, pause e reload não deixam efeito órfão.
- Concluir M01 sozinho; arena usa seus overrides sem alterar o kit de campanha.
