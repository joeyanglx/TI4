import { useEffect, useState } from 'react';
import { FeedbackButton, safeGet, safeSet, type TableProps } from '@joeyanglx/ahob-client';
import type { Action, GameState, PlayerColor } from '@joeyanglx/ti4-rules';
import { BattlePanel } from './components/BattlePanel';
import { DiceRoller } from './components/DiceRoller';
import { Board, type BoardMode } from './components/Board';
import { FactionIcon } from './components/cardParts';
import { EditionToggle } from './components/EditionToggle';
import { RightPanel } from './components/RightPanel';
import { RollToast } from './components/RollToast';
import { Sidebar } from './components/Sidebar';
import { TableBar } from './components/TableBar';

/** The TI4 table, inside the platform: it hands over the synced room. */
export function Table({ game, room, name, state, players, status, history, dispatch, rewind }: TableProps<GameState, Action>) {
  const [color, setColor] = useState<PlayerColor>(
    () => (safeGet('ti4.color') as PlayerColor | null) ?? 'red',
  );
  const [mode, setMode] = useState<BoardMode>('play');

  // Share your colour so score markers and strategy card holders show it to everyone.
  const seatColor = state.seats[name]?.color;
  const passed = !!state.seats[name]?.passed;
  useEffect(() => {
    if (status === 'online' && seatColor !== color) dispatch({ type: 'seat/color', player: name, color });
  }, [status, seatColor, color, name, dispatch]);

  return (
    <div className="table">
      <header className="topbar">
        <strong>TI4 Table</strong>
        <span>Room: {room}</span>
        <span className={`status status-${status}`}>{status}</span>
        <EditionToggle state={state} dispatch={dispatch} />
        <div className="mode-toggle">
          <button className={mode === 'play' ? 'selected' : ''} onClick={() => setMode('play')}>
            Play
          </button>
          <button className={mode === 'edit' ? 'selected' : ''} onClick={() => setMode('edit')}>
            Edit map
          </button>
        </div>
        <DiceRoller state={state} me={name} dispatch={dispatch} />
        <button
          className={`pass-button ${passed ? 'selected' : ''}`}
          title={passed ? 'You have passed; click to take it back' : 'Pass for the rest of this round'}
          onClick={() => dispatch({ type: 'seat/pass', player: name, passed: !passed })}
        >
          {passed ? 'Passed ✓' : 'Pass'}
        </button>
        <FeedbackButton me={name} game={game} room={room} example="e.g. The space cannon roll didn't count the PDS on Mecatol" />
        <span className="players">
          {players.map((p) => {
            const faction = state.seats[p]?.faction;
            return (
              <span key={p} className={`topbar-player ${state.seats[p]?.passed ? 'passed' : ''}`} title={state.seats[p]?.passed ? 'Passed' : undefined}>
                {faction && <FactionIcon faction={faction} />}
                {p}
              </span>
            );
          })}
        </span>
      </header>
      <Sidebar
        color={color}
        onColorChange={(c) => {
          safeSet('ti4.color', c);
          setColor(c);
        }}
        tiles={state.tiles}
        edition={state.cards.edition}
        dispatch={dispatch}
      />
      <main className="center">
        <TableBar state={state} online={players} me={name} dispatch={dispatch} />
        <Board state={state} me={name} color={color} mode={mode} dispatch={dispatch} />
      </main>
      <RightPanel
        state={state}
        room={room}
        online={players}
        me={name}
        history={history}
        dispatch={dispatch}
        onRewind={rewind}
      />
      <RollToast state={state} me={name} online={status === 'online'} />
      {state.battle && <BattlePanel state={state} me={name} dispatch={dispatch} />}
    </div>
  );
}
