# Relatório de revisão — T018

Data: 2026-09-24
Branch revisada: `agent/t018-quest-objectives`
Commit validado: `0704a38130dbd442c323c02ed6cf902b63a49ede`
CI: `36008599138` PASS

## Critérios do ticket

### Evento duplicado não avança duas vezes
Aprovado.
Há deduplicação global por `eventId` e teste cobrindo dois stages com o mesmo objetivo, garantindo que um único evento não atravesse ambos.

### Coletar mesmo item duas vezes não satisfaz contagem
Aprovado.
O estado usa IDs únicos, não contador arbitrário. Eventos diferentes para o mesmo item não incrementam progresso.

### Objetivo final termina a quest uma vez
Aprovado.
Quest entra em `completed` e eventos posteriores não reexecutam ações nem alteram o estado.

## Revisão adicional
- IDs duplicados de stage e ação são rejeitados.
- Alvos e itens duplicados na definição são rejeitados.
- Eventos de outra run são ignorados.
- `defeat` exige confirmação explícita do encounter correto.
- `all/any` respeita o limite de dois níveis.
- Item coletado fora do objetivo ativo não é persistido em `collectedIds`.

## Observações não bloqueadoras
- `holdTicks` é contrato do produtor de `interaction_completed`, não do quest engine.
- A confirmação persistente de ações será tratada pela camada de checkpoint da T020.
- `appliedEventIds` mantém também eventos irrelevantes da run ativa. É correto para idempotência no escopo atual; otimização de retenção pode ser avaliada quando houver sessões longas.

## Resultado
Aprovado tecnicamente.

T018 permanece REVIEW apenas porque a dependência T017 ainda aguarda playtest manual para virar DONE.
