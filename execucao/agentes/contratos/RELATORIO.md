# Relatório do agente de contratos

- Papel: contratos
- Ticket: T002
- Branch: agent/t002-contracts
- Estado: REVIEW
- Dependência: T001 DONE
- Pull Request: #2

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
- helper parseSaveGameJson com limite de 2 MiB

### packages/protocol
- InputFrame
- ações pressed/released
- EventEnvelope e tipos mínimos de evento

## Decisões
- Tipos TypeScript são inferidos dos schemas Zod; não há interfaces paralelas.
- Campos internos não especificados pelo contrato são tratados como JSON serializável e finito, sem inventar mecânica.
- Ability.target permanece um ID validado porque o contrato não enumera valores permitidos.
- Validação de grafo, referências entre catálogos e reachability ficam para T003.
- Monotonicidade de seq entre frames é invariável temporal e não pode ser comprovada por um único InputFrame isolado.
- Registros por HeroId em save usam z.partialRecord: heróis bloqueados não precisam possuir entrada.

## Testes adicionados
tests/contracts.test.ts cobre:
- NaN e Infinity rejeitados;
- HeroId desconhecido rejeitado;
- loadout duplicado rejeitado;
- save/input/quest válidos preservam propriedades;
- ações duplicadas rejeitadas;
- tipo de evento desconhecido rejeitado;
- payload de save acima de 2 MiB rejeitado antes do parse.

## Arquivos alterados
- packages/content/src/contracts.ts
- packages/content/src/index.ts
- packages/protocol/src/contracts.ts
- packages/protocol/src/index.ts
- packages/protocol/package.json
- package.json
- package-lock.json
- tests/contracts.test.ts

## Fora de escopo
- validação de referências de catálogo;
- prerequisites DAG;
- stages alcançáveis;
- spawn/connectividade de mapas;
- simulação, Phaser ou telas.

## Evidência real
Workflow do PR #2, execução 35797709899, head 164bb861e2712dd52bf0875bcf0c163b827d2cea:
- npm ci: PASS
- typecheck: PASS
- lint: PASS
- npm run test: PASS
- npm run test:content: PASS
- build: PASS
- preview Playwright: PASS

Falhas anteriores foram mantidas como evidência:
- TextEncoder indisponível no pacote puro: corrigido por contador UTF-8 sem DOM/Node.
- z.record com enum exigia todos os HeroIds: corrigido para z.partialRecord.

## Pedido ao reviewer
Revisar contratos contra docs/08_CONTRATOS_DE_DADOS.md, procurar imports proibidos, tipos duplicados, validações fracas/falsas e alterações fora de T002.
