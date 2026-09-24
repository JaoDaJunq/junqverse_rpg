# Handoff — T018 Quest Objectives

## Estado
REVIEW técnico aprovado.

Branch: `agent/t018-quest-objectives`
PR: #20, draft e empilhado sobre `agent/t017-combat-gate`.
CI principal: `36008599138` PASS.

## Funciona
- estados locked/available/active/completed;
- enter_area/interact/collect/defeat;
- all/any até dois níveis;
- stage único;
- ações idempotentes por ID;
- eventId idempotente;
- item repetido não incrementa coleta;
- objetivo final completa a quest uma vez;
- itens alheios ao objetivo não contaminam collectedIds.

## Contratos para consumidores
- `interaction_completed` só deve ser emitido após a camada de interação satisfazer `holdTicks`.
- O último abate de um encounter deve carregar `encounterId` e `encounterCleared: true` para satisfazer objetivo `defeat`.
- T020 ficará responsável por checkpoint/persistência confirmada.

## Pendente
Nenhum bloqueio técnico interno da T018.
O fechamento DONE aguarda T017 DONE conforme dependência do grafo.

## Próximo ticket
T019 — Sobrevivência sequência e escolha, se continuado como branch empilhada autorizada.
