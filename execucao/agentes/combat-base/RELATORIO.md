# Relatório do agente de combate base

- Papel: combat lifecycle/resources
- Ticket: T008
- Branch: agent/t008-cast-resources
- Estado: DONE após revisão
- Pull Request: #9
- Revisão independente: workflow 35899785025 PASS

## Implementado
- foco/cooldowns em ticks;
- ciclo windup/active/recovery;
- custo e cooldown no aceite;
- interrupção sem refund;
- attackInstanceId monotônico;
- morte cancela cast;
- esquiva com duas cargas e recarga sequencial;
- i-frames 2-8;
- prioridade explícita de ações.

## Evidência
CI geral 35899583961 PASS.
Revisão independente 35899785025 PASS.

## Fora de escopo
T009 dano/status e T010 projéteis/zonas permanecem pendentes.
