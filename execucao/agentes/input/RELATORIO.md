# Relatório do agente de input

- Papel: input/interface
- Ticket: T005
- Branch: agent/t005-input
- Estado: IN_PROGRESS até CI e revisão
- Dependências: T001 e T002 DONE

## Escopo executado
Implementado mapeamento de entrada no cliente sem regras de gameplay.

### bindings
- WASD para movimento;
- 1/2/3 para slots q/w/e;
- R para ultimate;
- Espaço para dodge;
- F para interação;
- conflitos de remapeamento rejeitados.

### InputMapper
- bordas pressed por keydown não repetido;
- released para E e interact conforme InputFrame;
- básico como held no mouse esquerdo;
- interação como held + edges;
- movimento derivado de teclas mantidas;
- pointer sobre UI não inicia básico;
- conversão tela → mundo por callback de câmera;
- clear em blur;
- sceneChanged/detach limpam estado;
- sequência monotônica de InputFrame.

## Decisões
- O cliente apenas produz InputFrame. Não calcula movimento, dano, cooldown ou regras de habilidade.
- Slot W usa Digit2; KeyW permanece exclusivamente movimento no padrão.
- O mapper recebe screenToWorld por injeção para não acoplar a regra de input à câmera Phaser.
- Remapear limpa estado held/transient para evitar tecla fantasma.

## Testes
tests/input-mapper.test.ts cobre:
- W movimento vs slot W em Digit2;
- habilidade gera uma única borda ao segurar;
- básico permanece held;
- clique sobre UI é suprimido;
- blur/troca de scene limpam estado;
- release de E/interact;
- transformação de mira;
- conflito de remap;
- teclas opostas resultam em eixo zero.

## Fora de escopo
- movimento/colisão T006;
- ligação visual da sessão Phaser T007;
- casts/cooldowns/dano.

## Evidência pendente
Aguardar CI limpa e revisão independente.
