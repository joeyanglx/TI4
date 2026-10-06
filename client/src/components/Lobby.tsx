import { useState, type FormEvent } from 'react';

export function Lobby({ onJoin }: { onJoin: (room: string, name: string) => void }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState(
    () => new URLSearchParams(location.search).get('room') ?? 'game-1',
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    const cleanRoom = room.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (cleanRoom && name.trim()) onJoin(cleanRoom, name.trim());
  }

  return (
    <form className="lobby" onSubmit={submit}>
      <h1>TI4 Table</h1>
      <label>
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        Room
        <input value={room} onChange={(e) => setRoom(e.target.value)} />
      </label>
      <button type="submit">Join</button>
      <p className="hint">Everyone who joins the same room shares one board.</p>
    </form>
  );
}
