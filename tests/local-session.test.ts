import { describe, expect, it } from 'vitest';
import type { InputFrame } from '../packages/protocol/src/index.js';
import {
  applyPrototypeEnemyAttacks,
  createPrototypeWorld
} from '../packages/sim/src/index.js';
import {
  LocalSession,
  type SessionInputSource
} from '../apps/client/src/adapters/LocalSession.js';

class ConstantInput implements SessionInputSource {
  public clears = 0;

  public constructor(
    private readonly moveX: number,
    private readonly moveY: number
  ) {}

  public nextFrame(clientTick: number): InputFrame {
    return {
      seq: clientTick,
      clientTick,
      moveX: this.moveX,
      moveY: this.moveY,
      aimX: 0,
      aimY: 0,
      basicHeld: false,
      pressed: [],
      released: [],
      interactHeld: false
    };
  }

  public clear(): void {
    this.clears += 1;
  }
}

class OneShotActionInput implements SessionInputSource {
  public clears = 0;

  public constructor(
    private readonly action: InputFrame['pressed'][number],
    private readonly aim = { x: 200, y: 100 }
  ) {}

  public nextFrame(clientTick: number): InputFrame {
    return {
      seq: clientTick,
      clientTick,
      moveX: 0,
      moveY: 0,
      aimX: this.aim.x,
      aimY: this.aim.y,
      basicHeld: false,
      pressed: clientTick === 0 ? [this.action] : [],
      released: [],
      interactHeld: false
    };
  }

  public clear(): void {
    this.clears += 1;
  }
}


class HeldBasicInput implements SessionInputSource {
  public clears = 0;

  public constructor(
    private readonly aim: { readonly x: number; readonly y: number }
  ) {}

  public nextFrame(clientTick: number): InputFrame {
    return {
      seq: clientTick,
      clientTick,
      moveX: 0,
      moveY: 0,
      aimX: this.aim.x,
      aimY: this.aim.y,
      basicHeld: true,
      pressed: [],
      released: [],
      interactHeld: false
    };
  }

  public clear(): void {
    this.clears += 1;
  }
}


class ChargedEInput implements SessionInputSource {
  public clears = 0;

  public constructor(
    private readonly releaseTick: number | null,
    private readonly aim: { readonly x: number; readonly y: number },
    private readonly moveX = 0,
    private readonly moveY = 0
  ) {}

  public nextFrame(clientTick: number): InputFrame {
    return {
      seq: clientTick,
      clientTick,
      moveX: this.moveX,
      moveY: this.moveY,
      aimX: this.aim.x,
      aimY: this.aim.y,
      basicHeld: false,
      pressed: clientTick === 0 ? ['e'] : [],
      released:
        this.releaseTick !== null && clientTick === this.releaseTick
          ? ['e']
          : [],
      interactHeld: false
    };
  }

  public clear(): void {
    this.clears += 1;
  }
}


class QThenRInput implements SessionInputSource {
  public clears = 0;

  public nextFrame(clientTick: number): InputFrame {
    return {
      seq: clientTick,
      clientTick,
      moveX: 0,
      moveY: 0,
      aimX: 300,
      aimY: 100,
      basicHeld: false,
      pressed:
        clientTick === 0
          ? ['q']
          : clientTick === 25
            ? ['r']
            : [],
      released: [],
      interactHeld: false
    };
  }

  public clear(): void {
    this.clears += 1;
  }
}

function makeSession(input = new ConstantInput(1, 0)): LocalSession {
  return new LocalSession(
    createPrototypeWorld(
      'local_session_test',
      1,
      { x: 100, y: 100 },
      [],
      { speedPxPerSecond: 180 }
    ),
    input
  );
}

