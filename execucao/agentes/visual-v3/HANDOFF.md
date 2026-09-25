# HANDOFF — T017 Visual V3 / Personagem Teste

## Objetivo

Criar uma camada de laboratório visual e de gameplay dentro do Gate P0 sem descaracterizar o kit oficial do Jão.

A partir deste handoff existem dois papéis distintos:

- **Jão**: herói oficial do protótipo, com kit e comportamento preservados.
- **Teste**: personagem jogável de laboratório, criado para experimentar assets, VFX, telegraphs, animações e golpes novos antes de promover qualquer ideia para personagens oficiais.

O Visual V3 deve aproveitar de forma agressiva os assets já disponíveis no repositório e no pack Pixel Crawler, evitando continuar com apresentação excessivamente baseada em Graphics/linhas de debug quando existe sprite/efeito utilizável.

---

## Princípios

1. Não alterar regras oficiais do kit do Jão apenas para testar estética.
2. Toda mecânica experimental nova deve nascer primeiro no personagem Teste.
3. Não usar telegraph que contradiga a hitbox real.
4. VFX deve reforçar leitura, não substituir regra de combate.
5. Assets temporários devem continuar isolados de contratos de gameplay.
6. Manter fallback visual simples caso um asset falhe.
7. Assets de terceiros só entram no repo quando a licença permitir redistribuição.
8. Pimen permanece referência visual, não asset vendorizado.
9. Pixel Crawler e Brackeys VFX podem ser usados como scaffolding temporário conforme THIRD_PARTY.md.
10. Nenhuma mudança deste V3 pode marcar a T017 como DONE sem o playtest humano.

---

# Entrega 1 — seletor de personagem

Adicionar seletor fixo no topo da tela:

```text
[ JÃO ] [ TESTE ]
```

## Regras

- Jão selecionado por padrão.
- Clique em Teste reinicia apenas a sessão de protótipo usando o kit Teste.
- Clique em Jão retorna ao herói oficial.
- Seleção deve ser visualmente óbvia.
- Trocar personagem não pode criar canvas, HUD, listeners ou entidades duplicadas.
- Não usar reload completo da página.
- Reiniciar estado de vida, recursos, cooldowns, posição e inimigos ao trocar.

## Arquivos prováveis

- `apps/client/src/scenes/ExpeditionScene.ts`
- novo `apps/client/src/ui/HeroSelector.ts`
- `apps/client/src/ui/styles.css`
- `apps/client/src/adapters/LocalSession.ts`
- `apps/client/src/presentation/hud-model.ts`

---

# Entrega 2 — personagem jogável Teste

Criar um herói separado do Jão.

ID sugerido:

```text
prototype_test_hero
```

Nome de UI:

```text
Teste
```

## Objetivo do personagem

Validar:

- animações;
- hit feedback;
- dash;
- projétil;
- cone;
- AoE;
- charge;
- afterimage;
- partículas;
- telegraph;
- combinações de cor;
- sensação de impacto.

Não criar lore, progressão, balanceamento final ou documentação narrativa.

---

# Entrega 3 — visual do Teste usando assets reais

Escolher uma silhueta diferente do Jão.

Prioridade no Pixel Crawler:

1. Orc Rogue para leitura ágil;
2. Orc Shaman para leitura de caster;
3. Orc Warrior se o laboratório precisar validar ataques pesados.

Preferência inicial: **Orc Rogue** como sprite do Teste.

Motivo:
- silhueta mais distinta do Body_A usado no Jão;
- boa leitura de movimento;
- combina com dash/projétil/slash;
- facilita distinguir visualmente Jão x Teste.

## Assets adicionais que podem ser usados

Pixel Crawler:
- Dungeon Props;
- Esoteric;
- Rocks;
- Shadows;
- Orc Crew;
- Skeleton Crew;
- demais props estáticos coerentes com arena.

Brackeys VFX:
- slash;
- spark;
- magic;
- circle;
- impact;
- electric ring;
- charge;
- outros CC0 do bundle quando úteis.

Não baixar outro pack antes de esgotar esses recursos.

---

# Entrega 4 — kit experimental do Teste

