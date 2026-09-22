# Passagem de contexto

## Estado atual
T001 concluída e aprovada por revisão independente. A infraestrutura base está pronta para integração.

## Evidência T001
- branch: agent/t001-infra
- head aprovado: 73b0e3411ecf43ebf79f3fc2715b311cc5093868
- revisão independente R2: PASS
- workflow de revisão: 35795120972
- Node mínimo implementado: >=22.13 <23
- npm ci engine-strict: PASS
- typecheck/lint/build: PASS
- smoke Vitest real: PASS
- dev server Playwright: PASS
- preview Playwright: PASS

## Próxima tarefa liberada
T002 - Materializar tipos e schemas públicos.

Antes de executar T002, ler:
- AGENTS.md
- 00_CONTEXTO.md
- execucao/STATUS.md
- execucao/HANDOFF.md
- execucao/tarefas/T002.md
- docs/08_CONTRATOS_DE_DADOS.md

T003 permanece bloqueada até T002 ser implementada e aprovada.
