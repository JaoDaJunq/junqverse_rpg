# Relatório do agente T014

- Papel: enemy AI
- Ticket: T014
- Branch: agent/t014-enemy-ai
- Estado: DONE após revisão R2
- Pull Request: #16

## Implementado
- definições P0 de eco_rasteiro e eco_atirador;
- FSM idle/approach/telegraph/attack/recovery;
- decisão a cada 6 ticks;
- A* determinístico em grid;
- linha de visão;
- telegraphs antes de ataques;
- enemyActionId + familyId estáveis para Leitura de Campo;
- IA emite evento de ataque uma vez, sem aplicar dano por frame.

## Correções encontradas durante a entrega
1. chamada interna do pathfinding usava nomes de argumentos errados; corrigida.
2. teste inicial exigia movimento apesar de cenário totalmente bloqueado; teste corrigido sem alterar regra.
3. FSM pulava a fase attack; materializada como fase explícita de 1 tick.
4. revisão R1 descobriu que attacksEnabled=false durante telegraph ainda permitia ataque do rasteiro; corrigido para cancelar qualquer arquétipo.
5. ID de ação cancelado permanece consumido, impedindo reutilização.

## Evidência
- CI geral: 35954193771 PASS.
- revisão independente R1: 35954090576 FAIL útil.
- revisão independente R2: 35954274211 PASS.

## Fora de escopo
T015 defeat/restart, T016 HUD e T017 gate integrado.
