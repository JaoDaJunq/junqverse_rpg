# Revisão total da main após T004

- Papel: reviewer total
- Branch revisada: main
- Head revisado: 1a005fbf178d3e906849859315a8f44797bd2673
- Branch de auditoria: review/p0-total-after-t004
- Workflow de auditoria: 35893455248
- Resultado geral: CODE_OK / PLANNING_BLOCKED

## Resumo executivo
A implementação T001-T004 está tecnicamente saudável no estado atual. Instalação reproduzível, typecheck, lint, testes existentes, testes adversariais, gate de conteúdo, limites de arquitetura, build, dependency audit e smoke de navegador passaram.

O bloqueio atual está na continuidade operacional do projeto: a main contém apenas parte do pacote de planejamento original, o manifesto está desatualizado, a tarefa T005 e referências obrigatórias de T005/T006 faltam, e a main não está protegida por regras/checks obrigatórios.

## Evidência automatizada
Workflow 35893455248.

### code-quality: PASS
- npm_config_engine_strict=true npm ci
- npm audit --audit-level=high
- npm run typecheck
- npm run lint
- npm run test
- testes adversariais adicionais
- npm run test:content
- verificação de boundaries de packages
- npm run build
- Playwright preview smoke

### planning-integrity: FAIL
Falhou já na checagem de tickets executáveis porque execucao/tarefas/T005.md não existe na main.

## Achados

### P1 - Main sem proteção e sem enforcement obrigatório de CI
**Evidência:** branch main retorna protected=false e required status checks desabilitados.

**Impacto:** um push direto ou merge sem a disciplina manual atual pode entrar na main sem npm ci, testes, build ou revisão. O workflow existente valida PRs, mas não impede bypass.

**Correção mínima:** habilitar proteção/ruleset para main exigindo PR e checks de CI antes do merge. Se a permissão da conexão não permitir configurar proteção, registrar a ação manual como bloqueio operacional obrigatório.

### P1 - Pacote de planejamento está incompleto na main
**Evidência:**
- pacote original preservado possui 160 arquivos;
- main atual possui 71 blobs;
- pacote original possui 96 tickets/manifestações de tarefa;
- execucao/manifest.json da main lista apenas T001-T003.

**Impacto:** agentes futuros não conseguem usar o repositório como fonte única de continuidade. Isso já bloqueia o fluxo imediato.

**Correção mínima:** sincronizar o pacote de planejamento original para o repositório, preservando arquivos de execução atuais onde houver estado mais novo. No mínimo, incorporar todos os tickets e referências P0 antes de avançar.

### P1 - T005 está liberada no STATUS, mas o ticket e suas referências não existem
**Evidência:** STATUS marca T005 como liberada; execucao/tarefas/T005.md não existe. O ticket original referencia docs/03_GAMEPLAY_E_COMBATE.md e docs/06_UX_E_ACESSIBILIDADE.md, ambos ausentes da main.

**Impacto:** não é possível despachar corretamente o agente de input a partir apenas do GitHub.

**Correção mínima:** restaurar T005 e docs/03 + docs/06 do pacote original antes de iniciar T005.

### P1 - T006 está marcada como próxima, mas sua referência normativa não existe
**Evidência:** execucao/tarefas/T006.md existe e referencia docs/03_GAMEPLAY_E_COMBATE.md; esse documento não existe na main.

**Impacto:** implementar T006 agora exigiria contexto externo ou invenção de regras de collider, raio, dash e linha de visão.

**Correção mínima:** restaurar docs/03_GAMEPLAY_E_COMBATE.md antes de iniciar T006.

### P1 - Contrato normativo de MapDefinition ainda não está totalmente materializado
**Fonte normativa:** docs/08_CONTRATOS_DE_DADOS.md declara que MapDefinition deve validar referências, coordenadas, conectividade e ponto de saída, além de spawn sem parede.

**Estado atual:** MapDefinitionSchema mantém rooms/spawnPoints/blockers/interactables/exits como JsonObject genérico e validateContent não implementa checagem semântica de coordenadas, spawn vs parede, conectividade ou saída do mapa.

