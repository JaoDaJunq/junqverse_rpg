# Instruções para executar o projeto
Este arquivo orienta o modelo que implementará JUNQVERSE. O pacote atual contém planejamento; não invente código ou testes previamente existentes.

## Fluxo obrigatório
1. Leia 00_CONTEXTO.md, execucao/STATUS.md e o ticket escolhido.
2. Verifique dependências no STATUS e procure a implementação real. Se ausente, a dependência não está concluída.
3. Leia os documentos listados no ticket. Encontre arquivos afetados com rg.
4. Faça a menor entrega completa do ticket. Use funções puras para regras e adaptadores para APIs externas.
5. Rode verificações exigidas e registre resultado real, incluindo falha de ambiente.
6. Atualize STATUS e HANDOFF. Pare no limite do ticket, salvo pedido explícito de sequência.

## Contratos de desenvolvimento
TypeScript strict. Código em inglês; textos em pt-BR. IDs ASCII estáveis em snake_case. Duração em ticks, distância em pixels. Use unions discriminadas; valide JSON em runtime. Evite any, supressões genéricas e helpers que engolem exceções.

T001 e N001 registram versões exatas em docs/VERSOES_IMPLEMENTADAS.md e lockfile. Não instalar next/beta automaticamente nem atualizar dependências fora de tarefa justificada.

Mantenha packages/sim sem Phaser, DOM, timers reais ou rede. Estado pertence à simulação. Phaser apresenta snapshots e envia InputFrame. UI destrói listeners ao fechar. Aleatoriedade de gameplay é seeded; cosméticos podem ter aleatoriedade independente.

Ticket pode adicionar arquivo auxiliar e teste pertinente além dos caminhos previstos; registre a razão. Não editar módulos não relacionados. Alteração de contrato público exige atualizar consumidores, schemas, exemplos e decisão na mesma entrega ou registrar bloqueio concreto.

## Integridade
Não marcar DONE com TODO funcional, teste pulado, retorno fixo, botão sem efeito ou mock em produção. Placeholders gráficos permitidos até gate artístico; sistemas simulados só em fixtures separadas. Não remover teste que revela bug. Não excluir save nem resetar repositório para contornar problema. Import valida antes de tocar o slot.

Não publicar, contratar servidor ou incorrer em despesa sem autorização do responsável. Preparar builds e configuração local é permitido. Commits locais pequenos são recomendados; push/merge seguem instruções do usuário no ambiente.

## Se faltar contexto
Use docs/15_DECISOES_E_FONTES.md e execucao/DECISOES.md. Dúvida estética não impede motor e quests: use padrão definido. Bloqueio real informa arquivo/regra conflitante e a menor decisão necessária. Não invente traços das pessoas reais.

## Entrega por sessão
Relatar tarefa, comportamento, arquivos relevantes, comandos/resultados, limitações e próxima tarefa desbloqueada. Atualizar STATUS e HANDOFF. Revisão não é ocasião para redesenhar o jogo.
