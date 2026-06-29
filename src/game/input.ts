// This tracks which keys are currently held down.
// Instead of reacting to individual key presses, the game loop
// checks "is ArrowUp held?" every frame — this gives smooth movement.

class InputManager {
  private keys: Set<string> = new Set();

  // Stored as fields so dispose() can remove them: the game canvas unmounts on leave and remounts on
  // re-entry, so without cleanup every entry would pile on another set of stale window listeners.
  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key);
    this.keys.add(e.key.toLowerCase());
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
    this.keys.delete(e.key.toLowerCase());
  };
  // Release every held key when the window loses focus or is hidden — otherwise the keyup never
  // arrives (you switched window/tab/app mid-press) and the player stays locked in that movement
  // until the key is pressed and released again.
  private onBlur = () => this.clear();
  private onVisibility = () => { if (document.hidden) this.clear(); };

  constructor() {
    // Bind to window so we catch keys even when canvas isn't focused
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  isDown(key: string): boolean {
    return this.keys.has(key);
  }

  // Wipe all held-key state — call when pausing so no stale keys carry over on resume.
  clear() {
    this.keys.clear();
  }

  // Remove every listener and held-key state. Call on teardown so a remounted game starts clean
  // instead of accumulating dead handlers from earlier sessions.
  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.keys.clear();
  }
}

export default InputManager;