O Teste deve ter um kit simples, visual e deliberadamente experimental.

## Básico — Corte de Laboratório

Entrada:
- mouse esquerdo.

Comportamento:
- ataque frontal curto;
- sem custo;
- cadência simples.

Visual:
- usar sprite/textura de slash real;
- flash curto;
- pequena faísca no contato;
- telegraph técnico opcional apenas em debug.

Objetivo:
- validar sensação de ataque comum sem depender de polígono branco permanente.

---

## Skill 1 — Dash Cortante

Entrada:
- tecla 1.

Comportamento:
- dash direcional;
- dano em inimigos atravessados ou no final, conforme implementação escolhida;
- distância inicial de laboratório entre 140 e 180 px.

Visual obrigatório:
- **trail atrás do personagem**;
- afterimages atrás;
- faísca na origem;
- impacto na chegada;
- nunca desenhar uma faixa rígida saindo da frente do personagem.

Objetivo visual:

```text
origem   ghost   ghost   Teste
  ✦  .........  .........  ⚡
```

A linha azul atual do Q do Jão não deve ser reutilizada como trail.

---

## Skill 2 — Nova Arcana

Entrada:
- tecla 2.

Comportamento:
- AoE circular ao redor do Teste;
- aplicação de dano ou status simples;
- raio inicial de laboratório entre 120 e 180 px.

Visual:
- magic texture;
- electric ring / circle;
- pulso que expande;
- brilho curto no caster;
- contorno da área deve aparecer apenas durante windup/telegraph.

Objetivo:
- validar AoE radial real usando assets, não apenas Graphics.

---

## Skill 3 — Corte Energético

Entrada:
- tecla 3.

Comportamento:
- cone direcionado;
- pode ter charge curto;
- dano aumenta com carga, se simples de implementar.

Visual:
- charge asset durante preparação;
- cone apenas como telegraph;
- slash grande no release;
- impacto nos alvos;
- cor inicial: dourado + branco + azul elétrico.

Objetivo:
- validar diferença clara entre telegraph e VFX do hit.

---

## Ultimate R — Sobrecarga Experimental

Entrada:
- R.

Comportamento:
- estado temporário de poder;
- não precisa ser balanceado como herói final.

Visual:
- aura;
- electric ring curto na ativação;
- partículas;
- afterimages;
- maior ênfase de velocidade;
- impactos mais brilhantes;
- sem círculo gigante persistente sugerindo AoE se não houver AoE real.

Objetivo:
- laboratório para estados temporários de power-up.

---

# Entrega 5 — arena Visual V3

A arena atual deve deixar de parecer um retângulo vazio com blockers desenhados.

## Regras

- manter exatamente os blockers autoritativos da sim;
- decoração não pode criar colisão invisível;
- props devem respeitar áreas navegáveis;
- não esconder player/inimigo;
- usar depth consistente.

## Composição sugerida

### Bordas
- pedras;
- props de dungeon;
- colunas;
- decoração escura.

### Centro
- área relativamente limpa para combate;
- 1 elemento focal esotérico que não bloqueie;
- marcas/props leves no chão.

### Laterais
- pequenos clusters de props;
- objetos com sombras;
- variação suficiente para quebrar repetição.

### Elementos esotéricos
Usar como identidade temporária do laboratório:
- azul;
- violeta;
- dourado.

Evitar distribuir props aleatoriamente. Cada cluster deve parecer intencional.

---

# Entrega 6 — inimigos temporários mais legíveis

O Eco Rasteiro não precisa permanecer visualmente como único skeleton genérico.

Mapeamento temporário sugerido:

- `eco_rasteiro` → Skeleton ou Orc base;
- futuro melee pesado → Orc Warrior;
- futuro ranged → Orc Rogue;
- futuro caster → Orc Shaman.

## Regras

- arquétipo visual deve comunicar função;
- manter IDs e regras da simulação;
- trocar apenas apresentação;
- health/debug state pode permanecer no P0;
- preparar estrutura para sprite diferente por archetype.

---

# Entrega 7 — HUD de laboratório

O HUD deve conseguir mostrar Jão ou Teste sem hardcode visual excessivo.

