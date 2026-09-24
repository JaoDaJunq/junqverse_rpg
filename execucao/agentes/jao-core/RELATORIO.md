# Relatório do agente T012

- Papel: hero gameplay core
- Ticket: T012
- Branch: agent/t012-jao-core
- Estado: DONE após revisão independente
- Pull Request: #13

## Implementado
### Conteúdo
- stats base do Jão;
- Leitura de Campo;
- básico Corte curto;
- Q Passo Relâmpago.

### Passiva
- segunda ação distinta da mesma família em até 360 ticks;
- vários projéteis do mesmo enemyActionId não contam novamente;
- alcance de observação 300 px;
- analyzed dura 300 ticks;
- uma marca por alvo, renovável;
- outgoing x1.10 enquanto analyzed.

### Básico
- 26 dano;
- cone 80° / alcance 60;
- cadência 33 ticks;
- HitRegistry impede múltiplos hits do mesmo attackInstanceId;
- respeita linha de visão e analyzed.

### Q
- dash 160 px;
- para em parede;
- 32 dano uma vez por alvo cruzado;
- aplica Resonance primer em acerto efetivo inclusive contra shield;
- alvo invulnerável não recebe primer;
- não concede invulnerabilidade própria.

### Fixture
packages/sim/src/testing/jao-reading-room.ts.

## Evidência
- CI geral: 35951218964 PASS.
- revisão independente: 35951276420 PASS.

## Correções durante implementação
- normalização de optional invulnerable para exactOptionalPropertyTypes;
- remoção de import de teste não usado;
- ordenação de IDs mudou de localeCompare para comparação ASCII/lexical determinística.

## Fora de escopo
W/E/R permanecem para T013.
