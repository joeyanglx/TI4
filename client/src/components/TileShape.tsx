import { useState } from 'react';
import { Circle, Group, Image, Line, Text } from 'react-konva';
import type Konva from 'konva';
import { HEX_SIZE, SYSTEMS, hexCorners, hexToPixel, pixelToHex, type Action, type Hex, type Tile } from '@ti4/shared';
import { systemImageUrl, useImage } from '../tiles';

const HEX_POINTS = hexCorners();
const TILE_WIDTH = HEX_SIZE * 2;
const TILE_HEIGHT = HEX_SIZE * Math.sqrt(3);

interface Props {
  tile: Tile;
  editable: boolean;
  dispatch: (action: Action) => void;
  onHover: (system: string | null) => void;
  /** Right-click in play mode, with the mouse position on screen. */
  onMenu: (tile: Tile, clientX: number, clientY: number) => void;
}

export function TileShape({ tile, editable, dispatch, onHover, onMenu }: Props) {
  const image = useImage(systemImageUrl(tile.system));
  // Planet circles show on hover so it's clear where ground forces count as landed.
  const [hover, setHover] = useState(false);
  const planets = SYSTEMS[tile.system]?.planets.filter((p) => p.x !== undefined) ?? [];
  const { x, y } = hexToPixel(tile);
  const from: Hex = { q: tile.q, r: tile.r };

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    e.cancelBubble = true;
    const to = pixelToHex(e.target.position());
    // Snap the node to its new hex; React state catches up when the action applies.
    e.target.position(hexToPixel(to));
    dispatch({ type: 'tile/move', from, to });
  }

  return (
    <Group
      x={x}
      y={y}
      rotation={(tile.rotation ?? 0) * 60}
      draggable={editable}
      onDragStart={(e) => {
        e.cancelBubble = true;
        e.target.moveToTop();
      }}
      onDragEnd={handleDragEnd}
      onDblClick={() => editable && dispatch({ type: 'tile/rotate', id: tile.id })}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        if (editable) dispatch({ type: 'tile/remove', id: tile.id });
        else onMenu(tile, e.evt.clientX, e.evt.clientY);
      }}
      onMouseEnter={() => {
        setHover(true);
        onHover(tile.system);
      }}
      onMouseLeave={() => {
        setHover(false);
        onHover(null);
      }}
    >
      {image && tile.system ? (
        <Image
          image={image}
          width={TILE_WIDTH}
          height={TILE_HEIGHT}
          offsetX={TILE_WIDTH / 2}
          offsetY={TILE_HEIGHT / 2}
        />
      ) : (
        <>
          <Line points={HEX_POINTS} closed fill="#1b2235" stroke="#4a5577" strokeWidth={2} />
          {tile.system && (
            <Text text={tile.system} fontSize={28} fill="#8f9bbd" x={-50} y={-14} width={100} align="center" />
          )}
        </>
      )}
      {hover &&
        !editable &&
        planets.map((p) => (
          <Circle
            key={p.name}
            x={p.x}
            y={p.y}
            radius={p.radius}
            stroke="#ffffff"
            strokeWidth={2}
            opacity={0.55}
            dash={[6, 5]}
            listening={false}
          />
        ))}
    </Group>
  );
}
