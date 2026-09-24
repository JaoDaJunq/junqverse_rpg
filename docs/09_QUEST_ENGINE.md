# Motor de quests
## Máquina de estados
locked → available → active → completed. Dentro de active, estágio único com objetivos compostos. Abandonar sai da instância e preserva somente último checkpoint. Falha reinicia sala, sem tornar quest permanentemente failed.

Principal exige a anterior concluída; primeira livre. Opcionais têm prerequisito no catálogo e nunca bloqueiam principal. M01–M08 podem repetir após completar. Uma instância carrega uma quest; opcionais são expedições próprias. Isso elimina condição ambígua de duas quests consumirem o mesmo objeto.

## Execução por eventos
Entrar no estágio executa entryActions uma vez. Objetivo ouve eventos filtrados por quest/run/alvo. Ao satisfazer, congela resultado, aplica completionActions, cria checkpoint quando pedido e só então entra no seguinte. Quest termina depois que estágio final e recompensa foram confirmados. Pular diálogo chama a mesma confirmação que terminar a leitura.

Estado vive em sim, sem await de animação. UI pode atrasar apresentação, nunca progressão. Mensagem repetida e callback duplicado não duplicam objetivo. Eventos durante transição são enfileirados e roteados ao estágio válido no tick de aplicação.

## Ações disponíveis
spawn_encounter, open_exit, set_flag, start_dialogue, reveal_interactable, move_npc, grant_quest_item, remove_quest_item, checkpoint, complete_quest. ID estável por stage+ação. complete_quest só em fim válido. Falas não são objetivos bloqueantes salvo interação explícita de conversa.

## Tipos de encontro
Clear: número finito de spawns conhecido. Survive: encerra pelo tempo, cancela novos spawns, limpa hostis remanescentes com fade sem recompensa de abate. Defense: use survive; objetivo não tem vida até introdução explícita. Escort: NPC tem 300 HP, avança a 60 px/s quando jogador está a até 160 px e encontro local foi limpo; dano inimigo contra NPC ×0,5, morte reinicia trecho. Nunca puxar NPC por teleporte silencioso. Se ficar preso por 3 s, mostrar recuperação e recalcular caminho; fallback ao último waypoint seguro fora de combate.

## Puzzle solo e coop
Toda placa dupla tem retenção de 8 s ou estabilizador móvel operável por qualquer herói. Não exigir simultaneidade impossível no solo. Coop usa progresso compartilhado; interagir duas vezes não acelera estabilização. Um jogador inicia, sair/cancelar interrompe, outro pode reiniciar do zero. Coleta fica para o grupo da instância. Loot pessoal persistente entregue no final por recibo.

## Checkpoint e retomada
Salas menores são unidade de replay. Morrer no boss volta à antecâmara com vida/foco cheios. Objetos obrigatórios resetam se estágio reinicia; IDs de colecionáveis já confirmados ficam coletados. Um softlock detector de dev verifica ausência de alvo obrigatória e expõe diagnóstico, nunca auto-completa quest em produção.

## Critérios para cada missão
Percorrer do início ao fim com cada herói liberado; resolver todos puzzles solo; testar morte, abandonar, reload, replay e pular diálogo; verificar recompensas uma vez e retorno ao hub. No coop, entradas simultâneas, desconexão e escolha coletiva não travam transição. A definição textual da missão é contrato para a implementação.

## Saída de sala e travas locais
Ao confirmar transição para outra sala, remover hostis/projéteis/zonas da anterior sem XP/carga/recompensa de abate e criar o checkpoint da nova sala. Inimigos não perseguem entre salas. Permanecer na mesma sala para diálogo/epílogo não recria o boss. Em coop a remoção só ocorre quando a transição coletiva foi confirmada.

Objetivo all pode conter defeat e sequence/interact. Quando o roteiro exige derrotar guardas antes de operar, a interação permanece bloqueada enquanto esse encounter tem hostis vivos; o prompt explica “Liberte a área”. Essa é uma condição declarativa no alvo (requiresEncounterCleared), não código especial na scene. Acrescentar esse campo opcional ao schema de interactable.
