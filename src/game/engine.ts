import InputManager from "./input";
import { Camera } from "./camera";
import {
  TILE_SIZE,
  TILES,
  TILE_COLORS,
  OBJECT_COLORS,
  museumMap,
  objectMap,
  solidMap,
  setTileAt,
  setSolidAt,
  PLAYER_SPAWN_COL,
  PLAYER_SPAWN_ROW,
} from "./tilemap";
import { COLORS } from "@/styles/theme";
import { getNearbyInteractable, Interactable } from "./interactables";
import { Exhibit } from "@/data/projects";

export type GameEvent =
  | { type: "nearby"; content: Exhibit }
  | { type: "interact"; content: Exhibit }
  | { type: "leave" };

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: InputManager;
  private camera: Camera;
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private paused: boolean = false;
  private interactCooldown: boolean = false;
  private floorSprites: [HTMLImageElement, HTMLImageElement];
  private floorSpritesLoaded: number = 0;
  private wallHSprites: HTMLImageElement[] = [];
  private wallHSpritesLoaded: number = 0;
  private wallTopSprites: HTMLImageElement[] = [];
  private wallTopSpritesLoaded: number = 0;
  private wallHLeftSprite: HTMLImageElement;
  private wallHLeftReady: boolean = false;
  private wallHRightSprite: HTMLImageElement;
  private wallHRightReady: boolean = false;
  private wallTopKnubSprite: HTMLImageElement;
  private wallTopKnubReady: boolean = false;
  private wallTopCornerSprite: HTMLImageElement;
  private wallTopCornerReady: boolean = false;
  private wallTopIntersectSprite: HTMLImageElement;
  private wallTopIntersectReady: boolean = false;
  private wallTopCrossSprite: HTMLImageElement;
  private wallTopCrossReady: boolean = false;

  public onEvent: ((event: GameEvent) => void) | null = null;
  private currentNearby: Interactable | null = null;

  private player = {
    x: TILE_SIZE * PLAYER_SPAWN_COL,
    y: TILE_SIZE * PLAYER_SPAWN_ROW,
    width: 56,
    height: 56,
    speed: 360,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.input = new InputManager();
    this.camera = new Camera(canvas.width, canvas.height);
    const makeSprite = (src: string) => {
      const img = new Image();
      img.onload = () => { this.floorSpritesLoaded++; };
      img.src = src;
      return img;
    };
    this.floorSprites = [
      makeSprite("/assets/sprites/floor2.png"),
      makeSprite("/assets/sprites/floor3.png"),
    ];
    for (let i = 0; i < 5; i++) {
      const img = new Image();
      img.onload = () => { this.wallHSpritesLoaded++; };
      img.src = `/assets/sprites/wall-side/tile${String(i).padStart(2, "0")}.png`;
      this.wallHSprites.push(img);
    }
    for (let i = 0; i < 7; i++) {
      const img = new Image();
      img.onload = () => { this.wallTopSpritesLoaded++; };
      img.src = `/assets/sprites/wall-top/tile${String(i).padStart(2, "0")}.png`;
      this.wallTopSprites.push(img);
    }
    this.wallHLeftSprite = new Image();
    this.wallHLeftSprite.onload = () => { this.wallHLeftReady = true; };
    this.wallHLeftSprite.src = "/assets/sprites/wall-side-left.png";
    this.wallHRightSprite = new Image();
    this.wallHRightSprite.onload = () => { this.wallHRightReady = true; };
    this.wallHRightSprite.src = "/assets/sprites/wall-side-right.png";
    this.wallTopCrossSprite = new Image();
    this.wallTopCrossSprite.onload = () => { this.wallTopCrossReady = true; };
    this.wallTopCrossSprite.src = "/assets/sprites/wall-top-cross.png";
    this.wallTopIntersectSprite = new Image();
    this.wallTopIntersectSprite.onload = () => { this.wallTopIntersectReady = true; };
    this.wallTopIntersectSprite.src = "/assets/sprites/wall-top-intersect.png";
    this.wallTopCornerSprite = new Image();
    this.wallTopCornerSprite.onload = () => { this.wallTopCornerReady = true; };
    this.wallTopCornerSprite.src = "/assets/sprites/wall-top-corner.png";
    this.wallTopKnubSprite = new Image();
    this.wallTopKnubSprite.onload = () => { this.wallTopKnubReady = true; };
    this.wallTopKnubSprite.src = "/assets/sprites/wall-top-knub.png";
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera = new Camera(width, height);
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused) {
      this.interactCooldown = true;
      setTimeout(() => { this.interactCooldown = false; }, 300);
    }
  }

  changeTiles(changes: { col: number; row: number; newTile: number }[]) {
    for (const change of changes) {
      setTileAt(change.col, change.row, change.newTile);
      // Keep solidMap in sync for tile-based solidity (WALL/VOID).
      // Note: pedestal-based solidity (row+1 blocked) is set at build time
      // and is unaffected here since changeTiles does not touch objectMap.
      setSolidAt(change.col, change.row, change.newTile === TILES.WALL || change.newTile === TILES.VOID);
    }
  }

  start() {
    this.camera.snapTo(
      this.player.x + this.player.width  / 2,
      this.player.y + this.player.height / 2,
    );
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    cancelAnimationFrame(this.animationFrameId);
  }

  private loop = (currentTime: number) => {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (!this.paused) {
      this.update(deltaTime);
    }
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private isSolid(col: number, row: number): boolean {
    if (row < 0 || row >= museumMap.length || col < 0 || col >= museumMap[0].length) {
      return true;
    }
    return solidMap[row][col];
  }

  private update(dt: number) {
    const { player } = this;
    const moveAmount = player.speed * dt;

    let dx = 0;
    let dy = 0;

    if (this.input.isDown("ArrowUp") || this.input.isDown("w")) dy -= moveAmount;
    if (this.input.isDown("ArrowDown") || this.input.isDown("s")) dy += moveAmount;
    if (this.input.isDown("ArrowLeft") || this.input.isDown("a")) dx -= moveAmount;
    if (this.input.isDown("ArrowRight") || this.input.isDown("d")) dx += moveAmount;

    if (dx !== 0) {
      player.x += dx;
      this.resolveCollisionX(dx);
    }
    if (dy !== 0) {
      player.y += dy;
      this.resolveCollisionY(dy);
    }

    this.camera.follow(
      player.x + player.width / 2,
      player.y + player.height / 2,
      dt
    );

    const nearby = getNearbyInteractable(
      player.x, player.y, player.width, player.height
    );

    if (nearby) {
      if (this.currentNearby !== nearby) {
        this.currentNearby = nearby;
        this.onEvent?.({ type: "nearby", content: nearby.content });
      }

      const ePressed = this.input.isDown("e") || this.input.isDown("E") || this.input.isDown("Enter");
      if (ePressed && !this.interactCooldown) {
        this.onEvent?.({ type: "interact", content: nearby.content });
        this.interactCooldown = true;
        setTimeout(() => { this.interactCooldown = false; }, 500);
      }
    } else if (this.currentNearby !== null) {
      this.currentNearby = null;
      this.onEvent?.({ type: "leave" });
    }
  }

  private resolveCollisionX(direction: number) {
    const { player } = this;
    const topRow = Math.floor(player.y / TILE_SIZE);
    const bottomRow = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);

    if (direction < 0) {
      const col = Math.floor(player.x / TILE_SIZE);
      for (let row = topRow; row <= bottomRow; row++) {
        if (this.isSolid(col, row)) {
          player.x = (col + 1) * TILE_SIZE;
          break;
        }
      }
    } else {
      const col = Math.floor((player.x + player.width - 0.01) / TILE_SIZE);
      for (let row = topRow; row <= bottomRow; row++) {
        if (this.isSolid(col, row)) {
          player.x = col * TILE_SIZE - player.width;
          break;
        }
      }
    }
  }

  private resolveCollisionY(direction: number) {
    const { player } = this;
    const leftCol = Math.floor(player.x / TILE_SIZE);
    const rightCol = Math.floor((player.x + player.width - 0.01) / TILE_SIZE);

    if (direction < 0) {
      const row = Math.floor(player.y / TILE_SIZE);
      for (let col = leftCol; col <= rightCol; col++) {
        if (this.isSolid(col, row)) {
          player.y = (row + 1) * TILE_SIZE;
          break;
        }
      }
    } else {
      const row = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);
      for (let col = leftCol; col <= rightCol; col++) {
        if (this.isSolid(col, row)) {
          player.y = row * TILE_SIZE - player.height;
          break;
        }
      }
    }
  }

  private render() {
    const { ctx, canvas, camera, player } = this;
    const camX = Math.round(camera.x);
    const camY = Math.round(camera.y);

    // Background — shows through VOID tiles
    ctx.fillStyle = COLORS.CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Extra rows above so tall wall sprites (up to 3 tiles high) don't pop in.
    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE) - 2);
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE) - 5);
    const endCol   = Math.min(museumMap[0].length - 1, Math.ceil((camX + canvas.width)  / TILE_SIZE) + 2);
    const endRow   = Math.min(museumMap.length - 1,    Math.ceil((camY + canvas.height) / TILE_SIZE) + 2);

    // Returns 'left', 'middle', 'right', or null for non-horizontal wall tiles.
    // Left/right edges: one horizontal neighbor is non-wall; middle: both are wall.
    const horizWallType = (row: number, col: number): 'left' | 'middle' | 'right' | null => {
      if (museumMap[row]?.[col] !== TILES.WALL) return null;
      const above = row > 0 ? museumMap[row - 1][col] : TILES.VOID;
      const below = row + 1 < museumMap.length ? museumMap[row + 1][col] : TILES.VOID;
      if (above === TILES.WALL && below === TILES.WALL) return null;
      const left  = museumMap[row]?.[col - 1] ?? TILES.VOID;
      const right = museumMap[row]?.[col + 1] ?? TILES.VOID;
      const leftIsWall  = left  === TILES.WALL;
      const rightIsWall = right === TILES.WALL;
      if (leftIsWall && rightIsWall) return 'middle';
      if (!leftIsWall && rightIsWall) return 'left';
      if (leftIsWall && !rightIsWall) return 'right';
      return null;
    };

    // Pass 0: void tiles — drawn beneath everything so wall/floor edges blend naturally.
    ctx.fillStyle = COLORS.CANVAS_BG;
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = museumMap[row]?.[col];
        if (tile !== TILES.VOID && tile !== undefined) continue;
        ctx.fillRect(col * TILE_SIZE - camX, row * TILE_SIZE - camY, TILE_SIZE, TILE_SIZE);
      }
    }

    // Pass 1: flat base layer — floor sprites and wall solid colors.
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = museumMap[row]?.[col];
        if (tile === undefined || tile === TILES.VOID) continue;
        const screenX = col * TILE_SIZE - camX;
        const screenY = row * TILE_SIZE - camY;
        if (this.floorSpritesLoaded === 2 && (TILE_COLORS[tile] ?? TILE_COLORS[TILES.FLOOR]) === COLORS.FLOOR) {
          ctx.drawImage(this.floorSprites[(row * 7 + col * 13) & 1], screenX, screenY, TILE_SIZE, TILE_SIZE);
        }

        if (tile === TILES.WALL && this.floorSpritesLoaded === 2) {
          const hwType = horizWallType(row, col);
          const isFloorTile = (t: number | undefined) =>
            t !== undefined && t !== TILES.VOID && (TILE_COLORS[t] ?? TILE_COLORS[TILES.FLOOR]) === COLORS.FLOOR;
          if (hwType === 'left' && isFloorTile(museumMap[row]?.[col - 1])) {
            const img = this.floorSprites[(row * 7 + (col - 1) * 13) & 1];
            ctx.drawImage(img, img.naturalWidth / 2, 0, img.naturalWidth / 2, img.naturalHeight,
              screenX, screenY, TILE_SIZE / 2, TILE_SIZE);
          } else if (hwType === 'right' && isFloorTile(museumMap[row]?.[col + 1])) {
            const img = this.floorSprites[(row * 7 + (col + 1) * 13) & 1];
            ctx.drawImage(img, 0, 0, img.naturalWidth / 2, img.naturalHeight,
              screenX + TILE_SIZE / 2, screenY, TILE_SIZE / 2, TILE_SIZE);
          }
        }
      }
    }

    // Pass 2: y-sorted sprites — within each sort row: wall-tops → knubs → walls → player → objects.
    // Returns rotation for a 3-neighbor intersection, or null if not one.
    // Sprite faces left+top+right (missing S = 0°); rotate to match missing side.
    const intersectAngle = (row: number, col: number): number | null => {
      if (museumMap[row]?.[col] !== TILES.WALL) return null;
      const hasN = museumMap[row-1]?.[col] === TILES.WALL;
      const hasS = museumMap[row+1]?.[col] === TILES.WALL;
      const hasE = museumMap[row]?.[col+1] === TILES.WALL;
      const hasW = museumMap[row]?.[col-1] === TILES.WALL;
      if ((hasN?1:0)+(hasS?1:0)+(hasE?1:0)+(hasW?1:0) !== 3) return null;
      if (!hasS) return 0;
      if (!hasW) return Math.PI / 2;
      if (!hasN) return Math.PI;
      return -Math.PI / 2;
    };

    const playerSortRow = Math.floor((player.y + player.height - 0.01) / TILE_SIZE);
    const nsewDirs: Array<['N'|'S'|'E'|'W', number, number]> = [['N',-1,0],['S',1,0],['E',0,1],['W',0,-1]];

    for (let sortRow = startRow; sortRow <= endRow + 1; sortRow++) {
      const row = sortRow - 1;
      const inRange = row >= 0 && row < museumMap.length;

      // Vertical wall-top sprites (null horizWallType walls)
      if (inRange && (this.wallTopSpritesLoaded === 7 || this.wallTopIntersectReady)) {
        for (let col = startCol; col <= endCol; col++) {
          if (museumMap[row][col] !== TILES.WALL || horizWallType(row, col) !== null) continue;
          const screenX = col * TILE_SIZE - camX;
          const screenY = row * TILE_SIZE - camY;
          const hasN = museumMap[row-1]?.[col] === TILES.WALL;
          const hasS = museumMap[row+1]?.[col] === TILES.WALL;
          const hasE = museumMap[row]?.[col+1] === TILES.WALL;
          const hasW = museumMap[row]?.[col-1] === TILES.WALL;
          const neighborCount = (hasN?1:0)+(hasS?1:0)+(hasE?1:0)+(hasW?1:0);
          const iAngle = intersectAngle(row, col);
          let angle: number;
          let sprite: HTMLImageElement | null;
          if (neighborCount === 4 && this.wallTopCrossReady) {
            angle  = ((row * 13 + col * 7) % 4) * (Math.PI / 2);
            sprite = this.wallTopCrossSprite;
          } else if (iAngle !== null && this.wallTopIntersectReady) {
            angle  = iAngle;
            sprite = this.wallTopIntersectSprite;
          } else if (neighborCount < 3 && this.wallTopSpritesLoaded === 7) {
            angle  = Math.PI / 2;
            sprite = this.wallTopSprites[(row * 11 + col * 17) % 7];
          } else {
            continue;
          }
          if (!sprite) continue;
          ctx.save();
          ctx.translate(screenX + TILE_SIZE / 2, screenY - 2.5 * TILE_SIZE);
          ctx.rotate(angle);
          ctx.drawImage(sprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
          ctx.restore();
        }
      }

      // Wall-top knubs (walls with exactly one NSEW wall neighbor)
      if (inRange && this.wallTopKnubReady) {
        for (let col = startCol; col <= endCol; col++) {
          if (museumMap[row][col] !== TILES.WALL) continue;
          const wallNeighbors = nsewDirs.filter(([,dr,dc]) => museumMap[row+dr]?.[col+dc] === TILES.WALL);
          if (wallNeighbors.length !== 1) continue;
          const [dir] = wallNeighbors[0];
          const angle = dir === 'W' ? 0 : dir === 'E' ? Math.PI : dir === 'N' ? -Math.PI/2 : Math.PI/2;
          const screenX = col * TILE_SIZE - camX;
          const screenY = row * TILE_SIZE - camY;
          ctx.save();
          ctx.translate(screenX + TILE_SIZE / 2, screenY - 2.5 * TILE_SIZE);
          ctx.rotate(angle);
          ctx.drawImage(this.wallTopKnubSprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
          ctx.restore();
        }
      }

      // Horizontal wall sprites (left / middle / right)
      if (inRange) {
        for (let col = startCol; col <= endCol; col++) {
          const type = horizWallType(row, col);
          if (!type) continue;
          const screenX = col * TILE_SIZE - camX;
          const screenY = row * TILE_SIZE - camY;
          let img: HTMLImageElement | null = null;
          if (type === 'left'   && this.wallHLeftReady)           img = this.wallHLeftSprite;
          if (type === 'right'  && this.wallHRightReady)          img = this.wallHRightSprite;
          if (type === 'middle' && this.wallHSpritesLoaded === 5) img = this.wallHSprites[(row * 7 + col * 13) % 5];
          if (!img) continue;
          ctx.drawImage(img, screenX, screenY - 2 * TILE_SIZE, TILE_SIZE, 3 * TILE_SIZE);
          if (type === 'middle') {
            const iAngle = intersectAngle(row, col);
            if (iAngle !== null && this.wallTopIntersectReady) {
              ctx.save();
              ctx.translate(screenX + TILE_SIZE / 2, screenY - 2.5 * TILE_SIZE);
              ctx.rotate(iAngle);
              ctx.drawImage(this.wallTopIntersectSprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
              ctx.restore();
            } else if (iAngle === null && this.wallTopSpritesLoaded === 7) {
              ctx.drawImage(this.wallTopSprites[(row * 11 + col * 17) % 7], screenX, screenY - 3 * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
          }
          if ((type === 'left' || type === 'right') && this.wallTopCornerReady) {
            const hasN = museumMap[row - 1]?.[col] === TILES.WALL;
            const hasS = museumMap[row + 1]?.[col] === TILES.WALL;
            if (hasN || hasS) {
              const hasW = type === 'right';
              const angle = hasN && hasW ? 0 : hasN ? Math.PI / 2 : hasW ? -Math.PI / 2 : Math.PI;
              ctx.save();
              ctx.translate(screenX + TILE_SIZE / 2, screenY - 2.5 * TILE_SIZE);
              ctx.rotate(angle);
              ctx.drawImage(this.wallTopCornerSprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
              ctx.restore();
            }
          }
        }
      }

      // Player
      if (sortRow === playerSortRow) {
        ctx.fillStyle = COLORS.SAGE;
        ctx.fillRect(Math.round(player.x - camX), Math.round(player.y - camY), player.width, player.height);
      }

      // Objects and glow
      if (inRange) {
        for (let col = startCol; col <= endCol; col++) {
          const screenX = col * TILE_SIZE - camX;
          const screenY = row * TILE_SIZE - camY;

          if (this.currentNearby?.row === row && this.currentNearby?.col === col) {
            ctx.save();
            ctx.shadowColor = COLORS.SAGE;
            ctx.shadowBlur = 40;
            ctx.fillStyle = COLORS.SAGE_GLOW_FILL;
            ctx.fillRect(screenX - 6, screenY - 6, TILE_SIZE + 12, TILE_SIZE + 12);
            ctx.shadowBlur = 20;
            ctx.strokeStyle = COLORS.SAGE_GLOW_STROKE;
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.restore();
          }

          const obj = objectMap[row][col];
          if (obj === null) continue;
          const pad = Math.round(TILE_SIZE / 5);
          ctx.fillStyle = OBJECT_COLORS[obj] ?? "#888888";
          ctx.fillRect(screenX + pad, screenY + pad, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2);
        }
      }
    }
  }
}
