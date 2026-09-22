# Revisão independente T002 - rodada 2

- Papel: reviewer
- Ticket: T002
- Head revisado: 92aa00b516c757f87244be465cf115830c9942fc
- Resultado: REQUEST_CHANGES
- Workflow: 35798116378

## Confirmado
- git diff --check: PASS
- sem Phaser/Date/timers/Math.random nos contratos: PASS
- npm ci engine-strict: PASS
- typecheck/lint/testes do autor: PASS
- contentVersion string sem formato inventado: PASS
- moveX/moveY finitos sem faixa inventada: PASS
- QuestId desconhecido: rejeitado
- NaN aninhado em payload: rejeitado

## P1 - __proto__ é aceito em payload de mensagem
**Reprodução:** JSON.parse('{"__proto__":{"polluted":true}}') usado como payload de EventEnvelope.

**Resultado:** EventEnvelopeSchema.safeParse retorna success=true.

**Contrato violado:** docs/08_CONTRATOS_DE_DADOS.md exige não aceitar chaves __proto__ vindas de save/mensagem.

**Causa provável comprovada pelo comportamento:** validar apenas as chaves através de z.record não garante rejeição do input bruto nesse caso especial.

**Correção mínima:** detectar recursivamente chaves proibidas no input bruto antes da transformação do schema, para EventEnvelope e SaveGame. Adicionar regressões permanentes.
