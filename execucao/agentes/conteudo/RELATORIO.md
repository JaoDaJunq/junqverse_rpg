# Relatório do agente de conteúdo

- Papel: conteúdo
- Ticket: T003
- Branch: agent/t003-content-validation
- Estado: IN_PROGRESS até CI e revisão
- Dependência: T002 DONE

## Escopo executado
- validação de documentos asset/hero/map/quest;
- referências hero.assetId, quest.mapId, quest.prerequisites e stage.nextStageId;
- IDs duplicados;
- DAG de prerequisites;
- stages alcançáveis a partir do primeiro estágio;
- detecção de ciclos de stages;
- exigência de terminal alcançável com nextStageId null;
- catálogo parcial permitido sem exigir todos os heróis/quests globais;
- erros estruturados com file, id, code e message;
- gate assertValidContent;
- test:content convertido para Vitest real.

## Decisões
- Apenas referências explicitamente definidas pelos contratos atuais são validadas.
- Objetivos/actions continuam opacos além do discriminante porque seus campos internos ainda não são normativos.
- Conectividade geométrica/spawn contra paredes não foi inventada porque MapDefinition ainda não estrutura esses campos.
- O primeiro item de stages é tratado como entrada da quest, pois o contrato não define entryStageId separado.

## Testes
- catálogo parcial íntegro passa;
- map ausente falha com file/id;
- ciclo de prerequisites falha;
- nextStageId ausente falha;
- stage inalcançável falha;
- ciclo de stages sem terminal falha;
- assertValidContent lança em catálogo inválido.

## Fora de escopo
- motor de quest runtime;
- simulação;
- conteúdo narrativo real;
- geometria de mapa;
- implementação de objectives/actions.

## Evidência pendente
Aguardar CI em checkout limpo e revisão independente.
