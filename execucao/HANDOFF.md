# Passagem de contexto

## Estado atual
T001-T010 estão concluídas e aprovadas por revisão independente.

## Protótipo visual
T007 mantém movimentação visual, colisão, câmera e pausa.

## Combate genérico atual
T008:
- cast, foco, cooldown, dodge, attackInstanceId.

T009:
- dano, shield, cura e estados.

T010:
- projétil swept contra alvos/parede;
- cone com linha de visão;
- zonas com pulsos por tick;
- HitRegistry por ataque/pulso;
- cleanup de transient effects por owner/sala.

## Evidência T010
- CI geral: 35901294567 PASS.
- revisão independente: 35901430269 PASS.

## Próxima tarefa
T011 - marcas e detonação de Ressonância.

Após T011 DONE, T012 fica liberada para o básico/passiva/Q do Jão.
