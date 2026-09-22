import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('T001 workspace contract', () => {
  it('declares the required workspaces and scripts', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      workspaces: string[];
      scripts: Record<string, string>;
    };

    expect(pkg.workspaces).toEqual([
      'apps/client',
      'packages/sim',
      'packages/content',
      'packages/protocol'
    ]);

    for (const script of ['dev','build','typecheck','lint','test','test:content','test:e2e']) {
      expect(pkg.scripts[script]).toBeTypeOf('string');
      expect(pkg.scripts[script]?.length).toBeGreaterThan(0);
    }
  });

  it('keeps the expected workspace entry points present', () => {
    for (const path of [
      'apps/client/package.json',
      'packages/sim/package.json',
      'packages/content/package.json',
      'packages/protocol/package.json'
    ]) {
      expect(existsSync(path), path).toBe(true);
    }
  });
});
