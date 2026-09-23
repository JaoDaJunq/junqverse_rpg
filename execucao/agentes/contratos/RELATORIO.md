# Relatório do agente de contratos

- Papel: contratos
- Ticket: T002
- Branch: agent/t002-contracts
- Head: dc2859e69ea8757c3125455749a3d885a9dde7e6
- Estado: REVIEW
- Pull Request: #2
- Dependência: T001 DONE

## Escopo executado
Materialização dos contratos normativos de docs/08_CONTRATOS_DE_DADOS.md em schemas Zod e tipos inferidos.

### packages/content
- Id, HeroId, QuestId, Tick e Vec2
- AbilityDefinition
- HeroDefinition
- MapDefinition
- QuestDefinition e QuestStage
- QuestProgress
- SaveGame
- helper parseSaveGameJson com limite de 2 MiB antes do parse

### packages/protocol
- InputFrame
- ações pressed/released
- EventEnvelope e tipos mínimos de evento

## Decisões
- Tipos TypeScript são inferidos dos schemas Zod; não há interfaces paralelas.
- Campos internos não especificados pelo contrato são tratados como JSON serializável e finito, sem inventar mecânica.
- Ability.target permanece um ID validado porque o contrato não enumera valores permitidos.
- loadouts e mastery usam registros parciais com chave HeroId; heróis bloqueados não precisam existir no save.
- Validação de grafo, referências entre catálogos e reachability ficam para T003.
- Monotonicidade de seq entre frames é invariável temporal e não pode ser comprovada por um único InputFrame isolado.

## Testes reais
tests/contracts.test.ts cobre:
- NaN e Infinity rejeitados;
- HeroId desconhecido rejeitado;
- loadout duplicado rejeitado;
- save/input/quest válidos preservam propriedades;
- ações duplicadas rejeitadas;
- tipo de evento desconhecido rejeitado;
- payload de save acima de 2 MiB rejeitado antes do parse.

## Falhas encontradas e corrigidas
1. TextEncoder não estava disponível nos tipos de packages/content. Foi substituído por contador UTF-8 puro, mantendo o pacote independente de DOM/Node.
2. z.record com enum no Zod 4 exigia todos os HeroIds em loadouts/mastery. Foi trocado por z.partialRecord, preservando chaves válidas sem exigir heróis bloqueados.

## Evidência
Workflow PR #2, run 35797709899:
- npm ci: PASS
- typecheck: PASS
- lint: PASS
- npm run test: PASS
- npm run test:content: PASS
- build: PASS
- Chromium install: PASS
- preview smoke: PASS

## Fora de escopo
- validação de referências de catálogo;
- prerequisites DAG;
- stages alcançáveis;
- spawn/connectividade de mapas;
- simulação, Phaser ou telas.

## Pedido ao reviewer
Revisar T002 contra docs/08_CONTRATOS_DE_DADOS.md, procurando principalmente campos aceitos além do contrato, IDs desconhecidos, números não finitos, duplicatas, imports proibidos e falsos positivos de teste.
