import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Circle, Group, Layer, Line, Rect, RegularPolygon, Stage, Text } from 'react-konva';
import type Konva from 'konva';
import {
  NEUTRAL_PIECES,
  PIECE_STYLE,
  PLAYER_COLORS,
  UNIT_KINDS,
  hexCorners,
  hexKey,
  hexToPixel,
  hexesInRadius,
  makeTile,
  pixelToHex,
  planetAt,
  stackSize,
  type Action,
  type GameState,
  type Piece,
  type PieceShapeKind,
  type PieceKind,
  type PlayerColor,
  type Tile,
} from '@ti4/shared';
import { PIECE_MIME, SYSTEM_MIME, TOKEN_MIME, tokenDropTarget, type TokenDrag } from '../dnd';
import { newId } from '../id';
import { PieceMenu } from './PieceMenu';
import { SystemMenu } from './SystemMenu';
import { SystemCard } from './SystemCard';
import { UnitCard } from './UnitCard';
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
  me: string;
  color: PlayerColor;
  mode: BoardMode;
  dispatch: (action: Action) => void;
}

export function Board({ state, me, color, mode, dispatch }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const size = useElementSize(containerRef);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredPiece, setHoveredPiece] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ piece: string; x: number; y: number } | null>(null);
  const [systemMenu, setSystemMenu] = useState<{ system: string; planet?: string; x: number; y: number } | null>(null);
  const editing = mode === 'edit';

  /** A unit of the same kind and colour under this point, to stack onto. */
  function stackAt(kind: PieceKind, pieceColor: PlayerColor, x: number, y: number, except?: string) {
    if (!isUnit(kind)) return undefined;
    const reach = PIECE_STYLE[kind].radius * 1.2;
    return Object.values(state.pieces).find(
      (p) => p.id !== except && p.kind === kind && p.color === pieceColor && Math.hypot(p.x - x, p.y - y) <= reach,
    );
  }

  function openMenu(piece: Piece, clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setMenu({ piece: piece.id, x: clientX - rect.left, y: clientY - rect.top });
  }

  function openSystemMenu(tile: Tile, clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    // Right-clicking inside a planet's circle offers ground combat on that planet.
    const point = stageRef.current?.getRelativePointerPosition();
    const planet = point ? planetAt(state, point)?.planet.name : undefined;
    if (rect) setSystemMenu({ system: tile.id, planet, x: clientX - rect.left, y: clientY - rect.top });
  }

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

    const token = e.dataTransfer.getData(TOKEN_MIME);
    if (token) {
      const { player, from } = JSON.parse(token) as TokenDrag;
      const tokenColor = state.seats[player]?.color ?? color;
      const kind = from === 'speaker' ? 'speaker' : 'command';
      dispatch({ type: 'token/place', player, from, piece: { id: newId(), kind, color: tokenColor, x: pos.x, y: pos.y } });
      return;
    }
    const kind = e.dataTransfer.getData(PIECE_MIME) as PieceKind;
    if (kind) {
      // Dropping a unit on a matching one adds to its stack.
      const stack = stackAt(kind, color, pos.x, pos.y);
      if (stack) dispatch({ type: 'piece/count', id: stack.id, amount: 1 });
      else dispatch({ type: 'piece/add', piece: { id: newId(), kind, color, x: pos.x, y: pos.y } });
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
        onDragStart={() => {
          setMenu(null);
          setSystemMenu(null);
        }}
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
            <TileShape
              key={tile.id}
              tile={tile}
              editable={editing}
              dispatch={dispatch}
              onHover={setHovered}
              onMenu={openSystemMenu}
            />
          ))}
          {state.battle && state.tiles[state.battle.system] && (
            // Mark the system being fought over.
            <Line
              {...hexToPixel(state.tiles[state.battle.system])}
              points={HEX_POINTS}
              closed
              stroke="#ff3b3b"
              strokeWidth={6}
              dash={[14, 8]}
              listening={false}
            />
          )}
        </Layer>
        {/* Pieces sit above tiles; in edit mode they're dimmed and ignore the mouse so tiles can be grabbed. */}
        <Layer listening={!editing} opacity={editing ? 0.4 : 1}>
          {Object.values(state.pieces).map((piece) => (
            <PieceShape
              key={piece.id}
              piece={piece}
              dispatch={dispatch}
              stackAt={stackAt}
              onMenu={openMenu}
              onHover={setHoveredPiece}
            />
          ))}
        </Layer>
      </Stage>
      {/* A unit's stats take the place of the system card while hovering a unit. */}
      {hoveredPiece && state.pieces[hoveredPiece] && isUnit(state.pieces[hoveredPiece].kind) ? (
        <UnitCard piece={state.pieces[hoveredPiece]} state={state} />
      ) : (
        hovered && <SystemCard system={hovered} state={state} />
      )}
      {systemMenu && (
        <SystemMenu
          state={state}
          system={systemMenu.system}
          planet={systemMenu.planet}
          me={me}
          x={systemMenu.x}
          y={systemMenu.y}
          dispatch={dispatch}
          onClose={() => setSystemMenu(null)}
        />
      )}
      {menu && state.pieces[menu.piece] && (
        <PieceMenu
          piece={state.pieces[menu.piece]}
          x={menu.x}
          y={menu.y}
          dispatch={dispatch}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

interface PieceProps {
  piece: Piece;
  dispatch: (action: Action) => void;
  stackAt: (kind: PieceKind, color: PlayerColor, x: number, y: number, except?: string) => Piece | undefined;
  onMenu: (piece: Piece, clientX: number, clientY: number) => void;
  onHover: (piece: string | null) => void;
}

function PieceShape({ piece, dispatch, stackAt, onMenu, onHover }: PieceProps) {
  const style = PIECE_STYLE[piece.kind];
  const isToken = piece.kind === 'command' || piece.kind === 'control';
  const neutral = NEUTRAL_PIECES[piece.kind];
  // Command and speaker tokens can be dragged off the map onto a player's panel.
  const returnable = piece.kind === 'command' || piece.kind === 'speaker';
  const count = stackSize(piece);
  const damaged = piece.damaged ?? 0;
  const badge = style.radius * 0.75;
  return (
    <Group
      x={piece.x}
      y={piece.y}
      draggable
      onMouseEnter={() => onHover(piece.id)}
      onMouseLeave={() => onHover(null)}
      onDragStart={(e) => {
        e.cancelBubble = true; // don't pan the board while moving a piece
        e.target.moveToTop();
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const target = returnable && 'clientX' in e.evt ? tokenDropTarget(e.evt.clientX, e.evt.clientY) : undefined;
        const stack = stackAt(piece.kind, piece.color, e.target.x(), e.target.y(), piece.id);
        if (target) dispatch({ type: 'token/return', piece: piece.id, player: target.player, to: target.slot });
        else if (stack) dispatch({ type: 'piece/merge', from: piece.id, into: stack.id });
        else dispatch({ type: 'piece/move', id: piece.id, x: e.target.x(), y: e.target.y() });
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        onMenu(piece, e.evt.clientX, e.evt.clientY);
      }}
    >
      {damaged > 0 && (
        // Sustained damage: a red dashed ring around the stack.
        <Circle radius={style.radius + 5} stroke="#ff3b3b" strokeWidth={3} dash={[6, 4]} listening={false} />
      )}
      <PieceBody
        shape={style.shape}
        radius={style.radius}
        fill={neutral?.fill ?? PLAYER_COLORS[piece.color]}
        stroke={neutral?.stroke ?? (isToken ? '#fff' : '#111')}
        strokeWidth={isToken || neutral ? 3 : 2}
      />
      <Text
        text={style.label}
        // Triangles have less room around their centre, so their label is smaller.
        fontSize={
          style.label.length > 3 ? style.radius * 0.36 : style.radius * (style.shape === 'triangle' ? 0.6 : 0.8)
        }
        fontStyle="bold"
        fill="#fff"
        width={style.radius * 2}
        height={style.radius * 2}
        offsetX={style.radius}
        offsetY={style.radius}
        align="center"
        verticalAlign="middle"
      />
      {count > 1 && <Badge x={badge} y={-badge} text={String(count)} fill="#111" />}
      {damaged > 0 && count > 1 && <Badge x={-badge} y={-badge} text={String(damaged)} fill="#c62828" />}
    </Group>
  );
}

interface BodyProps {
  shape: PieceShapeKind;
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

/** The piece outline, sized so every shape covers roughly the same area as a circle of `radius`. */
function PieceBody({ shape, radius, ...paint }: BodyProps) {
  const common = { ...paint, shadowBlur: 4, shadowOpacity: 0.5 };
  switch (shape) {
    case 'square': {
      const side = radius * 1.75;
      return <Rect width={side} height={side} offsetX={side / 2} offsetY={side / 2} cornerRadius={2} {...common} />;
    }
    case 'hexagon':
      // Flat-topped, to match the system tiles.
      return <RegularPolygon sides={6} radius={radius * 1.1} rotation={30} {...common} />;
    case 'triangle':
      return <RegularPolygon sides={3} radius={radius * 1.4} {...common} />;
    case 'circle':
      return <Circle radius={radius} {...common} />;
  }
}

/** A small numbered circle on a piece: stack size (top right) or damaged units (top left). */
function Badge({ x, y, text, fill }: { x: number; y: number; text: string; fill: string }) {
  const r = 10;
  return (
    <Group x={x} y={y} listening={false}>
      <Circle radius={r} fill={fill} stroke="#fff" strokeWidth={1.5} />
      <Text
        text={text}
        fontSize={12}
        fontStyle="bold"
        fill="#fff"
        width={r * 2}
        height={r * 2}
        offsetX={r}
        offsetY={r}
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );
}

function isUnit(kind: PieceKind) {
  return (UNIT_KINDS as readonly string[]).includes(kind);
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
