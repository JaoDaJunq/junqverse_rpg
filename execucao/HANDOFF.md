# Passagem de contexto

## Estado atual
T001-T015 estão concluídas e aprovadas por revisão independente.

## T015
- checkpoint/restart puro de encontro;
- derrota limpa HP/shields/status/cast/transientes;
- projéteis, zonas, hit registry e Ressonância da instância são removidos;
- restart restaura vida/foco/esquiva e ultimate do checkpoint;
- LocalSession reinicia sem duplicar entidade/listener;
- DefeatPanel com Tentar novamente e Retornar;
- fluxo técnico testável por ?debugDefeat=1 + K.

## Evidência
- CI geral: 35955159394 PASS.
- revisão independente: 35955252488 PASS.
- browser retry/return: PASS.

## Próxima tarefa
T016 - HUD funcional de combate.

Após T016 DONE, T017 fica liberada para o gate integrado do protótipo.
