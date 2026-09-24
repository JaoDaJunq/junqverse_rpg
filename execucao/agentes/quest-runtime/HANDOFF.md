# Handoff — T018 Quest Runtime

## Estado
IN_PROGRESS.

Branch: `agent/t018-quest-runtime`

## Escopo
Runtime puro de QuestProgress:
- prerequisites e disponibilidade;
- ativação;
- progressão de estágio;
- checkpoint;
- emissão idempotente de entry/completion actions.

## Fora do escopo
- matching de objetivos;
- execução concreta de spawn/dialogue/flags;
- M01;
- mapa;
- persistência.

## Relação com T017
T018 parte de `main` e é independente da T017. O gate de combate segue em REVIEW no PR #19 e não foi considerado DONE nesta branch.
