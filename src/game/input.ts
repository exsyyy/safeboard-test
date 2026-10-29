import type { Action, InputState } from './types';

export function createInput() {
  const sources = new Map<string, Action>();
  return {
    set(source: string, action: Action, pressed: boolean) {
      if (pressed) sources.set(source, action);
      else sources.delete(source);
    },
    release(source: string) {
      sources.delete(source);
    },
    reset() {
      sources.clear();
    },
    read(): InputState {
      const state: InputState = { left: false, right: false, thrust: false, fire: false };
      sources.forEach((action) => {
        state[action] = true;
      });
      return state;
    },
  };
}
