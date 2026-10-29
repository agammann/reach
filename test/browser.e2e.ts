import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {run} from '../src/reach.ts';
import {BrowserAdapter} from '../src/playwright-adapter.ts';
const source = process.env.REACH_PLAYWRIGHT ? pathToFileURL(resolve(process.env.REACH_PLAYWRIGHT)).href : 'playwright';
const {chromium} = await import(source);
for (const [profile, fault, expected] of [['keyboard',undefined,'finish'],['single-action',undefined,'finish'],['keyboard','trap','play'],['keyboard','unpausable','pause'],['single-action','held-only','finish']] as const) {
  test(`${profile} ${fault || 'normal'} browser journey`, async () => {
    const directory = await mkdtemp(join(tmpdir(),'reach-e2e-'));
    const adapter = new BrowserAdapter({chromium,gamePath:'examples/game.html',evidenceDir:directory,profile,fault});
    try {
      const report = await run(adapter,profile,42,[{step:0,note:'human observation'}]);
      assert.equal(report.steps.at(-1)?.checkpoint,expected);
      assert.equal(report.steps.at(-1)?.passed,!fault);
      assert.equal(report.steps[0].observation,'human observation');
      for (const step of report.steps) {
        assert.ok(step.screenshot);
        const png = await readFile(join(directory,step.screenshot!));
        assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
      }
    } finally { await adapter.close(); await rm(directory,{recursive:true,force:true}); }
  });
}
test('repeated browser runs preserve all previous evidence', async () => {
  const root = await mkdtemp(join(tmpdir(),'reach-repeat-'));
  const exec = promisify(execFile);
  const options = {env:{...process.env, REACH_EVIDENCE_ROOT:root}};
  await exec(process.execPath, ['examples/browser-run.ts','keyboard'], options);
  const [first] = await readdir(root);
  assert.ok(first);
  const names = await readdir(join(root,first));
  assert.ok(names.includes('report.json') && names.includes('step-0.png') && names.includes('index.html'));
  const original = await Promise.all(names.map(name => readFile(join(root,first,name))));
  await exec(process.execPath, ['examples/browser-run.ts','keyboard'], options);
  const directories = await readdir(root);
  assert.equal(directories.length,2);
  assert.ok(directories.includes(first));
  const currentNames = await readdir(join(root,first));
  assert.deepEqual(currentNames,names);
  for (const [i,name] of names.entries()) assert.deepEqual(await readFile(join(root,first,name)), original[i]);
});