describe('T007 local session', () => {
  it('reaches equivalent simulation state at 30 and 60 render FPS', () => {
    const at30 = makeSession();
    const at60 = makeSession();

    for (let frame = 0; frame < 30; frame += 1) {
      at30.advance(1000 / 30);
    }

    for (let frame = 0; frame < 60; frame += 1) {
      at60.advance(1000 / 60);
    }

    const snapshot30 = at30.getSnapshot();
    const snapshot60 = at60.getSnapshot();

    expect(snapshot30.tick).toBe(60);
    expect(snapshot60.tick).toBe(60);
    expect(snapshot30.player.position.x)
      .toBeCloseTo(snapshot60.player.position.x, 8);
  });

  it('freezes solo simulation while paused', () => {
    const input = new ConstantInput(1, 0);
    const session = makeSession(input);

    session.advance(1000 / 60);
    const before = session.getSnapshot();

    session.setPaused(true);
    session.advance(5000);
    const paused = session.getSnapshot();

    expect(paused.tick).toBe(before.tick);
    expect(paused.player.position).toEqual(before.player.position);
    expect(paused.combat).toEqual(before.combat);
    expect(input.clears).toBeGreaterThanOrEqual(1);
  });

  it('stops cleanly and ignores later render updates', () => {
    const input = new ConstantInput(1, 0);
    const session = makeSession(input);

    session.advance(1000 / 60);
    session.stop();
    const stopped = session.getSnapshot();
    session.advance(1000);

    expect(session.getSnapshot()).toEqual(stopped);
    expect(input.clears).toBeGreaterThanOrEqual(1);
  });

  it('creates exactly one prototype entity on repeated session restarts', () => {
    const entityIds: number[] = [];

    for (let restart = 0; restart < 5; restart += 1) {
      const session = makeSession();
      entityIds.push(session.getSnapshot().player.entityId);
      session.stop();
    }

    expect(entityIds).toEqual([1, 1, 1, 1, 1]);
  });

  it('keeps player collision authoritative in the sim snapshot', () => {
    const input = new ConstantInput(1, 0);
    const session = new LocalSession(
      createPrototypeWorld(
        'wall_session_test',
        1,
        { x: 60, y: 100 },
        [{ x: 100, y: 0, width: 8, height: 200 }],
        { radius: 12, speedPxPerSecond: 180 }
      ),
      input
    );

    for (let frame = 0; frame < 60; frame += 1) {
      session.advance(1000 / 60);
    }

    expect(session.getSnapshot().player.position.x).toBeLessThanOrEqual(88);
  });

  it('restarts the same room ten times without duplicating the prototype entity', () => {
    const input = new ConstantInput(1, 0);
    const session = makeSession(input);

    for (let restart = 0; restart < 10; restart += 1) {
      session.advance(1000 / 30);
      expect(session.getSnapshot().player.position.x).toBeGreaterThan(100);

      const restarted = session.restart();
      expect(restarted.tick).toBe(0);
      expect(restarted.player.entityId).toBe(1);
      expect(restarted.player.position).toEqual({ x: 100, y: 100 });
      expect(restarted.player.health).toBe(320);
      expect(restarted.combat.resources.focus).toBe(100);
      expect(restarted.combat.resources.dodgeCharges).toBe(2);
      expect(restarted.combat.resources.cooldowns).toEqual({});
      expect(session.isPaused()).toBe(false);
    }

    session.advance(1000 / 30);
    expect(session.getSnapshot().player.position.x).toBeGreaterThan(100);
    expect(input.clears).toBeGreaterThanOrEqual(10);
  });

  it('does not allow a stopped session to be resurrected by restart', () => {
    const session = makeSession();
    session.stop();

    expect(() => session.restart()).toThrow('stopped session');
  });
});

