import {writeFile, mkdir, mkdtemp, readFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {run, guide, validateObservations} from '../src/reach.ts';
import {BrowserAdapter} from '../src/playwright-adapter.ts';
import {viewer} from '../src/viewer.ts';

async function main() {
  const profile = process.argv[2] ?? 'keyboard';
  if (profile !== 'keyboard' && profile !== 'single-action') {
    throw new Error('profile must be keyboard or single-action');
  }
  const fault = process.argv[3];
  if (process.argv.length > 4 || (fault !== undefined && !['trap', 'unpausable', 'held-only'].includes(fault))) {
    throw new Error('expected at most one sample fault: trap, unpausable, or held-only');
  }

  let observations: unknown = [];
  if (process.env.REACH_OBSERVATIONS) {
    const text = await readFile(process.env.REACH_OBSERVATIONS, 'utf8');
    try {
      observations = JSON.parse(text);
    } catch {
      throw new Error('observation file must contain valid JSON');
    }
  }
  validateObservations(observations);

  // REACH_PLAYWRIGHT can point to an existing local installation.
  const source = process.env.REACH_PLAYWRIGHT ? pathToFileURL(resolve(process.env.REACH_PLAYWRIGHT)).href : 'playwright';
  const {chromium} = await import(source);
  const root = resolve(process.env.REACH_EVIDENCE_ROOT || 'evidence');
  await mkdir(root, {recursive: true});
  // mkdtemp atomically creates a fresh directory, including for concurrent runs.
  const output = await mkdtemp(join(root, `${profile}-${fault ?? 'normal'}-`));
  const adapter = new BrowserAdapter({chromium, gamePath: 'examples/game.html', evidenceDir: output, profile, fault});
  try {
    const report = await run(adapter, profile, 42, observations);
    await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2), {flag: 'wx'});
    await writeFile(resolve(output, 'guide.md'), guide(report), {flag: 'wx'});
    await writeFile(resolve(output, 'index.html'), viewer(report), {flag: 'wx'});
    const last = report.steps.at(-1);
    console.log(`${profile} ${fault ?? 'normal'}: ${last?.passed ? 'completed' : 'blocked at ' + last?.checkpoint}; evidence: ${output}`);
    return last?.passed ? 0 : 1;
  } finally {
    await adapter.close();
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`Reach: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
}
