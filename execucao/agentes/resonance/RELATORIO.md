# Relatório do agente T011

- Papel: Ressonância
- Ticket: T011
- Branch: agent/t011-resonance
- Estado: IN_PROGRESS até CI e revisão
- Dependências: T009 e T010 DONE

## Implementado
- primer com duração de 240 ticks;
- uma marca por alvo, reaplicar renova;
- detonator consome a marca primária;
- explosão base 25 em raio 64 incluindo alvo primário;
- powerMultiplier usa rank do detonador;
- slow 20% por 60 ticks;
- cap global por vítima de uma explosão a cada 90 ticks, independente do autor;
- explosão não consome nem detona marcas vizinhas;
- DoT e resonance_explosion não podem disparar detonação;
- evento visual da marca usa outline + icon, não apenas cor.

## Decisões
- O cap de 90 ticks é armazenado por vítima, não por autor.
- Uma tentativa válida de detonator consome a marca mesmo se uma vítima individual estiver no cooldown global ou invulnerável; o cap é de recebimento da explosão, não de consumo da marca.
- Ressonância reutiliza applyDamage e applyStatus de T009.
- Não existe propagação recursiva: a explosão é explicitamente um triggerKind que não detona.

## Testes
tests/resonance.test.ts cobre:
- primer/detonator por um único herói;
- renovação e expiração da marca;
- dois detonadores simultâneos;
- cap global entre autores;
- ausência de cadeia;
- DoT não detona;
- rank do detonador;
- cue visual não baseado só em cor.

## Fora de escopo
- kit específico de Jão T012/T013;
- VFX Phaser;
- HUD.

## Evidência pendente
Aguardar CI e revisão independente.
