# Relatório do agente de combate base

- Papel: combat lifecycle/resources
- Ticket: T008
- Branch: agent/t008-cast-resources
- Estado: IN_PROGRESS até CI e revisão
- Dependências: T004 e T002 DONE

## Escopo executado
Implementado o ciclo puro de cast e recursos no packages/sim.

### Recursos
- foco máximo 100;
- custo de foco no aceite;
- regen de 10/s após 60 ticks sem gasto;
- cooldown em ticks iniciado no aceite;
- duas cargas de esquiva;
- recarga sequencial de 240 ticks por carga.

### Cast
- fases windup → active → recovery;
- active padrão de 1 tick quando não há duração específica;
- attackInstanceId monotônico por entidade;
- interrupção sem refund;
- morte cancela cast;
- esquiva cancela cast aceito sem refund.

### Prioridade
Função explícita:
morte > stun > esquiva > habilidade > básico > movimento > idle.

### Esquiva
- duração 12 ticks;
- invulnerabilidade relativa ticks 2–8;
- não aceita sem carga, morto, stunned ou já dodging.

## Decisões
- AbilityDefinition público não foi alterado.
- AbilityCastSpec interno fornece activeTicks quando necessário.
- T008 não implementa dano, status compartilhado, projétil ou zona.
- Stun é recebido como contexto de aceitação/interrupção; T009 será responsável pelo sistema de status completo.
- Tudo permanece em ticks inteiros e funções puras.

## Testes
tests/cast-resources.test.ts cobre:
- alvo inválido sem gasto/cooldown;
- custo e cooldown no aceite;
- stun sem refund;
- fases de cast;
- cast repetido não duplica;
- attackInstanceId monotônico;
- morte cancela cast;
- regen de foco;
- duas cargas e recarga sequencial;
- i-frames 2–8;
- dodge cancela cast sem refund;
- prioridade de ações.

## Fora de escopo
- T009 dano/shield/heal/status;
- T010 projéteis/cones/zonas;
- apresentação/VFX.

## Evidência pendente
Aguardar CI em checkout limpo e revisão independente.
