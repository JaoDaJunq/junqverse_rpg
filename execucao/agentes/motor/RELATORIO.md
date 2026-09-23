# Relatório do agente de motor

- Papel: motor/simulação
- Ticket: T004
- Branch: agent/t004-engine
- Head de código validado: 22e0d75718b79c85b577ff83a28ae63fc17147ae
- Estado: REVIEW
- Pull Request: #4
- Dependência: T002 DONE

## Escopo executado
Implementado o núcleo determinístico da simulação, sem movimento, combate ou colisão.

### packages/sim
- relógio fixo de 60 ticks/s;
- helpers ticksToSeconds/secondsToTicks;
- RNG seeded puro e separado da apresentação;
- WorldState mínimo;
- entityId monotônico;
- contador de eventos por tick;
- IDs de evento no formato runId:tick:counter;
- ordem explícita das fases de stepWorld;
- avanço de tick sem Date.now, timers reais ou Math.random.

## Decisões
- stepWorld ainda não processa InputFrame. Antes de T005, inputs não vazios geram erro explícito em vez de serem ignorados silenciosamente.
- Tempo autoritativo fica somente em ticks inteiros; segundos são derivados por helper.
- O estado guarda RNG como dado puro.
- Sim depende apenas de @junqverse/content para JsonObject; não importa Phaser, DOM, rede nem protocol.

## Testes adicionados
tests/sim-core.test.ts cobre:
- mesma seed produz mesma sequência RNG e mesmo estado;
- 600 ticks = 10 segundos;
- entityId monotônico;
- IDs de evento únicos e ordem estável;
- ausência de Date.now, Math.random, timers, Phaser, window/document no sim;
- input prematuro não é ignorado.

## Evidência
Workflow PR #4, run 35891871360:
- npm ci: PASS
- typecheck: PASS
- lint: PASS
- npm run test: PASS
- test:content: PASS
- build: PASS
- Chromium install: PASS
- preview smoke: PASS

## Fora de escopo
- T005 InputMapper;
- T006 movimento, círculo/AABB, dash e linha de visão;
- combate, projéteis e dano.

## Pedido ao reviewer
Validar determinismo, pureza/não mutação, 600 passos unitários, IDs monotônicos/estáveis e imports proibidos antes de aprovar T004.
