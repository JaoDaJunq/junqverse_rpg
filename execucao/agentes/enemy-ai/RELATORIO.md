# Relatório do agente T014

- Papel: enemy AI
- Ticket: T014
- Branch: agent/t014-enemy-ai
- Estado: IN_PROGRESS até CI e revisão
- Dependências: T009 e T010 DONE

## Implementado
### Conteúdo
- eco_rasteiro com stats, telegraph 39 ticks e cooldown 90.
- eco_atirador com stats, telegraph 54 ticks, cooldown 132 e projétil 300 px/s.

### FSM
- idle/perception;
- approach;
- telegraph;
- attack;
- recovery;
- decisões em intervalos de 6 ticks;
- rasteiro recua em recovery;
- atirador cancela tiro se perder linha de visão antes do disparo.

### A*
- grid determinístico 4-direções;
- blockers convertidos em células;
- path estável com desempate determinístico;
- steering para próxima célula.

### Eventos
- telegraph e attack compartilham enemyActionId;
- ataques seguintes usam IDs distintos;
- familyId estável para Leitura de Campo do Jão;
- IA não aplica dano por frame, apenas emite o evento de ataque.

## Testes
tests/enemy-ai.test.ts cobre:
- valores documentados;
- A* contornando parede;
- atirador sem tiro através de parede;
- cancelamento de tiro se LOS some durante telegraph;
- telegraph antes de attack;
- um attack event por ação;
- navegação do rasteiro ao redor de canto;
- IDs distintos entre ações da mesma família.

## Fora de escopo
- aplicação de dano pelo ataque;
- sprites/animações;
- IA dos demais inimigos;
- elites;
- T015/T016/T017.

## Evidência pendente
Aguardar CI e revisão independente.