## Jão

```text
[1] Passo
[2] Dedução
[3] Aurora
[R] Campo
```

## Teste

```text
[1] Dash
[2] Nova
[3] Corte
[R] Sobrecarga
```

## Direção de UI

- tecla como badge pequeno;
- nome da skill como identidade;
- cooldown sobre o slot;
- borda/cor própria por skill;
- nada de `Q [1]`, `W [2]` etc.;
- manter HUD técnico de vida/foco/ult durante P0.

---

# Entrega 8 — corrigir leitura do dash do Jão

Mesmo com o Teste criado, corrigir o feedback atual do Passo Relâmpago.

## Problema atual

A faixa azul aparece rígida à frente/grudada no Jão e pode parecer uma lança.

## Correção

Durante dash:
- remover ou reduzir a faixa sólida frontal;
- usar afterimages;
- usar spark na origem e chegada;
- usar trail curto atrás;
- se área técnica precisar ser exibida, mostrar somente em debug mode.

O Jão deve parecer que se deslocou rapidamente, não que projetou uma barra azul.

---

# Estrutura técnica sugerida

Não criar um segundo jogo.

Introduzir um discriminador de herói no protótipo:

```ts
type PrototypeHeroId = 'jao' | 'test';
```

Separar:

- definição do kit;
- criação do estado;
- HUD;
- apresentação;
- resolução de skills.

Evitar duplicar `LocalSession` inteira.

Possível estrutura:

```text
packages/sim/src/prototype-heroes/
  jao-prototype.ts
  test-prototype.ts

apps/client/src/presentation/heroes/
  JaoPresentation.ts
  TestHeroPresentation.ts
```

Não fazer refactor grande se uma interface menor resolver.

---

# Ordem de execução obrigatória

## V3.1 — seleção + sprite Teste
1. criar `PrototypeHeroId`;
2. criar seletor Jão/Teste;
3. Teste usa sprite diferente;
4. troca reinicia sessão sem duplicação;
5. CI.

## V3.2 — kit Teste básico + Skill 1
1. básico com slash real;
2. Dash Cortante;
3. afterimages/trail correto;
4. testes direcionados;
5. CI.

## V3.3 — Skill 2 + Skill 3
1. Nova Arcana;
2. Corte Energético;
3. telegraph separado do hit VFX;
4. CI.

## V3.4 — ultimate Teste
1. Sobrecarga;
2. aura;
3. electric ring;
4. afterimages;
5. CI.

## V3.5 — arena + inimigo
1. usar mais props reais;
2. composição visual;
3. apresentação por archetype;
4. preservar blockers;
5. CI + Playwright.

## V3.6 — correção do dash do Jão
1. remover leitura de lança;
2. trail/afterimage atrás;
3. manter lógica de Q intacta;
4. CI.

## V3.7 — playtest
Testar Jão e Teste na mesma build.

---

# Critérios de pronto do Visual V3

- [ ] seletor Jão/Teste funciona;
- [ ] troca não duplica canvas/listeners/entidades;
- [ ] Jão mantém gameplay oficial atual;
- [ ] Teste possui básico + 1/2/3/R funcionais;
- [ ] Teste utiliza assets visuais reais do conjunto disponível;
- [ ] dash do Teste possui trail/afterimage atrás;
- [ ] Q do Jão deixa de parecer uma lança;
- [ ] arena utiliza props do Pixel Crawler de forma perceptível;
- [ ] inimigo temporário tem leitura visual melhor;
- [ ] HUD muda nomes conforme personagem;
- [ ] telegraphs não contradizem hitboxes;
- [ ] VFX não alteram determinismo da simulação;
- [ ] typecheck PASS;
- [ ] lint PASS;
- [ ] suíte Vitest PASS;
- [ ] build PASS;
- [ ] Playwright PASS;
- [ ] playtest manual compara Jão x Teste.

---

# Fora do escopo

- arte final do Jão;
- lore do Teste;
- progressão permanente do Teste;
- save do personagem selecionado;
- balanceamento competitivo;
- M01;
- multiplayer;
- novos packs pagos;
- promoção automática de skills do Teste para heróis oficiais.

