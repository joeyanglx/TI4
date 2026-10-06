import type { TokenSlot } from '@ti4/shared';

// Drag-and-drop payload types from the sidebar onto the board.
export const PIECE_MIME = 'application/x-ti4-piece';
export const SYSTEM_MIME = 'application/x-ti4-system';
/** A command or speaker token dragged off a player's panel: JSON `TokenDrag`. */
export const TOKEN_MIME = 'application/x-ti4-token';

export interface TokenDrag {
  player: string;
  from: TokenSlot;
}

/**
 * Panel elements that accept tokens dragged off the map carry these data attributes;
 * the board finds them with elementFromPoint when a Konva drag ends.
 */
export function tokenDropTarget(clientX: number, clientY: number): { player: string; slot: TokenSlot } | undefined {
  const el = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-token-slot]');
  const player = el?.dataset.player;
  const slot = el?.dataset.tokenSlot as TokenSlot | undefined;
  return player && slot ? { player, slot } : undefined;
}