**Impacto:** T002/T003 estão verdes para os tickets implementados, mas o contrato normativo completo de mapa ainda não está coberto. Conteúdo de mapas futuro pode passar pela validação sem cumprir essas invariantes.

**Correção mínima:** antes do primeiro ticket que adicionar mapas reais, materializar os formatos mínimos desses elementos e implementar validação geométrica/conectividade. Registrar como subtarefa corretiva vinculada ao contrato, sem redesenhar gameplay.

### P2 - execucao/manifest.json está desatualizado
**Evidência:** lista apenas T001-T003, embora STATUS já tenha T001-T017 e T004 esteja DONE. O manifesto original possui o grafo completo, incluindo T004-T007 e demais tarefas.

**Impacto:** ferramentas/agents que leem o manifesto podem concluir uma ordem de execução errada ou não encontrar dependências.

**Correção mínima:** substituir/sincronizar o manifesto com o original e aplicar apenas as alterações de estado em STATUS, não truncar o grafo.

### P2 - Branches antigas e uma implementação alternativa de T004 permanecem acessíveis
**Evidência:** existem branches agent/t001-infra, agent/t002-contracts, agent/t003-content-validation, agent/t004-engine, review/* e também agent/t004-motor. agent/t004-motor diverge da main e contém uma implementação alternativa não integrada.

**Impacto:** agentes futuros podem escolher uma branch obsoleta/alternativa como base e ressuscitar código rejeitado ou divergente.

**Correção mínima:** após confirmar evidências preservadas na main, apagar ou arquivar branches concluídas. Prioridade especial para agent/t004-motor.

### P2 - Workflow global mantém nome e gatilho herdados de T001
**Evidência:** .github/workflows/t001-ci.yml se chama "T001 CI"; push direto só dispara em agent/t001-infra, embora pull_request para main valide todos os PRs.

**Impacto:** nomenclatura induz erro operacional e push direto na main não recebe esse workflow. Em conjunto com main desprotegida, aumenta risco.

**Correção mínima:** renomear para CI ou P0 CI, incluir push em main se desejado e usar ruleset para exigir checks de PR.

### P3 - Contadores do WorldState não validam overflow de safe integer
**Estado atual:** nextEntityId e nextEventCounter são números monotônicos, porém allocateEntityId/emitWorldEvent não protegem Number.MAX_SAFE_INTEGER.

**Impacto:** não é risco prático para P0, mas um estado corrompido ou sessão absurdamente longa pode quebrar unicidade numérica.

**Correção mínima:** adicionar guards de Number.isSafeInteger/overflow quando a camada online ou persistência autoritativa começar a depender desses contadores.

## Pontos positivos confirmados
- Não foram encontrados segredos, passwords, api keys ou tokens hardcoded no code search da main.
- Não foram encontrados eval/new Function/innerHTML/fetch/http solto nos módulos atuais.
- packages/sim não usa Phaser, DOM, relógio real, timers nem Math.random.
- content/protocol não importam sim/client/Phaser.
- schemas rejeitam NaN/Infinity, duplicatas relevantes e chaves de prototype pollution testadas.
- limite de 2 MiB do save é aplicado por bytes UTF-8 antes do JSON.parse.
- conteúdo detecta IDs duplicados, referências ausentes, ciclos de prerequisite, stages ausentes/cíclicos/inacessíveis.
- RNG/WorldState permanecem determinísticos nos testes adversariais.
- npm audit --audit-level=high passou.
- build e smoke de navegador passaram.

## Parecer
Não há motivo técnico para reabrir T001-T004 como um todo. O código integrado pode permanecer.

Entretanto, **não iniciar T005 nem T006 ainda**. A prioridade deve ser uma tarefa curta de saneamento do planejamento/repositório: restaurar o pacote P0 (idealmente o pacote completo), atualizar manifest, corrigir referências ausentes e proteger a main. Depois disso, T005 e T006 podem ser despachadas em paralelo conforme o grafo original.
