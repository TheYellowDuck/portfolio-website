export class Camera {
  x: number = 0;
  y: number = 0;

  private viewportWidth: number;
  private viewportHeight: number;
  private smoothing: number = 0.08;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  resize(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  snapTo(targetX: number, targetY: number) {
    this.x = targetX - this.viewportWidth / 2;
    this.y = targetY - this.viewportHeight / 2;
  }

  follow(targetX: number, targetY: number, dt: number) {
    const desiredX = targetX - this.viewportWidth / 2;
    const desiredY = targetY - this.viewportHeight / 2;

    // Frame-rate independent smooth follow: identical feel at 30, 60, or 120 fps
    const factor = 1 - Math.pow(1 - this.smoothing, dt * 60);
    this.x += (desiredX - this.x) * factor;
    this.y += (desiredY - this.y) * factor;
  }
}
