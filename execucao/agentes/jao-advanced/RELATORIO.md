# Relatório do agente T013

- Papel: hero gameplay advanced
- Ticket: T013
- Branch: agent/t013-jao-advanced
- Estado: IN_PROGRESS até CI e revisão

## Implementado

### W - Dedução
- raio 240 px;
- revela inimigos, pistas e armadilhas por 300 ticks;
- aplica vulnerable por 180 ticks aos hostis válidos;
- IDs de reveal possuem namespace por tipo.

### E - Corte da Aurora
- custo/cooldown compatíveis com o ciclo genérico T008;
- carga mínima 12 ticks e máxima 60;
- 40 a 80 de dano linear;
- direção fixada na aceitação da carga;
- release precoce espera o mínimo;
- release tardio limita no máximo;
- movimento durante carga usa multiplicador 0,5;
- cone 55° / alcance 110;
- detonator da Ressonância apenas após dano direto efetivo;
- Campo Absoluto reduz o máximo de carga para 12 ticks quando a carga começa.

### R - Campo Absoluto
- consome 100 de carga de ultimate;
- dura 360 ticks;
- haste exclusiva do Jão 20%, usando maior haste sem somar;
- reseta cooldown do Q uma única vez na ativação;
- E chega ao máximo em 12 ticks;
- cadência do básico x0,8, resultando em 27 ticks;
- não altera relógio global nem time scale dos inimigos;
- buff e carga de E são removidos ao morrer.

### Apresentação
apps/client/src/presentation/heroVfx.ts registra apenas efeitos locais:
- afterimages;
- ênfase local de velocidade;
- worldTimeScale = 1;
- enemyTimeScale = 1.

## Decisões
- O limite de carga do E é capturado no momento da aceitação da carga.
- Campo Absoluto não cria status slow em inimigos e não toca no clock da simulação.
- O básico aceita cadenceTicks explícito para consumir o modificador local da ultimate sem duplicar sua lógica.
- Ultimate usa recurso próprio, separado de foco.

## Fora de escopo
- IA T014;
- derrota/restart T015;
- HUD T016;
- ligação visual completa do combate T017.

## Evidência pendente
CI e revisão independente.
