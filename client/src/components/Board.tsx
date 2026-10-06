import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Circle, Group, Layer, Line, Stage, Text } from 'react-konva';
import type Konva from 'konva';
import {
  PIECE_STYLE,
  PLAYER_COLORS,
  hexCorners,
  hexToPixel,
  type Action,
  type GameState,
  type Piece,
  type PieceKind,
  type PlayerColor,
  type Tile,
} from '@ti4/shared';
import { newId } from '../id';
import { DRAG_MIME } from './Palette';

const HEX_POINTS = hexCorners();
const ZOOM_STEP = 1.1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

interface Props {
  state: GameState;
  color: PlayerColor;
  dispatch: (action: Action) => void;
}

export function Board({ state, color, dispatch }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const size = useElementSize(containerRef);

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
    const kind = e.dataTransfer.getData(DRAG_MIME) as PieceKind;
    const stage = stageRef.current;
    if (!kind || !stage) return;
    e.preventDefault();
    stage.setPointersPositions(e);
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;
    dispatch({ type: 'piece/add', piece: { id: newId(), kind, color, x: pos.x, y: pos.y } });
  }

  return (
    <div
      className="board"
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
          {Object.values(state.tiles).map((tile) => (
            <TileShape key={tile.id} tile={tile} />
          ))}
        </Layer>
        <Layer>
          {Object.values(state.pieces).map((piece) => (
            <PieceShape key={piece.id} piece={piece} dispatch={dispatch} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function TileShape({ tile }: { tile: Tile }) {
  const { x, y } = hexToPixel(tile);
  return (
    <Group x={x} y={y}>
      <Line points={HEX_POINTS} closed fill="#1b2235" stroke="#4a5577" strokeWidth={2} />
      {tile.system && (
        <Text text={tile.system} fontSize={22} fill="#8f9bbd" x={-40} y={-80} width={80} align="center" />
      )}
    </Group>
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
