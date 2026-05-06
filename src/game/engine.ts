import InputManager from "./input";

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: InputManager;
  private animationFrameId: number = 0;
  private lastTime: number = 0;

  // Player state — just a rectangle for now
  private player = {
    x: 200,
    y: 200,
    width: 32,
    height: 32,
    speed: 150, // pixels per second
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.input = new InputManager();
  }

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    cancelAnimationFrame(this.animationFrameId);
  }

  private loop = (currentTime: number) => {
    // deltaTime = time since last frame, in seconds
    // This makes movement speed consistent regardless of frame rate
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    // Schedule the next frame
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // Move the player based on which keys are held
    // Multiply by dt so movement is frame-rate independent
    if (this.input.isDown("ArrowUp") || this.input.isDown("w")) {
      this.player.y -= this.player.speed * dt;
    }
    if (this.input.isDown("ArrowDown") || this.input.isDown("s")) {
      this.player.y += this.player.speed * dt;
    }
    if (this.input.isDown("ArrowLeft") || this.input.isDown("a")) {
      this.player.x -= this.player.speed * dt;
    }
    if (this.input.isDown("ArrowRight") || this.input.isDown("d")) {
      this.player.x += this.player.speed * dt;
    }

    // Keep player within canvas bounds
    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
    this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y));
  }

  private render() {
    const { ctx, canvas, player } = this;

    // Clear the entire canvas each frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw a simple floor (dark gray)
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the player (a colored square for now)
    ctx.fillStyle = "#e94560";
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }
}