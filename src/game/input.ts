// This tracks which keys are currently held down.
// Instead of reacting to individual key presses, the game loop
// checks "is ArrowUp held?" every frame — this gives smooth movement.

class InputManager {
  private keys: Set<string> = new Set();

  constructor() {
    // Bind to window so we catch keys even when canvas isn't focused
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.key);
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key);
    });
  }

  // Call this in the game loop to check if a key is held
  isDown(key: string): boolean {
    return this.keys.has(key);
  }
}

export default InputManager;