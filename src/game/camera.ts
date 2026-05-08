export class Camera {
  x: number = 0;
  y: number = 0;

  private viewportWidth: number;
  private viewportHeight: number;
//   private worldWidth: number;
//   private worldHeight: number;
  private smoothing: number = 0.08;

  constructor(
    viewportWidth: number,
    viewportHeight: number,
    // worldWidth: number,
    // worldHeight: number
  ) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    // this.worldWidth = worldWidth;
    // this.worldHeight = worldHeight;
  }

  snapTo(targetX: number, targetY: number) {
    this.x = targetX - this.viewportWidth / 2;
    this.y = targetY - this.viewportHeight / 2;
  }

  follow(targetX: number, targetY: number) {
    // Center on the target
    const desiredX = targetX - this.viewportWidth / 2;
    const desiredY = targetY - this.viewportHeight / 2;

    // Smooth follow
    this.x += (desiredX - this.x) * this.smoothing;
    this.y += (desiredY - this.y) * this.smoothing;

    // If the world is smaller than the viewport, center the world
    // Otherwise, clamp so the camera doesn't show past the edges
    // if (this.worldWidth <= this.viewportWidth) {
    //   this.x = -(this.viewportWidth - this.worldWidth) / 2;
    // } else {
    //   this.x = Math.max(0, Math.min(this.worldWidth - this.viewportWidth, this.x));
    // }

    // if (this.worldHeight <= this.viewportHeight) {
    //   this.y = -(this.viewportHeight - this.worldHeight) / 2;
    // } else {
    //   this.y = Math.max(0, Math.min(this.worldHeight - this.viewportHeight, this.y));
    // }
  }
}