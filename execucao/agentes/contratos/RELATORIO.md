# Relatório do agente de contratos

- Papel: contratos
- Ticket: T002
- Branch: agent/t002-contracts
- Estado: DONE após revisão independente R3
- Pull Request: #2

## Escopo executado
Schemas Zod e tipos inferidos para os contratos normativos de docs/08_CONTRATOS_DE_DADOS.md.

### packages/content
- Id, HeroId, QuestId, Tick e Vec2
- AbilityDefinition
- HeroDefinition
- MapDefinition
- QuestDefinition e QuestStage
- QuestProgress
- SaveGame
- parseSaveGameJson com limite de 2 MiB

### packages/protocol
- InputFrame
- ações pressed/released
- EventEnvelope e tipos mínimos de evento

## Decisões
- Tipos TypeScript são inferidos dos schemas Zod.
- Campos internos não especificados pelo contrato ficam como JSON serializável/finito, sem inventar mecânica.
- Ability.target é ID validado porque o contrato não enumera valores.
- Grafo/referências/reachability ficam para T003.
- seq monotônico entre frames é invariável temporal e não cabe a um schema de frame isolado.
- loadouts/mastery usam partialRecord por HeroId.
- SaveGame e EventEnvelope inspecionam o input bruto recursivamente para rejeitar __proto__ antes da transformação.

## Falhas encontradas durante execução e revisão
1. TextEncoder indisponível em pacote puro: substituído por contador UTF-8 independente de ambiente.
2. z.record com HeroId enum exigia todos os heróis: substituído por z.partialRecord.
3. contentVersion tratado como Id: corrigido para string conforme contrato.
4. updatedAt tratado como datetime: corrigido para string conforme contrato.
5. moveX/moveY limitados a [-1,1] sem base normativa: removida faixa inventada, mantendo finitude.
6. __proto__ escapava pelo z.record em payload: corrigido com guarda no input bruto.

## Testes permanentes
- NaN e Infinity rejeitados;
- HeroId desconhecido rejeitado;
- loadout duplicado rejeitado;
- save/input/quest válidos preservam propriedades;
- ações duplicadas rejeitadas;
- evento desconhecido rejeitado;
- payload >2 MiB rejeitado antes do parse;
- __proto__ rejeitado em save e mensagem;
- strings normativas pontuadas/opacas permanecem válidas;
- movimento finito fora de [-1,1] permanece válido.

## Evidência
- PR CI head 5f55850bc5643d51ccbdb00170c56ccce6bc4bf9: PASS
- Reviewer R3 workflow 35798342343: PASS
- git diff --check: PASS
- npm ci engine-strict: PASS
- typecheck: PASS
- lint: PASS
- testes do autor: PASS
- testes adversariais: PASS
- build: PASS

## Fora de escopo
- referências entre catálogos;
- prerequisites DAG;
- stages alcançáveis;
- conectividade/spawn de mapas;
- simulação/Phaser/telas.
