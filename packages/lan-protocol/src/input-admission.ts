import type { ClientInputPayload, InputAdmissionContext, InputAdmissionResult } from "./types.js";

export function evaluateInputAdmission(input: ClientInputPayload, context: InputAdmissionContext): InputAdmissionResult {
  if (context.connectionId !== context.ownerConnectionId) {
    return { ok: false, code: "not_owner", message: "Połączenie nie posiada wskazanego gracza." };
  }
  if (input.sessionId !== context.sessionId) {
    return { ok: false, code: "session_mismatch", message: "Input należy do innej sesji." };
  }
  if (input.playerId !== context.playerId) {
    return { ok: false, code: "player_mismatch", message: "Input próbuje sterować graczem należącym do innego połączenia." };
  }
  if (input.inputSeq === context.lastAcceptedInputSeq) {
    return { ok: false, code: "duplicate_input", message: "Input o tym numerze został już przyjęty." };
  }
  if (input.inputSeq < context.lastAcceptedInputSeq) {
    return { ok: false, code: "out_of_order_input", message: "Input dotarł po nowszej komendzie." };
  }
  const maximumPastTicks = context.maximumPastTicks ?? 120;
  const maximumFutureTicks = context.maximumFutureTicks ?? 2;
  if (input.clientTick < context.hostTick - maximumPastTicks) {
    return { ok: false, code: "input_too_old", message: "Input jest zbyt stary względem ticka hosta." };
  }
  if (input.clientTick > context.hostTick + maximumFutureTicks) {
    return { ok: false, code: "input_from_future", message: "Input wskazuje niedozwolony przyszły tick." };
  }
  return { ok: true, acceptedInputSeq: input.inputSeq };
}
