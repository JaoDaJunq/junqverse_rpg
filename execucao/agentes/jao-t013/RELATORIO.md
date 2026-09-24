# Relatório do agente Jão avançado

- Papel: herói Jão
- Ticket: T013
- Branch: agent/t013-jao-kit
- Estado: IN_PROGRESS até CI e revisão
- Dependência: T012 DONE

## Implementado
### W Dedução
- raio 240 px;
- reveal por 300 ticks;
- vulnerable por 180 ticks nos hostis vivos dentro da área.

### E Corte da Aurora
- carga mínima 12 ticks e máxima 60;
- dano linear 40–80;
- movimento durante carga ×0,5;
- mira travada desde o início da carga;
- durante Campo Absoluto atinge carga máxima em 12 ticks;
- detona Ressonância reutilizando o sistema T011.

### R Campo Absoluto
- custo de 100 ultimate;
- duração 360 ticks;
- haste exclusiva do kit +20%;
- reset único do cooldown de Q na ativação;
- recast inválido não aplica novo reset;
- básico com cadência ×0,8;
- buff removido ao morrer;
- nenhum time scale global.

## Apresentação
heroVfx.ts expõe apenas afterimage/local motion emphasis. Não existe controle de relógio global no VFX.

## Testes
tests/jao-advanced.test.ts cobre:
- números oficiais W/E/R;
- W radius/vulnerable;
- release mínimo/máximo de E;
- dano 40/60/80;
- E full charge em 0,2 s sob R;
- E detonando Ressonância;
- Q reset único;
- mundo permanecendo 60 ticks/s;
- cadência acelerada do básico;
- remoção do buff na morte;
- movimento de carga em 50%.

## Fora de escopo
- T014 IA;
- integração completa de W/E/R no protótipo visual;
- HUD final;
- gate P0.
