# Contexto mínimo do JUNQVERSE
Leia este arquivo no início de cada sessão de execução. Versão 1.0 do planejamento.

## Produto
JUNQVERSE: Ecos do Vale é um RPG de ação 2D, visão superior, no navegador de computador, em português brasileiro. Combate por WASD, mouse para mirar/atacar, habilidades 1/2/3/R, Espaço para esquiva e F para interação. Q/W/E são nomes de slots na documentação; atalhos padrão: 1/2/3. **W de movimento não conflita com W de habilidade.** Remapeamento permitido; a interface exibe a tecla real.

Campanha em Valea, cidade atravessada por ecos de realidades alternativas. Protagonistas recuperam âncoras de memória e impedem o Curador de congelar o mundo. Refúgio é o hub. Não existe mundo aberto.

## Escopo fechado
P0: protótipo de Jão. P1/v0.1: quatro heróis e M01 completa. P2/v1.0: cinco heróis, oito missões principais M01–M08, dez opcionais S01–S10, três chefes, final e epílogo. P3/v1.1: coop privado 1–4. P4/v1.2: arena privada 3v3 com bots. Thomas libera em M03; nenhum conteúdo obrigatório exige um herói específico. Solo controla um herói por missão, sem companheiros de combate.

## Base técnica
TypeScript estrito; Phaser 3.90.0 apenas para renderização, áudio e entrada; Vite para build; npm workspaces; simulação pura em packages/sim; dados em packages/content; Vitest e Playwright para riscos concretos. Não usar Arcade Physics como segunda autoridade do movimento. Tick fixo de 60 Hz no solo e servidor. Multiplayer posterior via Node e Colyseus encapsulado em adaptador. Servidor autoritativo: não confiar em dano, posição ou recompensas do cliente.

## Invariantes
- Unidades: pixels do mundo e ticks inteiros. 32 px por tile. 60 ticks = 1 s.
- Arte pode ser substituída; IDs de dados não mudam.
- Save local versionado; conclusão e recompensa idempotentes.
- Estado narrativo não é timer de UI nem tween do Phaser.
- Campanha e arena têm configurações separadas de balanceamento.
- Sem login, banco remoto ou cobrança até v1.0.
- Todos os tickets começam TODO; dependências precisam de evidência.
- Não migrar motor, adicionar framework de UI ou reescrever sistemas sem tarefa.
- Simulação não importa DOM, Phaser, rede nem relógio real.
- Pause congela solo; menu nunca pausa sala online.
- Preservar arquivos e mudanças anteriores.

## Ordem de autoridade
Instrução explícita do usuário > AGENTS > contrato específico do sistema > tarefa > exemplo. Em divergência, registrar conflito; não substituir regra silenciosamente. Exemplos são sementes do formato, não cobertura completa.

## Sessão econômica
Ler AGENTS, este contexto, STATUS, tarefa e suas referências. Procurar símbolos com rg; abrir apenas módulos relacionados. Implementar uma tarefa, verificar critérios, atualizar STATUS/HANDOFF e encerrar. Não alegar teste executado sem comando e resultado. Não ler o pacote inteiro a cada turno.
