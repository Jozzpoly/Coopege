import {
  InputRouter,
  PRIMARY_SLOT_ID,
  SECONDARY_PLAYER_ID,
  SECONDARY_SLOT_ID,
  type GameWorld,
  type InputFrame,
  type PlayerActor,
  type PlayerCommand,
  type PlayerSlotId,
  type Vec2,
} from "../../../packages/gameplay/src/index.js";
import type { RuntimeRenderer } from "./renderer.js";

const GAMEPAD_DEADZONE = 0.18;
const P2_CONTROL_CODES = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ControlRight", "Numpad0"]);

function deadzone(value: number | undefined): number {
  const safe = Number.isFinite(value) ? value! : 0;
  if (Math.abs(safe) < GAMEPAD_DEADZONE) return 0;
  const normalized = (Math.abs(safe) - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE);
  return Math.sign(safe) * Math.min(1, normalized);
}

function neutralCommand(): PlayerCommand {
  return { moveX: 0, moveY: 0, aimX: 1, aimY: 0, usePrimary: false };
}

export function selectConnectedGamepad(
  gamepads: readonly (Gamepad | null)[],
  deviceIndex?: number | null,
): Gamepad | null {
  const connected = gamepads.filter((gamepad): gamepad is Gamepad => gamepad !== null && gamepad.connected);
  if (deviceIndex !== undefined && deviceIndex !== null) return connected.find((gamepad) => gamepad.index === deviceIndex) ?? null;
  return connected.sort((left, right) => left.index - right.index)[0] ?? null;
}


export function resolvePointerAim(
  pointerClient: Vec2 | undefined,
  playerPosition: Vec2,
  fallback: Vec2,
  screenToWorld: (clientX: number, clientY: number) => Vec2,
): Vec2 {
  if (!pointerClient) return { ...fallback };
  const pointerWorld = screenToWorld(pointerClient.x, pointerClient.y);
  return { x: pointerWorld.x - playerPosition.x, y: pointerWorld.y - playerPosition.y };
}

