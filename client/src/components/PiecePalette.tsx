import {
  PIECE_STYLE,
  PLAYER_COLORS,
  TOKEN_KINDS,
  UNIT_KINDS,
  type Edition,
  type PieceKind,
  type PlayerColor,
} from '@ti4/shared';
import { PIECE_MIME } from '../dnd';

interface Props {
  color: PlayerColor;
  onColorChange: (color: PlayerColor) => void;
  edition: Edition;
}

export function PiecePalette({ color, onColorChange, edition }: Props) {
  // Mechs arrived with Prophecy of Kings.
  const units = UNIT_KINDS.filter((kind) => kind !== 'mech' || edition !== 'base');
  return (
    <>
      <h2>Colour</h2>
      <div className="swatches">
        {(Object.keys(PLAYER_COLORS) as PlayerColor[]).map((c) => (
          <button
            key={c}
            className={`swatch ${c === color ? 'selected' : ''}`}
            style={{ background: PLAYER_COLORS[c] }}
            onClick={() => onColorChange(c)}
            title={c}
          />
        ))}
      </div>
      <h2>Units</h2>
      <PieceList kinds={units} color={color} />
      <h2>Tokens</h2>
      <PieceList kinds={TOKEN_KINDS} color={color} />
      <p className="hint">
        Drag onto the board. Drag empty space to pan, scroll to zoom. Right-click a piece to remove it.
      </p>
    </>
  );
}

function PieceList({ kinds, color }: { kinds: readonly PieceKind[]; color: PlayerColor }) {
  return (
    <div className="piece-list">
      {kinds.map((kind) => (
        <div
          key={kind}
          className="piece-chip"
          draggable
          onDragStart={(e) => e.dataTransfer.setData(PIECE_MIME, kind)}
        >
          <span className="dot" style={{ background: PLAYER_COLORS[color] }}>
            {PIECE_STYLE[kind].label}
          </span>
          {kind}
        </div>
      ))}
    </div>
  );
}
