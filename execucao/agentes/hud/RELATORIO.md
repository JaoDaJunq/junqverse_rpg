# Relatório do agente T016

- Papel: HUD/presentation
- Ticket: T016
- Branch: agent/t016-hud
- Estado: REVIEW após integração com T015
- Dependências: T007, T008 e T013 DONE

## Implementado
- modelo puro de HUD;
- vida, foco e ultimate;
- quatro slots Q/W/E/R;
- tecla real lida do InputMapper;
- cooldown numérico em segundos;
- duas cargas de esquiva;
- objetivo opcional;
- indicador de alvo e barra de telegraph;
- ícones geométricos temporários;
- layout responsivo;
- shell CSS para canvas FIT.

## Integração
A sala técnica usa estados iniciais reais do Jão e mantém o fluxo T015 de derrota/restart.
O HUD é redesenhado com bindings atuais a cada update, preparando remapeamento sem fazer o HUD virar autoridade de input.

## Input
Hud.ts não usa setInteractive nem listeners de pointer. Clique no mundo continua pertencendo ao canvas/input.

## Testes
- remap aparece no slot;
- cooldown numérico;
- estado real vira snapshot;
- layout cabe em 960x540 e 1280x720;
- HUD sem interatividade;
- Playwright valida canvas nos dois viewports;
- regressões T015 permanecem na base.

## Fora de escopo
Conexão visual do combate em tempo real fica para T017.
