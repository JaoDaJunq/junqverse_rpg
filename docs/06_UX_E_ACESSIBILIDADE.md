# Interface e acessibilidade
## Fluxo
Boot → menu → perfil → Refúgio → preparação → missão → resultados → Refúgio.
Menu oferece Continuar, Novo perfil, Importar, Configurações e Créditos. Continuar respeita checkpoint. Novo perfil usa um dos 3 slots e pede confirmação só para substituir slot ocupado.

Refúgio: mural de missões, bancada de relíquias, rádio/códice, pátio de treino e memorial/cosméticos. A seleção de herói ocorre na preparação, com preview, classe, dificuldade, habilidades e duas relíquias. NPCs e estações têm interação F e alternativa clicável quando próximos.

## HUD
Vida/foco/ultimate, quatro habilidades com tecla real e cooldown numérico, duas cargas de esquiva, objetivo atual até duas linhas, minimapa simples das salas conhecidas. Boss: barra no topo e fase, sem listar estatística interna. Debug fica somente em desenvolvimento.

Diário distingue principal/opcional, mostra próximo objetivo e motivo de bloqueio. Quest ativa com no máximo 1 principal e 2 opcionais rastreadas. Opcionais são excursões curtas iniciadas no hub, reutilizando salas; não disputam a instância de uma principal.

## Interação e textos
Raio básico 56 px, prompt com nome e progresso. Uma interação focal por vez: menor distância, desempate por ID. Segurar F é necessário somente para estabilização/revive; conversa usa toque. Sem puzzle de digitar texto.

Erros: explicar ação possível, por exemplo “Este save é de uma versão mais nova. Exporte o atual antes de atualizar o jogo.” Nunca mostrar stack trace como mensagem ao jogador. Falha de rede oferece Reconectar e Voltar ao menu; falha de gravação oferece Exportar, sem fingir que salvou.

## Acessibilidade
Remapear teclas, tamanho de texto 100/125/150%, alto contraste, reduzir flashes/shake/partículas, mira assistida, legendas e sliders de volume. Todos os controles de menu navegáveis por teclado, foco visível e sem armadilha de foco. DOM semântico para menus e diário; canvas para mundo/HUD de combate. Leitor de tela pode acessar menus e texto narrativo, mas não se promete acessibilidade integral do combate nesta versão.

Ajustes de efeito são locais e não alteram hitboxes. Cor nunca é único aviso. Modo Assistido descrito antes de iniciar. Janela sem foco pausa solo e libera teclas; online continua e mostra aviso ao voltar.

## Estados especiais
Loading mostra progresso de assets, erro recuperável e botão tentar novamente. Desconexão mostra tempo restante. Perfil inválido preserva arquivo e abre recuperação, sem reset automático. Inventário vazio tem explicação. Missão concluída mostra recompensas únicas e repetíveis separadas. Nenhum botão decorativo aparenta estar funcional.
