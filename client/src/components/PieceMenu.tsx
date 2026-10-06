import { useEffect, useRef } from 'react';
import { UNIT_KINDS, stackSize, type Action, type Piece } from '@ti4/shared';
import { newId } from '../id';

interface Props {
  piece: Piece;
  /** Position inside the board, in CSS pixels. */
  x: number;
  y: number;
  dispatch: (action: Action) => void;
  onClose: () => void;
}

/** Right-click menu for a piece: change the stack size, split one off, mark sustained damage, or remove it. */
export function PieceMenu({ piece, x, y, dispatch, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const count = stackSize(piece);
  const damaged = piece.damaged ?? 0;
  const isUnit = (UNIT_KINDS as readonly string[]).includes(piece.kind);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const act = (action: Action, close = false) => {
    dispatch(action);
    if (close) onClose();
  };

  return (
    <div className="piece-menu" ref={ref} style={{ left: x, top: y }} onContextMenu={(e) => e.preventDefault()}>
      {isUnit && (
        <>
          <div className="piece-menu-title">
            {count} × {piece.kind}
            {damaged > 0 && <span className="damaged"> · {damaged} damaged</span>}
          </div>
          <button onClick={() => act({ type: 'piece/count', id: piece.id, amount: 1 })}>Add one</button>
          <button disabled={count < 2} onClick={() => act({ type: 'piece/count', id: piece.id, amount: -1 })}>
            Remove one
          </button>
          <button
            disabled={count < 2}
            title="Take one unit off as its own piece"
            onClick={() =>
              act({ type: 'piece/split', id: piece.id, newId: newId(), x: piece.x + 30, y: piece.y + 30 }, true)
            }
          >
            Split one off
          </button>
          <button
            disabled={damaged >= count}
            onClick={() => act({ type: 'piece/damage', id: piece.id, amount: 1 })}
          >
            Sustain damage
          </button>
          <button disabled={damaged === 0} onClick={() => act({ type: 'piece/damage', id: piece.id, amount: -1 })}>
            Repair one
          </button>
        </>
      )}
      <button className="danger" onClick={() => act({ type: 'piece/remove', id: piece.id }, true)}>
        {isUnit && count > 1 ? 'Remove stack' : 'Remove'}
      </button>
    </div>
  );
}
