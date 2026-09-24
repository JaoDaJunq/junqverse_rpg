# Revisão independente T015

- Resultado: APPROVED
- Workflow: 35955252488

## Verificado
- checkpoint e estados anteriores não são mutados;
- gerações crescem monotonicamente;
- recursos e ultimate do checkpoint são restaurados;
- efeitos antigos são removidos;
- restart após pause devolve controle;
- restart sempre parte do snapshot inicial;
- fluxo de navegador retry/return mantém uma única scene/canvas.