export class LocalCoopInputAdapter {
  private readonly pressed = new Set<string>();
  private readonly router = new InputRouter();
  private readonly virtualCommands = new Map<PlayerSlotId, PlayerCommand>();
  private readonly queuedAttacks = new Set<PlayerSlotId>();
  private pointerClient: Vec2 | undefined;
  private secondaryKeyboardAim: Vec2 = { x: 1, y: 0 };
  private gamepadJoinLatch = false;
  private keyboardJoinLatch = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly renderer: RuntimeRenderer,
  ) {
    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ControlRight", "Numpad0"].includes(event.code)) event.preventDefault();
      this.pressed.add(event.code);
      if (!event.repeat && (event.code === "Space" || event.code === "KeyF")) this.queuedAttacks.add(PRIMARY_SLOT_ID);
      if (!event.repeat && (event.code === "ControlRight" || event.code === "Numpad0")) this.queuedAttacks.add(SECONDARY_SLOT_ID);
    });
    window.addEventListener("keyup", (event) => this.pressed.delete(event.code));
    window.addEventListener("blur", () => {
      this.pressed.clear();
      this.queuedAttacks.clear();
    });
    canvas.addEventListener("pointermove", (event) => {
      this.pointerClient = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener("pointerdown", (event) => {
      if (event.button === 0) {
        this.queuedAttacks.add(PRIMARY_SLOT_ID);
        this.pointerClient = { x: event.clientX, y: event.clientY };
      }
    });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  capture(world: GameWorld): InputFrame {
    this.pollJoin(world);
    this.router.sync(world.playerSlots);
    const commands = new Map<PlayerSlotId, PlayerCommand>();
    const primary = world.getPlayer(world.playerId);
    if (primary) commands.set(PRIMARY_SLOT_ID, this.withQueuedAttack(PRIMARY_SLOT_ID, this.keyboardMouseCommand(primary)));
    if (world.getPlayer(SECONDARY_PLAYER_ID)) {
      const virtual = this.virtualCommands.get(SECONDARY_SLOT_ID);
      const slot = world.playerSlots.find((entry) => entry.slotId === SECONDARY_SLOT_ID);
      const useGamepad = slot?.deviceKind === "gamepad" && this.connectedGamepad(slot.deviceIndex) !== null;
      const secondary = virtual ?? (useGamepad ? this.gamepadCommand(slot?.deviceIndex) : this.secondaryKeyboardCommand());
      commands.set(SECONDARY_SLOT_ID, this.withQueuedAttack(SECONDARY_SLOT_ID, secondary));
    }
    const frame = this.router.createFrame(world.tick + 1, commands);
    this.queuedAttacks.clear();
    return frame;
  }

  queueAttack(slotId: PlayerSlotId = PRIMARY_SLOT_ID): void {
    this.queuedAttacks.add(slotId);
  }

  setVirtualCommand(slotId: PlayerSlotId, command: PlayerCommand | null): void {
    if (command) this.virtualCommands.set(slotId, { ...command });
    else this.virtualCommands.delete(slotId);
  }

  joinSecondPlayer(world: GameWorld, preferredDevice?: "keyboard" | "gamepad" | "virtual"): PlayerActor {
    if (world.getPlayer(SECONDARY_PLAYER_ID)) return world.getPlayer(SECONDARY_PLAYER_ID)!;
    const virtual = this.virtualCommands.has(SECONDARY_SLOT_ID);
    const gamepad = this.connectedGamepad();
    const deviceKind = preferredDevice
      ?? (virtual ? "virtual" : gamepad ? "gamepad" : "keyboard");
    return world.joinPlayer({
      playerId: SECONDARY_PLAYER_ID,
      slotId: SECONDARY_SLOT_ID,
      deviceKind,
      deviceIndex: deviceKind === "gamepad" && gamepad ? gamepad.index : null,
    });
  }

  leaveSecondPlayer(world: GameWorld): void {
    if (world.getPlayer(SECONDARY_PLAYER_ID)) world.leavePlayer(SECONDARY_PLAYER_ID);
    this.queuedAttacks.delete(SECONDARY_SLOT_ID);
  }

  private pollJoin(world: GameWorld): void {
    const gamepad = this.connectedGamepad();
    const gamepadJoinPressed = gamepad?.buttons[9]?.pressed === true || gamepad?.buttons[0]?.pressed === true;
    const keyboardJoinPressed = [...P2_CONTROL_CODES].some((code) => this.pressed.has(code));
    if (!world.getPlayer(SECONDARY_PLAYER_ID)) {
      if (keyboardJoinPressed && !this.keyboardJoinLatch) this.joinSecondPlayer(world, "keyboard");
      else if (gamepadJoinPressed && !this.gamepadJoinLatch) this.joinSecondPlayer(world, "gamepad");
    }
    this.keyboardJoinLatch = keyboardJoinPressed;
    this.gamepadJoinLatch = gamepadJoinPressed;
  }

  private keyboardMouseCommand(player: PlayerActor): PlayerCommand {
    const moveX = (this.isPressed("KeyD") ? 1 : 0) - (this.isPressed("KeyA") ? 1 : 0);
    const moveY = (this.isPressed("KeyS") ? 1 : 0) - (this.isPressed("KeyW") ? 1 : 0);
    const aim = this.aimDirection(player);
    return { moveX, moveY, aimX: aim.x, aimY: aim.y, usePrimary: false };
  }

  private secondaryKeyboardCommand(): PlayerCommand {
    const moveX = (this.isPressed("ArrowRight") ? 1 : 0) - (this.isPressed("ArrowLeft") ? 1 : 0);
    const moveY = (this.isPressed("ArrowDown") ? 1 : 0) - (this.isPressed("ArrowUp") ? 1 : 0);
    if (Math.hypot(moveX, moveY) > 0.01) {
      const length = Math.hypot(moveX, moveY);
      this.secondaryKeyboardAim = { x: moveX / length, y: moveY / length };
    }
    return { moveX, moveY, aimX: this.secondaryKeyboardAim.x, aimY: this.secondaryKeyboardAim.y, usePrimary: false };
  }

  private connectedGamepad(deviceIndex?: number | null): Gamepad | null {
    return selectConnectedGamepad([...(navigator.getGamepads?.() ?? [])], deviceIndex);
  }

  private gamepadCommand(deviceIndex?: number | null): PlayerCommand {
    const gamepad = this.connectedGamepad(deviceIndex);
    if (!gamepad) return neutralCommand();
    const moveX = deadzone(gamepad.axes[0]);
    const moveY = deadzone(gamepad.axes[1]);
    let aimX = deadzone(gamepad.axes[2]);
    let aimY = deadzone(gamepad.axes[3]);
    if (Math.hypot(aimX, aimY) < 0.01 && Math.hypot(moveX, moveY) > 0.01) {
      aimX = moveX;
      aimY = moveY;
    }
    if (Math.hypot(aimX, aimY) < 0.01) aimX = 1;
    return {
      moveX,
      moveY,
      aimX,
      aimY,
      usePrimary: gamepad.buttons[0]?.pressed === true || (gamepad.buttons[7]?.value ?? 0) > 0.55,
    };
  }

  private withQueuedAttack(slotId: PlayerSlotId, command: PlayerCommand): PlayerCommand {
    return this.queuedAttacks.has(slotId) ? { ...command, usePrimary: true } : command;
  }

  private isPressed(...codes: string[]): boolean {
    return codes.some((code) => this.pressed.has(code));
  }

  private aimDirection(player: PlayerActor): Vec2 {
    return resolvePointerAim(this.pointerClient, player.position, player.facing, (x, y) => this.renderer.screenToWorld(x, y));
  }
}
