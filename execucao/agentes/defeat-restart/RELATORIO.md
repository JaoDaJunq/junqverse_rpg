# Relatório do agente T015

- Papel: defeat/restart
- Ticket: T015
- Branch: agent/t015-defeat-restart
- Estado: IN_PROGRESS até CI e revisão
- Dependências: T007, T013 e T014 DONE

## Implementado
### Simulação
- EncounterCheckpoint imutável;
- EncounterState por geração;
- derrota encerra HP, shields, status, cast, esquiva/transientes;
- remove inimigos ativos, projéteis, zonas, hit registry e Ressonância da instância;
- restart reconstrói o checkpoint;
- vida/foco/esquiva cheios;
- ultimate restaurada ao valor do checkpoint;
- cooldowns e transientes limpos.

### Sessão local
- LocalSession mantém cópia do snapshot inicial;
- restart reseta tick, posição, acumulador e pausa;
- input é limpo;
- sessão parada não pode ser ressuscitada.

### UI
- DefeatPanel DOM semântico com Tentar novamente e Retornar;
- retry reinicia a sala dentro da sessão;
- retornar reinicia a scene inteira, exercitando cleanup de listeners;
- sala técnica oferece gatilho K em DEV ou ?debugDefeat=1 para teste real antes do combate visual estar integrado.

## Testes
- estado sujo é finalizado na derrota;
- checkpoint restaura recursos e ultimate;
- 10 reinícios consecutivos não acumulam artefatos;
- derrota repetida é idempotente;
- checkpoint rejeita enemy IDs duplicados;
- LocalSession reinicia 10x sem duplicar entidade;
- sessão stopped não reinicia;
- Playwright abre painel, usa retry e return e mantém um único canvas.

## Fora de escopo
- dano visual disparando derrota automaticamente;
- HUD T016;
- gate integrado T017.

## Evidência pendente
Aguardar CI e revisão independente.
