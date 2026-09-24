# Relatório do agente T012

- Papel: hero gameplay core
- Ticket: T012
- Branch: agent/t012-jao-core
- Estado: IN_PROGRESS até CI e revisão

## Implementado
### Conteúdo
- stats base do Jão;
- Leitura de Campo;
- básico Corte curto;
- Q Passo Relâmpago.

### Passiva
- observa família de enemyActionId;
- exige segunda ação distinta da mesma família em até 360 ticks;
- vários projéteis do mesmo enemyActionId não contam novamente;
- analyzed dura 300 ticks;
- um analyzed por alvo, renovável;
- outgoing x1.10 enquanto analyzed.

### Básico
- 26 dano;
- cone 80° / alcance 60;
- cadência 33 ticks;
- HitRegistry impede múltiplos hits do mesmo attackInstanceId;
- respeita linha de visão e analyzed.

### Q
- dash 160 px;
- para em parede usando swept movement existente;
- 32 dano uma vez por alvo cruzado;
- aplica Resonance primer em acerto efetivo;
- não aplica primer em alvo invulnerável;
- não concede invulnerabilidade própria.

### Fixture
packages/sim/src/testing/jao-reading-room.ts simula inimigo repetindo família de ataque para validar a passiva.

## Fora de escopo
- W/E/R (T013);
- IA real do inimigo (T014);
- VFX/HUD específicos.

## Evidência pendente
CI e revisão independente.
