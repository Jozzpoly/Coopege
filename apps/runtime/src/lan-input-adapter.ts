import type { LanPlayerSnapshot } from "../../../packages/lan-protocol/src/index.js";
import type { PlayerCommand, Vec2 } from "../../../packages/gameplay/src/index.js";
import { resolvePointerAim, selectConnectedGamepad } from "./input-adapter.js";
import type { RuntimeRenderer } from "./renderer.js";

const GAMEPAD_DEADZONE = 0.18;

function deadzone(value: number | undefined): number {
  const safe = Number.isFinite(value) ? value! : 0;
  if (Math.abs(safe) < GAMEPAD_DEADZONE) return 0;
  const normalized = (Math.abs(safe) - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE);
  return Math.sign(safe) * Math.min(1, normalized);
}

export class LanClientInputAdapter {
  private readonly pressed = new Set<string>();
  private pointerClient: Vec2 | undefined;
  private queuedAttack = false;
  private virtualCommand: PlayerCommand | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly renderer: RuntimeRenderer,
    private readonly onInputChanged: () => void = () => undefined,
  ) {
    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
      this.pressed.add(event.code);
      if (!event.repeat && (event.code === "Space" || event.code === "KeyF" || event.code === "ControlRight")) this.queuedAttack = true;
      this.onInputChanged();
    });
    window.addEventListener("keyup", (event) => {
      this.pressed.delete(event.code);
      this.onInputChanged();
    });
    window.addEventListener("blur", () => {
      this.pressed.clear();
      this.queuedAttack = false;
      this.onInputChanged();
    });
    canvas.addEventListener("pointermove", (event) => { this.pointerClient = { x: event.clientX, y: event.clientY }; });
    canvas.addEventListener("pointerdown", (event) => {
      if (event.button === 0) {
        this.pointerClient = { x: event.clientX, y: event.clientY };
        this.queuedAttack = true;
        this.onInputChanged();
      }
    });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  queueAttack(): void {
    this.queuedAttack = true;
    this.onInputChanged();
  }

  setVirtualCommand(command: PlayerCommand | null): void {
    this.virtualCommand = command ? { ...command } : null;
  }

  capture(player: LanPlayerSnapshot): PlayerCommand {
    if (this.virtualCommand) return { ...this.virtualCommand };
    const gamepad = selectConnectedGamepad([...(navigator.getGamepads?.() ?? [])]);
    let moveX = (this.isPressed("KeyD", "ArrowRight") ? 1 : 0) - (this.isPressed("KeyA", "ArrowLeft") ? 1 : 0);
    let moveY = (this.isPressed("KeyS", "ArrowDown") ? 1 : 0) - (this.isPressed("KeyW", "ArrowUp") ? 1 : 0);
    let aimX = player.facingX;
    let aimY = player.facingY;
    let usePrimary = this.queuedAttack;
    if (gamepad) {
      const padMoveX = deadzone(gamepad.axes[0]);
      const padMoveY = deadzone(gamepad.axes[1]);
      if (Math.hypot(padMoveX, padMoveY) > Math.hypot(moveX, moveY)) {
        moveX = padMoveX;
        moveY = padMoveY;
      }
      const padAimX = deadzone(gamepad.axes[2]);
      const padAimY = deadzone(gamepad.axes[3]);
      if (Math.hypot(padAimX, padAimY) > 0.01) {
        aimX = padAimX;
        aimY = padAimY;
      }
      usePrimary = usePrimary || gamepad.buttons[0]?.pressed === true || (gamepad.buttons[7]?.value ?? 0) > 0.55;
    }
    if (this.pointerClient) {
      const aim = resolvePointerAim(
        this.pointerClient,
        { x: player.x, y: player.y },
        { x: aimX, y: aimY },
        (x, y) => this.renderer.screenToWorld(x, y),
      );
      aimX = aim.x;
      aimY = aim.y;
    } else if (Math.hypot(aimX, aimY) < 0.01 && Math.hypot(moveX, moveY) > 0.01) {
      aimX = moveX;
      aimY = moveY;
    }
    this.queuedAttack = false;
    return { moveX, moveY, aimX, aimY, usePrimary };
  }

  private isPressed(...codes: string[]): boolean {
    return codes.some((code) => this.pressed.has(code));
  }
}
