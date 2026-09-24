# Relatório do agente T016

- Papel: HUD/presentation
- Ticket: T016
- Branch: agent/t016-hud
- Estado: IN_PROGRESS até CI e revisão
- Dependências: T007, T008 e T013 DONE

## Implementado
- modelo puro de HUD;
- vida, foco e ultimate;
- quatro slots Q/W/E/R;
- tecla real obtida do InputMapper/bindings;
- cooldown numérico em segundos;
- duas cargas de esquiva;
- objetivo opcional;
- indicador de alvo e barra de telegraph;
- ícones geométricos temporários;
- layout responsivo calculado por viewport;
- shell CSS para canvas FIT.

## Integração
A sala técnica usa estados reais iniciais:
- vida 320/320;
- foco 100;
- ultimate 0;
- duas esquivas;
- cooldowns reais zerados;
- bindings reais.

Não foi criado cooldown ou recurso fake apenas para animação.

## Input
Hud.ts não usa setInteractive nem listeners de pointer. O HUD de combate é canvas/presentation e não vira autoridade de input.

## Testes
- remap aparece no slot;
- cooldown numérico;
- estado real vira snapshot;
- layout cabe em 960x540;
- layout cabe em 1280x720;
- Hud.ts sem interatividade;
- Playwright abre o canvas nos dois viewports sem corte.

## Fora de escopo
- conexão visual completa do combate do Jão;
- derrota/restart T015;
- gate integrado T017.
