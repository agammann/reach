import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import type {Action, Adapter, Checkpoint, Profile} from './reach.ts';

// Playwright is passed in to keep the core independent of the browser dependency.
export class BrowserAdapter implements Adapter {
  page: any; browser: any;
  constructor(publicOptions: {chromium: any; gamePath: string; evidenceDir: string; fault?: string; profile: Profile}) { this.options = publicOptions; }
  options: {chromium: any; gamePath: string; evidenceDir: string; fault?: string; profile: Profile};
  async reset(seed: number) {
    await mkdir(this.options.evidenceDir, {recursive:true});
    this.browser = await this.options.chromium.launch({headless:true, ...(process.env.REACH_BROWSER_CHANNEL ? {channel:process.env.REACH_BROWSER_CHANNEL} : {})});
    this.page = await this.browser.newPage({viewport:{width:900,height:700}});
    const url = pathToFileURL(resolve(this.options.gamePath));
    url.searchParams.set('seed', String(seed)); url.searchParams.set('profile', this.options.profile);
    if (this.options.fault) url.searchParams.set('fault', this.options.fault);
    await this.page.goto(url.href);
  }
  async act(action: Action, profile: Profile) {
    if (profile !== this.options.profile) throw new Error('profile mismatch');
    const key = profile === 'single-action' ? 'Space' : ({start:'Enter',advance:'ArrowRight',pause:'Escape',recover:'r',finish:'Enter'})[action];
    await this.page.keyboard.press(key);
  }
  async at(checkpoint: Checkpoint) { return await this.page.locator('body').getAttribute('data-checkpoint') === checkpoint; }
  async capture(step: number) { const name = `step-${step}.png`; await this.page.screenshot({path:resolve(this.options.evidenceDir,name)}); return name; }
  async close() { await this.browser?.close(); }
}
