// This tracks which keys are currently held down.
// Instead of reacting to individual key presses, the game loop
// checks "is ArrowUp held?" every frame — this gives smooth movement.

class InputManager {
  private keys: Set<string> = new Set();

  constructor() {
    // Bind to window so we catch keys even when canvas isn't focused
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.key);
      this.keys.add(e.key.toLowerCase());
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key);
      this.keys.delete(e.key.toLowerCase());
    });

    // Release every held key when the window loses focus or is hidden — otherwise the keyup never
    // arrives (you switched window/tab/app mid-press) and the player stays locked in that movement
    // until the key is pressed and released again.
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.clear(); });
  }

  isDown(key: string): boolean {
    return this.keys.has(key);
  }

  // Wipe all held-key state — call when pausing so no stale keys carry over on resume.
  clear() {
    this.keys.clear();
  }
}

export default InputManager;