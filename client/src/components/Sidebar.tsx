import { useState } from 'react';
import type { Action, PlayerColor, Tile } from '@ti4/shared';
import { PiecePalette } from './PiecePalette';
import { SystemPalette } from './SystemPalette';

type Tab = 'pieces' | 'systems';

interface Props {
  color: PlayerColor;
  onColorChange: (color: PlayerColor) => void;
  tiles: Record<string, Tile>;
  dispatch: (action: Action) => void;
}

export function Sidebar({ color, onColorChange, tiles, dispatch }: Props) {
  const [tab, setTab] = useState<Tab>('pieces');
  return (
    <aside className="sidebar">
      <div className="tabs">
        <button className={tab === 'pieces' ? 'selected' : ''} onClick={() => setTab('pieces')}>
          Pieces
        </button>
        <button className={tab === 'systems' ? 'selected' : ''} onClick={() => setTab('systems')}>
          Systems
        </button>
      </div>
      <div className="sidebar-body">
        {tab === 'pieces' ? (
          <PiecePalette color={color} onColorChange={onColorChange} />
        ) : (
          <SystemPalette tiles={tiles} dispatch={dispatch} />
        )}
      </div>
    </aside>
  );
}