describe('T017 combat input bridge', () => {
  it('bridges Q acceptance into real focus cooldown and dash movement', () => {
    const session = makeSession(new OneShotActionInput('q'));

    const accepted = session.advance(1000 / 60);

    expect(accepted.combat.resources.focus).toBe(80);
    expect(accepted.combat.resources.cooldowns.jao_q).toBe(360);
    expect(accepted.combat.activeAbilityId).toBe('jao_q');
    expect(accepted.combat.qDashActive).toBe(true);

    session.advance((1000 / 60) * 11);
    const finished = session.getSnapshot();

    expect(finished.player.position.x).toBeCloseTo(260, 6);
    expect(finished.player.position.y).toBeCloseTo(100, 6);
    expect(finished.combat.qDashActive).toBe(false);
  });

  it('uses the last valid aim direction when current aim is zero', () => {
    class LastAimQInput implements SessionInputSource {
      public clear(): void {}

      public nextFrame(clientTick: number): InputFrame {
        return {
          seq: clientTick,
          clientTick,
          moveX: 0,
          moveY: 0,
          aimX: clientTick === 0 ? 200 : 100,
          aimY: 100,
          basicHeld: false,
          pressed: clientTick === 1 ? ['q'] : [],
          released: [],
          interactHeld: false
        };
      }
    }

    const session = makeSession(new LastAimQInput());

    session.advance((1000 / 60) * 2);
    const snapshot = session.getSnapshot();

    expect(snapshot.combat.resources.focus).toBe(80);
    expect(snapshot.combat.resources.cooldowns.jao_q).toBe(360);
    expect(snapshot.combat.qDashActive).toBe(true);
  });

  it('stops Q dash at a wall', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'q_wall_test',
        1,
        { x: 60, y: 100 },
        [{ x: 100, y: 0, width: 8, height: 200 }],
        { radius: 12, speedPxPerSecond: 180 }
      ),
      new OneShotActionInput('q', { x: 200, y: 100 })
    );

    session.advance((1000 / 60) * 12);
    const snapshot = session.getSnapshot();

    expect(snapshot.player.position.x).toBeLessThanOrEqual(88);
  });

  it('bridges W acceptance into real focus and cooldown state', () => {
    const session = makeSession(new OneShotActionInput('w'));

    const snapshot = session.advance(1000 / 60);

    expect(snapshot.combat.resources.focus).toBe(85);
    expect(snapshot.combat.resources.cooldowns.jao_w).toBe(600);
    expect(snapshot.combat.activeAbilityId).toBe('jao_w');
  });

  it('bridges dodge into resources and moves exactly 112 px', () => {
    const session = makeSession(new OneShotActionInput('dodge'));

    session.advance((1000 / 60) * 13);
    const snapshot = session.getSnapshot();

    expect(snapshot.combat.resources.dodgeCharges).toBe(1);
    expect(snapshot.player.position.x).toBeCloseTo(212, 6);
    expect(snapshot.player.position.y).toBeCloseTo(100, 6);
  });

  it('stops dodge movement at a wall', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'dodge_wall_test',
        1,
        { x: 60, y: 100 },
        [{ x: 100, y: 0, width: 8, height: 200 }]
      ),
      new OneShotActionInput('dodge', { x: 200, y: 100 })
    );

    session.advance((1000 / 60) * 12);

    expect(
      session.getSnapshot().player.position.x
    ).toBeLessThanOrEqual(88);
    expect(
      session.getSnapshot().combat.resources.dodgeCharges
    ).toBe(1);
  });

  it('spawns a technical enemy with stable id and real health state', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'enemy_spawn_test',
        1,
        { x: 100, y: 100 },
        [],
        {
          enemySpawns: [{
            archetype: 'eco_rasteiro',
            position: { x: 220, y: 100 }
          }]
        }
      ),
      new ConstantInput(0, 0)
    );

    const initial = session.getSnapshot();
    expect(initial.enemies).toEqual([{
      entityId: 2,
      archetype: 'eco_rasteiro',
      position: { x: 220, y: 100 },
      radius: 12,
      health: 70,
      maxHealth: 70,
      alive: true,
      vulnerable: false,
      resonanceMarked: false,
      aiPhase: 'idle'
    }]);

    const restarted = session.restart();
    expect(restarted.enemies).toEqual(initial.enemies);
  });


  it('applies held basic attacks to the technical enemy using real cadence', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'basic_attack_test',
        1,
        { x: 100, y: 100 },
        [],
        {
          enemySpawns: [{
            archetype: 'eco_rasteiro',
            position: { x: 150, y: 100 }
          }]
        }
      ),
      new HeldBasicInput({ x: 150, y: 100 })
    );

    session.advance((1000 / 60) * 8);
    expect(session.getSnapshot().enemies[0]?.health).toBe(70);
    expect(session.getSnapshot().combat.activeAbilityId).toBe('jao_basic');

    session.advance(1000 / 60);
    expect(session.getSnapshot().enemies[0]?.health).toBe(44);

    session.advance((1000 / 60) * 32);
    expect(session.getSnapshot().enemies[0]?.health).toBe(44);

    session.advance(1000 / 60);
    expect(session.getSnapshot().enemies[0]?.health).toBe(18);
  });

  it('does not damage an enemy outside the basic attack range', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'basic_range_test',
        1,
        { x: 100, y: 100 },
        [],
        {
          enemySpawns: [{
            archetype: 'eco_rasteiro',
            position: { x: 220, y: 100 }
          }]
        }
      ),
      new HeldBasicInput({ x: 220, y: 100 })
    );

    session.advance((1000 / 60) * 9);
    expect(session.getSnapshot().enemies[0]?.health).toBe(70);
  });


  it('activates W after its windup and expires vulnerable on schedule', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'w_vulnerable_test',
        1,
        { x: 100, y: 100 },
        [],
        {
          enemySpawns: [{
            archetype: 'eco_rasteiro',
            position: { x: 200, y: 100 }
          }]
        }
      ),
      new OneShotActionInput('w', { x: 200, y: 100 })
    );

    session.advance((1000 / 60) * 10);
    expect(session.getSnapshot().enemies[0]?.vulnerable).toBe(true);

    session.advance((1000 / 60) * 179);
    expect(session.getSnapshot().enemies[0]?.vulnerable).toBe(false);
  });


  it('holds an early E release until minimum charge and then deals minimum damage', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'e_min_charge_test',
        1,
        { x: 100, y: 100 },
        [],
        {
          enemySpawns: [{
            archetype: 'eco_rasteiro',
            position: { x: 180, y: 100 }
          }]
        }
      ),
      new ChargedEInput(5, { x: 180, y: 100 })
    );

    session.advance((1000 / 60) * 12);
    expect(session.getSnapshot().enemies[0]?.health).toBe(70);
    expect(session.getSnapshot().combat.eCharging).toBe(true);

    session.advance(1000 / 60);
    const released = session.getSnapshot();

    expect(released.enemies[0]?.health).toBe(30);
    expect(released.combat.resources.focus).toBe(75);
    expect(released.combat.eCharging).toBe(false);
  });

  it('releases E automatically at maximum charge', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'e_max_charge_test',
        1,
        { x: 100, y: 100 },
        [],
        {
          enemySpawns: [{
            archetype: 'eco_rasteiro',
            position: { x: 180, y: 100 }
          }]
        }
      ),
      new ChargedEInput(null, { x: 180, y: 100 })
    );

    session.advance((1000 / 60) * 61);
    const snapshot = session.getSnapshot();

    expect(snapshot.enemies[0]?.health).toBe(0);
    expect(snapshot.enemies[0]?.alive).toBe(false);
    expect(snapshot.combat.eCharging).toBe(false);
  });

  it('applies the E movement multiplier while charging', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'e_movement_test',
        1,
        { x: 100, y: 100 },
        [],
        { speedPxPerSecond: 180 }
      ),
      new ChargedEInput(null, { x: 200, y: 100 }, 1, 0)
    );

    session.advance(1000 / 30);

    expect(session.getSnapshot().player.position.x).toBeCloseTo(101.5, 6);
  });


  it('activates R from full charge after the documented windup', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'r_activation_test',
        1,
        { x: 100, y: 100 },
        []
      ),
      new OneShotActionInput('r'),
      { initialUltimateCharge: 100 }
    );

    const accepted = session.advance(1000 / 60);
    expect(accepted.combat.ultimate.charge).toBe(0);
    expect(accepted.combat.activeAbilityId).toBe('jao_r');
    expect(accepted.combat.ultimateActive).toBe(false);

    session.advance((1000 / 60) * 11);
    expect(session.getSnapshot().combat.ultimateActive).toBe(true);

    session.advance((1000 / 60) * 360);
    expect(session.getSnapshot().combat.ultimateActive).toBe(false);
  });

  it('resets the current Q cooldown once when R is accepted', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'r_q_reset_test',
        1,
        { x: 100, y: 100 },
        []
      ),
      new QThenRInput(),
      { initialUltimateCharge: 100 }
    );

    session.advance((1000 / 60) * 25);
    expect(
      session.getSnapshot().combat.resources.cooldowns.jao_q
    ).toBeGreaterThan(0);

    session.advance(1000 / 60);
    const activated = session.getSnapshot();

    expect(activated.combat.ultimate.charge).toBe(0);
    expect(
      activated.combat.resources.cooldowns.jao_q
    ).toBeUndefined();
  });


  it('moves the technical enemy toward Jão using the existing FSM', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'enemy_approach_test',
        1,
        { x: 100, y: 100 },
        [],
        {
          enemySpawns: [{
            archetype: 'eco_rasteiro',
            position: { x: 260, y: 100 }
          }]
        }
      ),
      new ConstantInput(0, 0),
      { enemyAiEnabled: true }
    );

    session.advance((1000 / 60) * 60);
    const enemy = session.getSnapshot().enemies[0];

    expect(enemy?.position.x).toBeLessThan(260);
    expect(enemy?.position.x).toBeGreaterThan(100);
    expect(enemy?.aiPhase).toBe('approach');
    expect(enemy?.health).toBe(70);
  });


  it('makes Q damage crossed targets and apply Resonance', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'q_damage_test',
        1,
        { x: 100, y: 100 },
        [],
        {
          enemySpawns: [{
            archetype: 'eco_rasteiro',
            position: { x: 180, y: 100 }
          }]
        }
      ),
      new OneShotActionInput('q', { x: 300, y: 100 })
    );

    session.advance(1000 / 60);
    const enemy = session.getSnapshot().enemies[0];

    expect(enemy?.health).toBe(38);
    expect(enemy?.resonanceMarked).toBe(true);
  });

  it('does not let Q damage or mark a target behind a wall', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'q_blocked_damage_test',
        1,
        { x: 60, y: 100 },
        [{ x: 100, y: 0, width: 8, height: 200 }],
        {
          enemySpawns: [{
            archetype: 'eco_rasteiro',
            position: { x: 140, y: 100 }
          }]
        }
      ),
      new OneShotActionInput('q', { x: 220, y: 100 })
    );

    session.advance(1000 / 60);
    const enemy = session.getSnapshot().enemies[0];

    expect(enemy?.health).toBe(70);
    expect(enemy?.resonanceMarked).toBe(false);
  });


  it('lets the Eco Rasteiro telegraph and damage Jão once', () => {
    const session = new LocalSession(
      createPrototypeWorld(
        'enemy_damage_test',
        1,
        { x: 100, y: 100 },
        [],
        {
          enemySpawns: [{
            archetype: 'eco_rasteiro',
            position: { x: 140, y: 100 }
          }]
        }
      ),
      new ConstantInput(0, 0),
      { enemyAttacksEnabled: true }
    );

    session.advance((1000 / 60) * 45);
    const snapshot = session.getSnapshot();

    expect(snapshot.player.health).toBe(308);
    expect(snapshot.player.alive).toBe(true);
    expect(snapshot.enemies[0]?.aiPhase).toBe('recovery');
  });

  it('blocks an enemy attack while the player is invulnerable', () => {
    const world = createPrototypeWorld(
      'enemy_iframe_test',
      1,
      { x: 100, y: 100 },
      [],
      {
        enemySpawns: [{
          archetype: 'eco_rasteiro',
          position: { x: 140, y: 100 }
        }]
      }
    );
    const attack = [{
      kind: 'attack' as const,
      enemyEntityId: 2,
      targetEntityId: 1,
      enemyActionId: 'enemy_action:2:0',
      familyId: 'eco_rasteiro_cone'
    }];

    const blocked = applyPrototypeEnemyAttacks(
      world,
      attack,
      true
    );
    const hit = applyPrototypeEnemyAttacks(
      world,
      attack,
      false
    );

    expect(blocked.player.health.health).toBe(320);
    expect(hit.player.health.health).toBe(308);
  });


  it('pauses on real defeat and restarts the checkpoint without duplicated state', () => {
    const enemySpawns = Array.from(
      { length: 27 },
      () => ({
        archetype: 'eco_rasteiro' as const,
        position: { x: 140, y: 100 }
      })
    );
    const session = new LocalSession(
      createPrototypeWorld(
        'real_defeat_restart_test',
        1,
        { x: 100, y: 100 },
        [],
        { enemySpawns }
      ),
      new ConstantInput(0, 0),
      { enemyAttacksEnabled: true }
    );

    session.advance((1000 / 60) * 45);
    const defeated = session.getSnapshot();

    expect(defeated.player.health).toBe(0);
    expect(defeated.player.alive).toBe(false);
    expect(session.isPaused()).toBe(true);
    expect(defeated.combat.activeAbilityId).toBeNull();
    expect(defeated.combat.ultimateActive).toBe(false);

    const defeatedTick = defeated.tick;
    session.advance(1000);
    expect(session.getSnapshot().tick).toBe(defeatedTick);

    const restarted = session.restart();

    expect(restarted.tick).toBe(0);
    expect(restarted.player.health).toBe(320);
    expect(restarted.player.alive).toBe(true);
    expect(restarted.combat.resources.focus).toBe(100);
    expect(restarted.combat.resources.dodgeCharges).toBe(2);
    expect(restarted.combat.resources.cooldowns).toEqual({});
    expect(restarted.enemies).toHaveLength(27);
    expect(
      restarted.enemies.every(
        (enemy) => enemy.health === 70 && enemy.alive
      )
    ).toBe(true);
    expect(session.isPaused()).toBe(false);
  });

});
