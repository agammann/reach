import {test} from 'node:test';
import assert from 'node:assert/strict';
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
test('viewer escapes observations and rejects arbitrary screenshot paths', async () => {
  const report = await run(new SyntheticGame(), 'keyboard', 1, [{step:0,note:'<script>alert(1)</script>'}]);
  report.steps[0].screenshot = '../private.png';
  const html = viewer(report);
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>alert/); assert.doesNotMatch(html, /src="\.\.\/private/);
});
