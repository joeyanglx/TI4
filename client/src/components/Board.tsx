import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Circle, Group, Layer, Line, Stage, Text } from 'react-konva';
import type Konva from 'konva';
import {
  PIECE_STYLE,
  PLAYER_COLORS,
  hexCorners,
  hexKey,
  hexToPixel,
  hexesInRadius,
  makeTile,
  pixelToHex,
  type Action,
  type GameState,
  type Piece,
  type PieceKind,
  type PlayerColor,
} from '@ti4/shared';
import { PIECE_MIME, SYSTEM_MIME } from '../dnd';
import { newId } from '../id';
import { SystemCard } from './SystemCard';
import { TileShape } from './TileShape';

export type BoardMode = 'play' | 'edit';

const HEX_POINTS = hexCorners();
/** Faint outlines shown where systems can go (radius 4 fits an 8-player map). */
const GUIDE_HEXES = hexesInRadius(4);
const ZOOM_STEP = 1.1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

interface Props {
  state: GameState;
  color: PlayerColor;
  mode: BoardMode;
  dispatch: (action: Action) => void;
}

export function Board({ state, color, mode, dispatch }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const size = useElementSize(containerRef);
  const [hovered, setHovered] = useState<string | null>(null);
  const editing = mode === 'edit';

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;
    const oldScale = stage.scaleX();
    const scale = clamp(e.evt.deltaY < 0 ? oldScale * ZOOM_STEP : oldScale / ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
    const anchor = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    stage.scale({ x: scale, y: scale });
    stage.position({ x: pointer.x - anchor.x * scale, y: pointer.y - anchor.y * scale });
  }

  function handleDrop(e: DragEvent) {
    const stage = stageRef.current;
    if (!stage) return;
    e.preventDefault();
    stage.setPointersPositions(e);
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;

    const kind = e.dataTransfer.getData(PIECE_MIME) as PieceKind;
    if (kind) {
      dispatch({ type: 'piece/add', piece: { id: newId(), kind, color, x: pos.x, y: pos.y } });
      return;
    }
    const system = e.dataTransfer.getData(SYSTEM_MIME);
    if (system) dispatch({ type: 'tile/place', tile: makeTile(pixelToHex(pos), system) });
  }

  return (
    <div
      className={`board ${editing ? 'editing' : ''}`}
      ref={containerRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={size.width / 2}
        y={size.height / 2}
        scaleX={0.6}
        scaleY={0.6}
        draggable
        onWheel={handleWheel}
      >
        <Layer listening={false}>
          {GUIDE_HEXES.filter((hex) => !state.tiles[hexKey(hex)]).map((hex) => {
            const { x, y } = hexToPixel(hex);
            return (
              <Line
                key={hexKey(hex)}
                x={x}
                y={y}
                points={HEX_POINTS}
                closed
                stroke="#2a3350"
                strokeWidth={2}
                dash={[8, 6]}
              />
            );
          })}
        </Layer>
        <Layer>
          {Object.values(state.tiles).map((tile) => (
            <TileShape key={tile.id} tile={tile} editable={editing} dispatch={dispatch} onHover={setHovered} />
          ))}
        </Layer>
        {/* Pieces sit above tiles; in edit mode they're dimmed and ignore the mouse so tiles can be grabbed. */}
        <Layer listening={!editing} opacity={editing ? 0.4 : 1}>
          {Object.values(state.pieces).map((piece) => (
            <PieceShape key={piece.id} piece={piece} dispatch={dispatch} />
          ))}
        </Layer>
      </Stage>
      {hovered && <SystemCard system={hovered} />}
    </div>
  );
}

function PieceShape({ piece, dispatch }: { piece: Piece; dispatch: (action: Action) => void }) {
  const style = PIECE_STYLE[piece.kind];
  const isToken = piece.kind === 'command' || piece.kind === 'control';
  return (
    <Group
      x={piece.x}
      y={piece.y}
      draggable
      onDragStart={(e) => {
        e.cancelBubble = true; // don't pan the board while moving a piece
        e.target.moveToTop();
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        dispatch({ type: 'piece/move', id: piece.id, x: e.target.x(), y: e.target.y() });
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        dispatch({ type: 'piece/remove', id: piece.id });
      }}
    >
      <Circle
        radius={style.radius}
        fill={PLAYER_COLORS[piece.color]}
        stroke={isToken ? '#fff' : '#111'}
        strokeWidth={isToken ? 3 : 2}
        shadowBlur={4}
        shadowOpacity={0.5}
      />
      <Text
        text={style.label}
        fontSize={style.radius * 0.8}
        fontStyle="bold"
        fill="#fff"
        width={style.radius * 2}
        height={style.radius * 2}
        offsetX={style.radius}
        offsetY={style.radius}
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );
}

function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
