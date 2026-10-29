import type {Report} from './reach.ts';
const escape = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** Static report so the viewer can be opened locally without a server. */
export function viewer(report: Report): string {
  const steps=report.steps.map((s,i)=>`<section><h2>${i+1}. ${escape(s.checkpoint)}: ${s.passed?'reached':'blocked'}</h2><p>Action: ${escape(s.action ?? 'initial state')} · ${s.elapsedMs} ms</p><p>Observation: ${escape(s.observation || 'none recorded')}</p><p>Error: ${escape(s.error || 'none')}</p>${s.screenshot && /^step-\d+\.png$/.test(s.screenshot) ? `<img src="${escape(s.screenshot)}" alt="Screenshot at ${escape(s.checkpoint)}">` : '<p>Screenshot unavailable</p>'}</section>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Reach evidence</title><style>body{font:17px system-ui;max-width:60rem;margin:2rem auto;padding:0 1rem;color:#172b3a}section{border:1px solid #b9c9d1;padding:1rem;margin:1rem 0;border-radius:.5rem}img{max-width:100%;height:auto}p{overflow-wrap:anywhere}</style><h1>Reach evidence</h1><p>Profile: ${escape(report.profile)} · Seed: ${report.seed}</p><p>Automated test evidence is not accessibility certification.</p>${steps}</html>`;
}
