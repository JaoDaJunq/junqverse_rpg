# Relatório do agente T009

- Papel: dano/status
- Ticket: T009
- Branch: agent/t009-damage-status
- Estado: IN_PROGRESS até CI e revisão
- Dependência: T008 DONE

## Escopo executado
Implementado dano, escudo, cura e estados compartilhados em packages/sim.

### Dano
- fórmula normativa com armor;
- outgoing/incoming como produtos limitados a 0,25–2;
- dano mínimo 1;
- invulnerabilidade bloqueia dano;
- overkill não gera vida negativa;
- diedNow só é true na transição vivo → morto.

### Escudo
- armazenado por sourceId;
- fontes diferentes somam;
- mesma fonte só renova para valor maior;
- cap global de 50% da vida máxima;
- absorção antes da vida.

### Cura
- limitada à vida máxima;
- não revive morto.

### Status
- slow por fonte, maior magnitude ativa vence;
- root/stun em ticks;
- vulnerable fixo +15%, sem stack;
- haste compartilhado máximo +15%, sem stack;
- caps PvE e Arena;
- imunidade pós-controle forte em Arena;
- boss converte root/stun em vulnerable de 2s e ganha imunidade à conversão por 4s;
- helper bloqueia displacement em boss.

## Decisões
- efeitos são mantidos por fonte para permitir que um slow mais fraco continue após o mais forte expirar.
- absorção de shields usa ordem lexical de sourceId apenas para tornar o remanescente determinístico; o total absorvido não depende dessa ordem.
- morte é sinalizada por diedNow; o consumidor emite entity_died somente quando true.
- knockback/pull ainda não têm sistema próprio; canApplyDisplacement(false/true) expõe a regra de boss para os próximos sistemas.

## Testes
tests/damage-status.test.ts cobre fórmula, clamps, shield, cura, invulnerabilidade, slow concorrente, caps de root/stun, conversão de boss, Arena e não-stack de vulnerable/haste.

## Fora de escopo
- projéteis/cones/zonas T010;
- Ressonância T011;
- integração visual.

## Evidência pendente
Aguardar CI completa e revisão independente.
