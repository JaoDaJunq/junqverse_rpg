# Relatório do agente T010

- Papel: projectiles/areas
- Ticket: T010
- Branch: agent/t010-projectiles-areas
- Estado: IN_PROGRESS até CI e revisão
- Dependências: T006 e T009 DONE

## Implementado
- HitRegistry por attackInstanceId/pulso.
- segmento swept contra alvos circulares.
- projétil usa segmento anterior → novo e compara alvo/parede.
- parede vence empate.
- múltiplos projéteis do mesmo attackInstanceId não duplicam hit no mesmo alvo.
- cone por distância, ângulo e linha de visão.
- cone respeita HitRegistry.
- zona pulsa por ticks de simulação, não por frame.
- cada pulso possui registry key própria.
- remoção de projéteis/zonas por owner e limpeza total de sala.

## Decisões
- targets de ataque usam entityId, posição e raio.
- wall collision usa AABB expandido pelo raio do projétil.
- ordem de targets em cone/zona é por entityId para determinismo.
- T010 não aplica dano diretamente; retorna hits para T009/consumidores.
- primeiro pulso de zona ocorre no primeiro step quando firstPulseDelayTicks=0.

## Testes
- projétil veloz cruza alvo sem tunneling;
- parede antes de alvo;
- fan de projéteis não duplica hit;
- cone sem double-hit e com LOS;
- zona igual em 30/60 FPS de render para os mesmos ticks;
- target uma vez por pulso;
- cleanup por morte/sala;
- segment-circle swept helper.

## Fora de escopo
- Ressonância T011;
- kit específico do Jão T012/T013;
- VFX/HUD.
