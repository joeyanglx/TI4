import { mountPlatform } from '@joeyanglx/ahob-client';

mountPlatform(document.getElementById('root')!, [
  { id: 'ti4', title: 'Twilight Imperium 4', load: () => import('@joeyanglx/ti4-client').then((m) => m.ti4Client) },
]);
