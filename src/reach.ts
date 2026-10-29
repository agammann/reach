/** An adapter is responsible for delivering real inputs and observing game state. */
export type Action = 'start' | 'advance' | 'pause' | 'recover' | 'finish';
export type Checkpoint = 'menu' | 'play' | 'pause' | 'recover' | 'finish';
export type Profile = 'keyboard' | 'single-action';
export interface Adapter {
  reset(seed: number): Promise<void>;
  act(action: Action, profile: Profile): Promise<void>;
  at(checkpoint: Checkpoint): Promise<boolean>;
  capture?(step: number): Promise<string | null>;
}
export interface Observation { step: number; note: string; }
export interface Evidence { checkpoint: Checkpoint; action: Action | null; passed: boolean; elapsedMs: number; screenshot: string | null; observation: string; error: string | null; }
export interface Report { seed: number; profile: Profile; steps: Evidence[]; }

const journey: ReadonlyArray<[Action | null, Checkpoint]> = [[null,'menu'],['start','play'],['pause','pause'],['recover','recover'],['finish','finish']];

/** Stops at the first failed checkpoint: later checks would be misleading. */
export async function run(adapter: Adapter, profile: Profile, seed: number, observations: Observation[] = []): Promise<Report> {
  if (!Number.isSafeInteger(seed)) throw new Error('seed must be a safe integer');
  if (!['keyboard','single-action'].includes(profile)) throw new Error('unsupported profile');
  if (observations.some(o => !Number.isInteger(o.step) || o.step < 0 || o.step >= journey.length || typeof o.note !== 'string')) throw new Error('invalid observation');
  const report: Report = {seed, profile, steps: []};
  await adapter.reset(seed);
  for (const [i, [action, checkpoint]] of journey.entries()) {
    const start = performance.now();
    let passed = false, error: string | null = null;
    try { if (action) await adapter.act(action, profile); passed = await adapter.at(checkpoint); }
    catch (e) { error = e instanceof Error ? e.message : String(e); }
    const elapsedMs = Math.round(performance.now() - start);
    let screenshot: string | null = null;
    try { screenshot = await adapter.capture?.(i) ?? null; } catch (e) { error = [error, `capture: ${String(e)}`].filter(Boolean).join('; '); }
    report.steps.push({checkpoint, action, passed, elapsedMs, screenshot, observation: observations.filter(o => o.step === i).map(o => o.note).join('\n'), error});
    if (!passed) break;
  }
  return report;
}

export function guide(report: Report): string {
  const clean = (s: string) => s.replace(/[\r\n]+/g, ' ');
  return [`# Play journey evidence`, ``, `Profile: ${report.profile}; seed: ${report.seed}`, ``, ...report.steps.flatMap((s, i) => [`## ${i + 1}. ${s.checkpoint} — ${s.passed ? 'reached' : 'blocked'}`, `Action: ${s.action ?? 'initial state'}; elapsed: ${s.elapsedMs} ms`, `Screenshot: ${clean(s.screenshot ?? 'not captured')}`, `Observation: ${clean(s.observation || 'none recorded')}`, `Error: ${clean(s.error ?? 'none')}`, ``]), `This report is test evidence, not accessibility certification.`].join('\n');
}
