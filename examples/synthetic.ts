import type {Action, Adapter, Checkpoint, Profile} from '../src/reach.ts';
export type Fault = 'trap' | 'unpausable' | 'held-only' | null;
/** A synthetic state-machine fixture, not a browser game or assistive device. */
export class SyntheticGame implements Adapter {
  state: Checkpoint = 'menu'; seed = 0;
  fault: Fault;
  constructor(fault: Fault = null) { this.fault = fault; }
  async reset(seed: number) { this.seed = seed; this.state = 'menu'; }
  async at(checkpoint: Checkpoint) { return this.state === checkpoint; }
  async act(action: Action, profile: Profile) {
    if (action === 'start' && this.state === 'menu' && this.fault !== 'trap') this.state = 'play';
    else if (action === 'pause' && this.state === 'play' && this.fault !== 'unpausable') this.state = 'pause';
    else if (action === 'recover' && this.state === 'pause') this.state = 'recover';
    else if (action === 'finish' && this.state === 'recover' && !(this.fault === 'held-only' && profile === 'single-action')) this.state = 'finish';
  }
}
