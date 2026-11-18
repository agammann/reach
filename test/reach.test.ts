import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {access, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {run, guide} from '../src/reach.ts';
import {SyntheticGame} from '../examples/synthetic.ts';
import {viewer} from '../src/viewer.ts';

for (const profile of ['keyboard', 'single-action'] as const) test(`${profile} completes the journey`, async () => {
  const game = new SyntheticGame(); const r = await run(game, profile, 123);
  assert.equal(game.seed, 123); assert.deepEqual(r.steps.map(s => s.checkpoint), ['menu','play','pause','recover','finish']); assert.ok(r.steps.every(s => s.passed));
});
for (const [fault, profile, expected] of [['trap','keyboard','play'], ['unpausable','keyboard','pause'], ['held-only','single-action','finish']] as const) test(`${fault} blocks ${expected}`, async () => {
  const r = await run(new SyntheticGame(fault), profile, 42, [{step:1,note:'observer note'}]);
  assert.equal(r.steps.at(-1)?.checkpoint, expected); assert.equal(r.steps.at(-1)?.passed, false);
});
test('guide retains observations and explicitly marks missing screenshots', async () => {
  const r = await run(new SyntheticGame(), 'keyboard', 1, [{step:1,note:'manual observation'}]);
  assert.match(guide(r), /manual observation/); assert.match(guide(r), /not captured/); assert.match(guide(r), /not accessibility certification/);
});
test('rejects invalid inputs', async () => {
  await assert.rejects(run(new SyntheticGame(), 'keyboard', NaN), /seed/);
  await assert.rejects(run(new SyntheticGame(), 'keyboard', 1, [{step:99,note:'x'}]), /observation/);
});
test('invalid CLI profiles and observations leave no evidence directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'reach-invalid-'));
  const evidence = join(root, 'evidence');
  const observations = join(root, 'observations.json');
  try {
    await writeFile(observations, '[null]');
    for (const [profile, expected] of [['keybord', /profile must be/], ['keyboard', /observations must be an array/]] as const) {
      const result = spawnSync(process.execPath, ['examples/browser-run.ts', profile], {
        encoding: 'utf8', env: {...process.env, REACH_OBSERVATIONS: observations, REACH_EVIDENCE_ROOT: evidence},
      });
      assert.ifError(result.error);
      assert.equal(result.status, 2);
      assert.match(result.stderr, expected);
      assert.equal(result.stdout, '');
      await assert.rejects(access(evidence), {code: 'ENOENT'});
    }
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});
test('viewer escapes observations and rejects arbitrary screenshot paths', async () => {
  const report = await run(new SyntheticGame(), 'keyboard', 1, [{step:0,note:'<script>alert(1)</script>'}]);
  report.steps[0].screenshot = '../private.png';
  const html = viewer(report);
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>alert/); assert.doesNotMatch(html, /src="\.\.\/private/);
});
