import { describe, expect, it } from 'vitest';
import type { EventEnvelope } from '../packages/protocol/src/index.js';
import {
  applyBasicObjectiveEvent,
  compileBasicObjective,
  createBasicObjectiveState,
  isBasicObjectiveComplete,
  stepBasicObjectiveTime
} from '../packages/sim/src/index.js';

function event(
  eventId: string,
  type: EventEnvelope['type'],
  payload: EventEnvelope['payload'],
  runId = 'run_1'
): EventEnvelope {
  return {
    eventId,
    tick: 1,
    runId,
    type,
    payload
  };
}

describe('T018 basic quest objectives', () => {
  it('rejects duplicate authored target ids', () => {
    expect(() => compileBasicObjective({
      type: 'collect',
      itemIds: ['eco_a', 'eco_a'],
      requiredCount: 2
    })).toThrow('unique ids');

    expect(() => compileBasicObjective({
      type: 'interact',
      targetIds: ['marco_a', 'marco_a'],
      requiredCount: 2,
      holdTicks: 120
    })).toThrow('unique ids');
  });

  it('does not count a duplicated event or the same collected item twice', () => {
    const objective = compileBasicObjective({
      type: 'collect',
      itemIds: ['eco_a', 'eco_b'],
      requiredCount: 2
    });
    let state = createBasicObjectiveState(objective);

    const first = event(
      'event_collect_a',
      'item_collected',
      { itemId: 'eco_a' }
    );
    state = applyBasicObjectiveEvent(
      objective,
      state,
      first,
      'run_1'
    );
    expect(state.node.matchedIds).toEqual(['eco_a']);
    expect(isBasicObjectiveComplete(state)).toBe(false);

    const duplicateEventState = applyBasicObjectiveEvent(
      objective,
      state,
      first,
      'run_1'
    );
    expect(duplicateEventState).toBe(state);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_collect_a_again',
        'item_collected',
        { itemId: 'eco_a' }
      ),
      'run_1'
    );
    expect(state.node.matchedIds).toEqual(['eco_a']);
    expect(isBasicObjectiveComplete(state)).toBe(false);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_collect_b',
        'item_collected',
        { itemId: 'eco_b' }
      ),
      'run_1'
    );
    expect(state.node.matchedIds).toEqual([
      'eco_a',
      'eco_b'
    ]);
    expect(isBasicObjectiveComplete(state)).toBe(true);
  });

  it('tracks unique interactions until requiredCount is satisfied', () => {
    const objective = compileBasicObjective({
      type: 'interact',
      targetIds: ['marco_a', 'marco_b'],
      requiredCount: 2,
      holdTicks: 120
    });
    let state = createBasicObjectiveState(objective);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_marco_a',
        'interaction_completed',
        { targetId: 'marco_a' }
      ),
      'run_1'
    );
    expect(isBasicObjectiveComplete(state)).toBe(false);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_marco_b',
        'interaction_completed',
        { targetId: 'marco_b' }
      ),
      'run_1'
    );
    expect(isBasicObjectiveComplete(state)).toBe(true);
  });

  it('completes enter_area only for the authored area and run', () => {
    const objective = compileBasicObjective({
      type: 'enter_area',
      areaId: 'praca_centro'
    });
    let state = createBasicObjectiveState(objective);

    const otherRun = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_area_other_run',
        'area_entered',
        { areaId: 'praca_centro' },
        'run_2'
      ),
      'run_1'
    );
    expect(otherRun).toBe(state);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_wrong_area',
        'area_entered',
        { areaId: 'rua_lateral' }
      ),
      'run_1'
    );
    expect(isBasicObjectiveComplete(state)).toBe(false);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_right_area',
        'area_entered',
        { areaId: 'praca_centro' }
      ),
      'run_1'
    );
    expect(isBasicObjectiveComplete(state)).toBe(true);
  });

  it('completes defeat only when its encounter is explicitly cleared', () => {
    const objective = compileBasicObjective({
      type: 'defeat',
      encounterId: 'enc_m01_ecos'
    });
    let state = createBasicObjectiveState(objective);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_enemy_1',
        'entity_died',
        {
          encounterId: 'enc_m01_ecos',
          encounterCleared: false
        }
      ),
      'run_1'
    );
    expect(isBasicObjectiveComplete(state)).toBe(false);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_other_encounter',
        'entity_died',
        {
          encounterId: 'enc_other',
          encounterCleared: true
        }
      ),
      'run_1'
    );
    expect(isBasicObjectiveComplete(state)).toBe(false);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_last_enemy',
        'entity_died',
        {
          encounterId: 'enc_m01_ecos',
          encounterCleared: true
        }
      ),
      'run_1'
    );
    expect(isBasicObjectiveComplete(state)).toBe(true);
  });

  it('supports all and any composition without double-applying events', () => {
    const allObjective = compileBasicObjective({
      type: 'all',
      children: [
        {
          type: 'collect',
          itemIds: ['eco_relogio'],
          requiredCount: 1
        },
        {
          type: 'defeat',
          encounterId: 'enc_m01_ecos'
        }
      ]
    });
    let allState = createBasicObjectiveState(allObjective);

    allState = applyBasicObjectiveEvent(
      allObjective,
      allState,
      event(
        'event_collect',
        'item_collected',
        { itemId: 'eco_relogio' }
      ),
      'run_1'
    );
    expect(isBasicObjectiveComplete(allState)).toBe(false);

    allState = applyBasicObjectiveEvent(
      allObjective,
      allState,
      event(
        'event_clear',
        'entity_died',
        {
          encounterId: 'enc_m01_ecos',
          encounterCleared: true
        }
      ),
      'run_1'
    );
    expect(isBasicObjectiveComplete(allState)).toBe(true);

    const anyObjective = compileBasicObjective({
      type: 'any',
      children: [
        {
          type: 'enter_area',
          areaId: 'rota_a'
        },
        {
          type: 'enter_area',
          areaId: 'rota_b'
        }
      ]
    });
    const anyState = applyBasicObjectiveEvent(
      anyObjective,
      createBasicObjectiveState(anyObjective),
      event(
        'event_route_b',
        'area_entered',
        { areaId: 'rota_b' }
      ),
      'run_1'
    );
    expect(isBasicObjectiveComplete(anyState)).toBe(true);
  });

  it('rejects more than two levels of composite objectives', () => {
    expect(() => compileBasicObjective({
      type: 'all',
      children: [{
        type: 'any',
        children: [{
          type: 'all',
          children: [{
            type: 'enter_area',
            areaId: 'deep_area'
          }]
        }]
      }]
    })).toThrow('at most two levels');
  });

  it('advances survive only with simulation ticks and freezes while paused', () => {
    const objective = compileBasicObjective({
      type: 'survive',
      durationTicks: 120,
      encounterId: 'enc_survive'
    });
    let state = createBasicObjectiveState(objective);

    state = stepBasicObjectiveTime(
      objective,
      state,
      60
    );
    expect(state.node.elapsedTicks).toBe(60);
    expect(isBasicObjectiveComplete(state)).toBe(false);

    const paused = stepBasicObjectiveTime(
      objective,
      state,
      600,
      true
    );
    expect(paused).toBe(state);
    expect(paused.node.elapsedTicks).toBe(60);

    state = stepBasicObjectiveTime(
      objective,
      state,
      60
    );
    expect(state.node.elapsedTicks).toBe(120);
    expect(isBasicObjectiveComplete(state)).toBe(true);

    const frozenAfterCompletion = stepBasicObjectiveTime(
      objective,
      state,
      100
    );
    expect(frozenAfterCompletion).toBe(state);
  });

  it('advances survive inside all composition without touching event progress', () => {
    const objective = compileBasicObjective({
      type: 'all',
      children: [
        {
          type: 'survive',
          durationTicks: 30,
          encounterId: 'enc_wave'
        },
        {
          type: 'enter_area',
          areaId: 'safe_zone'
        }
      ]
    });
    let state = createBasicObjectiveState(objective);

    state = stepBasicObjectiveTime(
      objective,
      state,
      30
    );
    expect(state.node.children[0]?.completed).toBe(true);
    expect(state.node.children[1]?.completed).toBe(false);
    expect(isBasicObjectiveComplete(state)).toBe(false);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_safe_zone',
        'area_entered',
        { areaId: 'safe_zone' }
      ),
      'run_1'
    );
    expect(isBasicObjectiveComplete(state)).toBe(true);
  });

  it('rejects zero-duration survive objectives', () => {
    expect(() => compileBasicObjective({
      type: 'survive',
      durationTicks: 0,
      encounterId: 'enc_invalid'
    })).toThrow('durationTicks must be positive');
  });


  it('completes sequence only in authored order', () => {
    const objective = compileBasicObjective({
      type: 'sequence',
      targetIdsOrdered: [
        'placa_lua',
        'placa_ponte',
        'placa_janela'
      ],
      resetOnError: true
    });
    let state = createBasicObjectiveState(objective);

    for (const [index, targetId] of [
      'placa_lua',
      'placa_ponte',
      'placa_janela'
    ].entries()) {
      state = applyBasicObjectiveEvent(
        objective,
        state,
        event(
          `event_sequence_${index}`,
          'interaction_completed',
          { targetId }
        ),
        'run_1'
      );
    }

    expect(state.node.matchedIds).toEqual([
      'placa_lua',
      'placa_ponte',
      'placa_janela'
    ]);
    expect(isBasicObjectiveComplete(state)).toBe(true);
  });

  it('resets only the sequence child when an authored target is pressed out of order', () => {
    const objective = compileBasicObjective({
      type: 'all',
      children: [
        {
          type: 'collect',
          itemIds: ['eco_guardado'],
          requiredCount: 1
        },
        {
          type: 'sequence',
          targetIdsOrdered: [
            'antena_b',
            'antena_a',
            'antena_c'
          ],
          resetOnError: true
        }
      ]
    });
    let state = createBasicObjectiveState(objective);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_collect_guardado',
        'item_collected',
        { itemId: 'eco_guardado' }
      ),
      'run_1'
    );
    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_antena_b',
        'interaction_completed',
        { targetId: 'antena_b' }
      ),
      'run_1'
    );

    expect(state.node.children[0]?.completed).toBe(true);
    expect(state.node.children[1]?.matchedIds).toEqual([
      'antena_b'
    ]);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_antena_c_wrong',
        'interaction_completed',
        { targetId: 'antena_c' }
      ),
      'run_1'
    );

    expect(state.node.children[0]?.completed).toBe(true);
    expect(state.node.children[0]?.matchedIds).toEqual([
      'eco_guardado'
    ]);
    expect(state.node.children[1]?.completed).toBe(false);
    expect(state.node.children[1]?.matchedIds).toEqual([]);
    expect(isBasicObjectiveComplete(state)).toBe(false);
  });

  it('ignores unrelated interactions instead of resetting sequence progress', () => {
    const objective = compileBasicObjective({
      type: 'sequence',
      targetIdsOrdered: ['a', 'b'],
      resetOnError: true
    });
    let state = createBasicObjectiveState(objective);

    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_a',
        'interaction_completed',
        { targetId: 'a' }
      ),
      'run_1'
    );
    state = applyBasicObjectiveEvent(
      objective,
      state,
      event(
        'event_unrelated',
        'interaction_completed',
        { targetId: 'npc_random' }
      ),
      'run_1'
    );

    expect(state.node.matchedIds).toEqual(['a']);
  });

});
