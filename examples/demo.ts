import {writeFile} from 'node:fs/promises';
import {run, guide} from '../src/reach.ts';
import {SyntheticGame} from './synthetic.ts';
const report = await run(new SyntheticGame('held-only'), 'single-action', 42, [{step:4,note:'Synthetic held-key-only finish blocked a discrete action.'}]);
await writeFile('example-report.json', JSON.stringify(report, null, 2));
await writeFile('example-guide.md', guide(report));
console.log('Wrote example-report.json and example-guide.md');