---

# Decisão de produto

O personagem Teste é uma ferramenta de desenvolvimento dentro do protótipo.

Nenhuma skill experimental se torna parte de um personagem oficial apenas porque ficou visualmente boa. Para promover uma ideia, criar ticket próprio com:
1. objetivo de gameplay;
2. herói alvo;
3. números;
4. revisão;
5. playtest.

---

# Estado de entrada

Branch: `agent/t017-combat-gate`
Head antes deste handoff: `31201fd77c28ad348c8dff6dbcee08a14a8edb43`
T017: REVIEW.
T018/T019/T020 já estão integradas à branch via sincronização com main.


---

# Implementação V3.1 — laboratório configurável

Estado: IMPLEMENTADO / CI VERDE

Commits principais:
- `13a05f7bee23411c213469864aed83e8d5788e85` — seletor, personagem Teste e catálogo configurável;
- `edc7254ed4a0be28d6b2ee006f38709273cfef91` — catálogo interativo expandido;
- `158a7ec51a5c69b0cc67fab8cf2d7ca34a1e66d0` — UI usa teclas reais 1/2/3/R.

CI final: `36070313166` PASS.

## Disponível no laboratório
- seletor `JÃO / TESTE`;
- Teste usa Orc Rogue temporário;
- slots visíveis: BÁSICO / 1 / 2 / 3 / R;
- catálogo de skills do laboratório;
- catálogo de 7 presets de efeito;
- efeito configurável individualmente por slot;
- resumo das associações atuais;
- botão PREVIEW EFEITO;
- botão RODAR TODOS;
- botão RESET VFX;
- configuração persistida em localStorage;
- efeitos configurados são usados ao executar a skill correspondente;
- Jão permanece com apresentação própria e separado do laboratório.

## Presets iniciais
- Slash Branco;
- Faísca Azul;
- Magia Violeta;
- Anel Ciano;
- Impacto Dourado;
- Combo Arcano;
- Combo Elétrico.

## Observação
A mecânica do Teste nesta primeira iteração reutiliza os arquétipos já validados do protótipo:
- básico frontal;
- dash;
- pulso radial;
- cone carregável;
- estado de poder.

O próximo incremento do laboratório pode adicionar novos comportamentos reais, começando por projétil/orbe, sem alterar o kit oficial do Jão.

---

# Implementação V3.2 — sprites oficiais do Jão

Estado: IMPLEMENTADO / CI VERDE

Branch: `agent/t017-jao-sprites`
PR: #26

## Entrega
- atlas transparente gerado a partir das folhas fornecidas pelo MVP;
- idle: Down / Up / Left / Right;
- corrida: Down / Up / Left / Right;
- ataque básico: Down / Up / Left / Right;
- Passo Relâmpago: Down / Up / Side, com flip para esquerda;
- Dedução: Down / Up / Side, com flip para esquerda;
- Corte da Aurora: charge + release em Down / Up / Side;
- Campo Absoluto: activation + active loop + exit em Down / Up / Side;
- transições visuais temporárias duplicadas do Jão foram desativadas; telegraphs continuam ativos;
- personagem Teste e laboratório permanecem isolados.

## Atlas
- arquivo: `apps/client/public/assets/jao/jao_actions_atlas.webp`;
- 146 frames úteis;
- célula: 88x64;
- fundo verde removido e transparência preservada.

## Limitação conhecida
Não foi fornecida uma folha corporal exclusiva de esquiva. A esquiva continua usando o movimento autoritativo existente sem inventar uma animação nova.

## Gate
T017 continua em REVIEW. O playtest humano de 5 minutos ainda é obrigatório.

## Evidência automatizada V3.2
- CI `36093130320`: PASS;
- typecheck: PASS;
- lint: PASS;
- testes: PASS;
- planning integrity: PASS;
- content gate: PASS;
- build: PASS;
- Playwright / preview smoke: PASS.

A validação automatizada não substitui o playtest humano final da T017.


## Ajuste V3.2.1 — escala e nitidez

