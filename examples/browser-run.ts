import {writeFile, mkdir, mkdtemp, readFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {run, guide} from '../src/reach.ts';
import {BrowserAdapter} from '../src/playwright-adapter.ts';
import {viewer} from '../src/viewer.ts';

const profile = process.argv[2] === 'single-action' ? 'single-action' : 'keyboard';
const fault = process.argv[3] || undefined;
if (fault && !['trap','unpausable','held-only'].includes(fault)) throw new Error('Unknown fault');
const root = resolve(process.env.REACH_EVIDENCE_ROOT || 'evidence');
await mkdir(root, {recursive:true});
// mkdtemp atomically creates a fresh directory, including for concurrent runs.
const output = await mkdtemp(join(root, `${profile}-${fault || 'normal'}-`));
// REACH_PLAYWRIGHT is only for an existing local installation; ordinary users install the declared dependency.
const source = process.env.REACH_PLAYWRIGHT ? pathToFileURL(resolve(process.env.REACH_PLAYWRIGHT)).href : 'playwright';
const {chromium} = await import(source);
const adapter = new BrowserAdapter({chromium, gamePath:'examples/game.html', evidenceDir:output, profile, fault});
try {
  const observations = process.env.REACH_OBSERVATIONS ? JSON.parse(await readFile(process.env.REACH_OBSERVATIONS,'utf8')) : [];
  const report = await run(adapter, profile, 42, observations);
  await writeFile(resolve(output,'report.json'), JSON.stringify(report,null,2), {flag:'wx'});
  await writeFile(resolve(output,'guide.md'), guide(report), {flag:'wx'});
  await writeFile(resolve(output,'index.html'), viewer(report), {flag:'wx'});
  console.log(`${profile} ${fault || 'normal'}: ${report.steps.at(-1)?.passed ? 'completed' : 'blocked at '+report.steps.at(-1)?.checkpoint}; evidence: ${output}`);
} finally { await adapter.close(); }
