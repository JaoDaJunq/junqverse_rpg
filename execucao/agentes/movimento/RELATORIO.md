# Relatório do agente de movimento

- Papel: motor/movimento
- Ticket: T006
- Branch: agent/t006-movement
- Estado: IN_PROGRESS até CI e revisão
- Dependência: T004 DONE

## Escopo executado
Implementada geometria compartilhada e movimento determinístico na simulação.

### geometry.ts
- AABB
- interseção círculo × AABB
- expansão de AABB
- swept segment contra AABB
- primeiro hit estável
- helper de linha de visão
- helper de spawn seguro

### movement.ts
- normalização diagonal
- delta por tick a partir de px/s
- movimento círculo com resolução por eixo
- deslizamento em parede
- dash/segmento com swept collision
- bloqueio explícito quando a posição inicial já está dentro de parede

## Decisões
- movimento depende somente de ticks da simulação, nunca FPS de render;
- dash e projéteis compartilham a mesma base geométrica de segmento;
- colisão contínua usa AABB expandida pelo raio do círculo para impedir tunneling;
- movimento comum resolve X e Y separadamente para permitir slide;
- nenhum Phaser/DOM/protocol foi adicionado ao sim.

## Testes
tests/movement.test.ts cobre:
- diagonal igual a cardinal em velocidade;
- distância fixa por tick;
- parede fina bloqueando movimento;
- slide em parede;
- dash não atravessa parede;
- segmento de projétil encontra parede fina;
- linha de visão;
- spawn seguro em fixture corredor/canto;
- start overlap rejeitado.

## Fora de escopo
- processamento de InputFrame em WorldState;
- Phaser/session local T007;
- projétil de combate real T010.

## Evidência pendente
Aguardar CI limpa e revisão independente.
