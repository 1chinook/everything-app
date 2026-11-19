'use strict';

const path = require('node:path');
const os = require('node:os');
const { createNewsReader } = require('./news.js');
const { createSpotifyMusic } = require('./spotify-music.js');

async function refresh() {
  const directory = process.env.EVERYTHING_APP_DATA_DIR ??
    path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'EverythingApp');
  const music = createSpotifyMusic(directory);
  // The active server owns its Spotify session, including refresh token rotation.
  try {
    const response = await fetch('http://127.0.0.1:4173/api/music', { signal: AbortSignal.timeout(2000) });
    if (response.ok && typeof (await response.json()).configured === 'boolean') {
      console.log('Running server is refreshing daily content.');
      return;
    }
  } catch {
    // When the server is closed, refresh its persistent data directly.
  }
  const [news] = await Promise.all([
    createNewsReader({ directory })(),
    music.refresh(),
  ]);
  console.log('News sources refreshed: ' + news.sourcesUpdated + '/' + news.sourcesTotal);
  console.log(music.current().connected ? 'Spotify refresh completed.' : 'Spotify authorization is required.');
}

if (require.main === module) refresh().catch(() => { process.exitCode = 1; });
module.exports = { refresh };
