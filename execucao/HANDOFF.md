# Passagem de contexto

## Estado atual
T001, T002, T003, T004, T005 e T006 estão concluídas e aprovadas.

## Camadas disponíveis
- T001: infraestrutura/workspaces
- T002: schemas e contratos
- T003: validação de conteúdo
- T004: relógio fixo, WorldState, RNG e eventos
- T005: entrada/remapeamento e InputFrame
- T006: movimento e colisão compartilhados

## T006 confirmado
- diagonal normalizada;
- movimento por tick;
- círculo vs AABB;
- slide em parede;
- dash/segmento não atravessa parede fina;
- projétil/linha de visão usam swept segment;
- spawn seguro;
- contato tangente permite afastar/deslizar sem grudar;
- sim continua sem Phaser/DOM/rede/timers reais.

## Evidência
- revisão independente T006: workflow 35896281913 PASS;
- CI após rebase sobre T005: workflow 35896407686 PASS.

## Próxima tarefa
T007 - ligar Phaser à sessão local.

T007 é o primeiro ponto planejado em que:
- input T005;
- simulação T004/T006;
- Phaser do cliente

ficam conectados visualmente. Após T007, já deve ser possível abrir uma sala de teste e controlar uma entidade na tela, ainda sem o kit completo de combate.

## Pendência operacional
Branch protection da main continua dependendo de configuração administrativa externa caso a conexão não exponha ruleset write.
