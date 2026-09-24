# Relatório do agente T011

- Estado: DONE após revisão independente
- PR: #12
- CI geral: 35902193336 PASS
- Revisão independente: 35902273423 PASS

## Implementado
- primer 240 ticks, uma marca por alvo com renovação;
- detonator consome marca;
- explosão base 25, raio 64 e rank do detonador;
- slow 20% por 60 ticks;
- cap global por vítima de 90 ticks;
- DoT e resonance_explosion não detonam;
- explosão não propaga/consome marcas vizinhas;
- cue de marca com outline + icon.

## Revisão
Casos adversariais confirmaram limite N+90, invulnerabilidade, cadeia bloqueada, marca vizinha preservada e consumo determinístico.