Feedback visual humano inicial:
- Jão estava grande demais no mapa;
- canvas redimensionado pelo navegador apresentava aparência borrada/baixa nitidez.

Correções:
- escala do Jão reduzida de `2.5` para `1`, preservando o tamanho do personagem Teste;
- `image-rendering: pixelated` + `crisp-edges` aplicado ao canvas;
- `canvasStyle: image-rendering: pixelated` e `antialiasGL: false` reforçados na configuração Phaser;
- nenhuma regra de combate ou código de `packages/sim` foi alterado.

Evidência automatizada do commit de código `a5d4ded9cfb414133cf9a85d3255404bdc74294b`:
- P0 CI `36132230504`: PASS;
- dependency audit: PASS;
- typecheck: PASS;
- lint: PASS;
- tests: PASS;
- planning integrity: PASS;
- content gate: PASS;
- build: PASS;
- Playwright / preview smoke: PASS.

A validação visual humana do novo tamanho/nitidez ainda é necessária.


## Ajuste V3.2.2 — suavização de render

Feedback visual humano:
- após corrigir o tamanho, o Jão ainda aparentava pixelização excessiva.

Correções aplicadas no código:
- resolução interna do cliente elevada de `960x540` para `1200x675`;
- removido o `image-rendering: pixelated/crisp-edges` forçado no canvas;
- configuração Phaser passou a usar `smoothPixelArt: true`;
- textura `jao-actions-sheet` usa filtro LINEAR explicitamente;
- escala do Jão permanece em `1`, sem reintroduzir o problema de personagem gigante;
- nenhuma alteração em `packages/sim` ou regras de combate.

Observação:
- foi preparado fora do runtime um atlas 2x derivado das folhas originais para uma futura troca de asset, mas esta rodada corrige primeiro o pipeline de render sem substituir binário por conveniência.
- validação visual humana continua necessária.


## Ajuste V3.2.3 — atlas 2x e render final

O ajuste V3.2.2 teve uma tentativa intermediária com `smoothPixelArt`, rejeitada pelo TypeScript no CI `36136108872`. Essa configuração não ficou no estado final.

Estado final aplicado:
- atlas do Jão substituído por versão 2x, lossless, derivada das folhas originais;
- mesmo arquivo lógico: `apps/client/public/assets/jao/jao_actions_atlas.webp`;
- célula passou de `88x64` para `176x128`;
- escala visual do Jão passou de `1` para `0.5`, mantendo aproximadamente o mesmo tamanho na cena com mais informação por frame;
- resolução interna do cliente: `1200x675`;
- `pixelArt: false`, `antialias: true` e `antialiasGL: true`;
- filtro LINEAR aplicado à textura do atlas do Jão;
- removido o `image-rendering: pixelated/crisp-edges` forçado no canvas;
- mapeamento dos 146 frames e lógica de combate preservados;
- nenhuma alteração em `packages/sim`.

Evidência do commit de código/asset `50f13d3d408c412675b9ff5350f9537849a85055`:
- P0 CI `36136422578`: PASS;
- dependency audit: PASS;
- typecheck: PASS;
- lint: PASS;
- tests: PASS;
- planning integrity: PASS;
- content gate: PASS;
- build: PASS;
- Playwright / preview smoke: PASS.

Pendência real:
- conferir visualmente em hardware real se a nova combinação atlas 2x + escala 0.5 atingiu nitidez/tamanho desejados;
- T017 continua REVIEW até o playtest humano de 5 minutos.


## Ajuste V3.2.4 — movimento reconstruído da fonte

Feedback humano: o atlas 2x anterior ainda apresentava pixelização perceptível.

Correção aplicada:
- descartado o upscale do atlas intermediário para idle/corrida;
- idle e corrida agora são reconstruídos diretamente dos PNGs originais enviados pelo MVP;
- atlas dedicado de movimento preserva amostragem de alta resolução antes da redução em tela;
- render Phaser usa resolução interna 2x, antialias e filtro LINEAR;
- ações de combate continuam no atlas já integrado enquanto esta correção visual é validada;
- nenhuma alteração em packages/sim.

Validação automatizada desta rodada: pendente de CI.
Validação visual humana: pendente.
