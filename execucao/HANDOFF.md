# Passagem de contexto

## Estado atual
T001, T002, T003, T004 e T005 estão concluídas e aprovadas por revisão independente.

## T005
- InputMapper e bindings implementados no cliente.
- WASD movimento; 1/2/3 slots Q/W/E; R ultimate; Espaço dodge; F interação.
- pressed/released/held produzidos em InputFrame.
- blur, scene change e detach limpam estado.
- pointer sobre UI não inicia básico.
- mira usa transformação tela → mundo.
- remapeamento rejeita conflitos.
- revisão independente: workflow 35895586750 PASS.

## Próxima tarefa
T006 - movimento e colisão compartilhados.

Quando T006 estiver DONE, T007 fica liberada e será o primeiro ponto planejado com Phaser + input + simulação conectados visualmente.

## Pendência operacional
Branch protection da main ainda exige configuração administrativa externa se a conexão continuar sem permissão de ruleset.
