# Motor de quests

## Máquina de estados
locked → available → active → completed. Dentro de active, estágio único com objetivos compostos. Abandonar sai da instância e preserva somente o último checkpoint. Falha reinicia sala, sem tornar quest permanentemente failed.

Principal exige a anterior concluída; opcionais têm prerequisito no catálogo e nunca bloqueiam principal. Uma instância carrega uma quest.

## Execução por eventos
Entrar no estágio executa entryActions uma vez. Objetivo ouve eventos filtrados por quest/run/alvo. Ao satisfazer, aplica completionActions, cria checkpoint quando pedido e só então entra no seguinte. Estado vive em sim, sem depender de animação. Eventos e ações são idempotentes por IDs estáveis.

## Ações
spawn_encounter, open_exit, set_flag, start_dialogue, reveal_interactable, move_npc, grant_quest_item, remove_quest_item, checkpoint, complete_quest.

## Checkpoint e retomada
Checkpoint acontece em limites seguros de sala/etapa. Repetição de evento não duplica progresso nem recompensa. Objetivos obrigatórios não podem ficar sem alvo alcançável.
