# Passagem de contexto

## Estado atual
T001-T007 estão concluídas e aprovadas por revisão independente.

## Primeiro protótipo visual disponível
T007 liga:
- InputMapper da T005;
- relógio/simulação da T004;
- movimento/colisão da T006;
- Phaser 3.90 no cliente.

A sala técnica atual permite:
- WASD para mover;
- colisão contra paredes;
- câmera seguindo;
- Esc para pausar/retomar;
- blur pausa;
- render interpolado por snapshots.

## Evidência T007
- CI geral: 35897259074 PASS.
- revisão independente: 35897491460 PASS.
- 30/60/144 FPS de render chegam ao mesmo tick/posição.
- Playwright confirmou canvas mudando ao mover, estático pausado e mudando novamente ao retomar.
- cliente não contém regras de movimento; Phaser só apresenta snapshots.

## Próxima tarefa
T008 - ciclo de cast e recursos.

A partir daqui já existe algo visual para testar, mas ainda é um protótipo técnico sem combate completo. T008-T010 constroem o combate genérico; T012-T013 implementam o kit específico do Jão; T017 é o gate integrado de combate.

## Pendência operacional
Branch protection da main ainda depende de configuração administrativa externa caso a conexão não exponha ruleset write.
