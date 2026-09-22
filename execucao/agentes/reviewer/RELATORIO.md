# Revisão independente T001

- Papel: reviewer
- Ticket: T001
- Branch revisada: agent/t001-infra
- Head revisado: 5aa460f98c324ca247f95bcf0bc200f56b774dd4
- Branch de revisão: review/p0-T001
- Resultado: REQUEST_CHANGES
- PR revisado: #1

## Escopo verificado
Foram lidos o ticket T001 do pacote original, AGENTS.md, 00_CONTEXTO/STATUS/HANDOFF do planejamento, docs/07_ARQUITETURA.md, docs/12_QUALIDADE_E_RELEASE.md, docs/15_DECISOES_E_FONTES.md, o diff completo do PR #1, RELATORIO.md e HANDOFF.md do agente de infraestrutura.

Também foram verificadas as execuções de CI do autor e criada uma validação independente.

## O que está correto
- Workspaces client, sim, content e protocol existem.
- apps/server está apenas reservado.
- Phaser está fixado em 3.90.0, conforme ADR002.
- Vite, TypeScript, Zod, Vitest, Playwright e lint têm versões exatas.
- package-lock.json existe e usa lockfileVersion 3.
- TypeScript strict está habilitado.
- Não há implementação de combate, quest ou simulação fora do escopo.
- Em Node 22.16.0, a validação independente confirmou npm ci sem --ignore-scripts, typecheck, lint, test, test:content e build.
- git diff --check passou na revisão independente.
- A página mínima abriu tanto pelo dev server quanto pelo preview no Playwright.

## Achados

### P1 - Faixa de Node declarada não é compatível com as dependências instaladas
**Reprodução:** usar Node 22.12.0 e executar `npm_config_engine_strict=true npm ci`.

**Resultado comprovado:** EBADENGINE em `@eslint/config-array@0.23.5`, que exige Node `^20.19.0 || ^22.13.0 || >=24`.

**Arquivos:** `package.json`, `docs/VERSOES_IMPLEMENTADAS.md`.

**Causa:** o projeto declara `>=22.12 <23`, mas o conjunto de dependências resolvido no lockfile não aceita toda essa faixa.

**Correção mínima:** alterar o piso documentado e `engines.node` para `>=22.13 <23`, ou fixar versões do lint realmente compatíveis com Node 22.12 e regenerar o lockfile. Depois repetir npm ci no piso declarado.

### P1 - Documentação operacional do projeto não está no repositório
**Reprodução:** abrir a raiz da branch `agent/t001-infra`.

**Resultado comprovado:** não existem no repositório `AGENTS.md`, `00_CONTEXTO.md`, `execucao/STATUS.md`, `execucao/HANDOFF.md`, `execucao/tarefas/T002.md` nem os documentos de arquitetura/contratos usados pelos próximos tickets. Existem apenas os artefatos criados durante T001 e a documentação do agente.

**Impacto:** o fluxo definido para os próximos chats exige que cada agente leia esses arquivos antes de trabalhar. Um agente T002 não consegue continuar apenas pelo repositório.

**Causa:** o repositório oficial começou vazio e a sessão de infraestrutura criou código sem incorporar o pacote-base de planejamento que deveria acompanhar a implementação.

**Correção mínima:** adicionar ao repositório o pacote oficial de planejamento preservando sua estrutura, antes de liberar T002. Não alterar o conteúdo global de STATUS/HANDOFF durante a correção do agente; o coordenador atualiza os estados após a revisão.

### P2 - Teste Vitest não verifica comportamento real
**Reprodução:** abrir `tests/smoke.test.ts`.

**Resultado comprovado:** o teste executa apenas `expect(true).toBe(true)`.

**Impacto:** o prompt do revisor pede explicitamente procura por testes falsos, e AGENTS proíbe usar teste sem comportamento como evidência. O comando `npm run test` fica verde mesmo se a infraestrutura relevante quebrar.

**Correção mínima:** substituir por um smoke de infraestrutura real, por exemplo validar arquivos/workspaces/scripts esperados ou uma unidade mínima que possa falhar quando o setup quebrar. Não criar teste de gameplay inexistente.

### P2 - CI principal concede escrita e mantém lógica de bootstrap que já não é necessária
**Reprodução:** abrir `.github/workflows/t001-ci.yml`.

**Resultado comprovado:** `permissions: contents: write` e um passo que pode fazer commit/push automático do lockfile.

**Impacto:** depois que o lockfile existe, a validação normal não precisa alterar o repositório. Isso aumenta a superfície de escrita e foi a causa de execuções adicionais disparadas pelo próprio bot.

**Correção mínima:** após estabilizar T001, tornar a CI somente leitura e exigir que package-lock.json já exista. Geração de lockfile deve ser ação explícita do agente, não comportamento permanente da pipeline.

## Evidências independentes
Workflow: `.github/workflows/review-t001.yml` na branch `review/p0-T001`.

- git diff --check: PASS.
- Node 22.16.0 + npm ci exato: PASS.
- typecheck: PASS.
- lint: PASS.
- npm run test: PASS, mas o teste é considerado evidência fraca por ser tautológico.
- npm run test:content: PASS e informa corretamente que casos runtime pertencem a T002/T003.
- build: PASS.
- dev server browser smoke: PASS.
- preview browser smoke: PASS.
- Node 22.12.0 + engine-strict npm ci: FAIL comprovado por EBADENGINE.

## Critérios de aceite
- npm ci e build em checkout limpo: confirmado em Node 22.16.0.
- página mínima no dev server: confirmada pela revisão independente.
- página mínima no preview: confirmada pela revisão independente e pela CI do autor.
- lockfile e versões documentadas: existem, mas a faixa Node documentada precisa correção.

## Conclusão
T001 não deve ser marcada DONE nem mesclada ainda. Os dois P1 precisam ser corrigidos e o teste tautológico deve ser substituído antes de nova revisão.
