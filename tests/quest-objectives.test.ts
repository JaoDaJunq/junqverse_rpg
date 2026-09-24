import { describe, expect, it } from 'vitest';
import type { EventEnvelope } from '../packages/protocol/src/index.js';
import {
  applyBasicObjectiveEvent,
  compileBasicObjective,
  createBasicObjectiveState,
  isBasicObjectiveComplete
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
});
