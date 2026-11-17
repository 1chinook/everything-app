'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');

const spotifyRedirect = 'http://127.0.0.1:4173/api/music/callback';
const turkeyDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul', dateStyle: 'short' });

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function spotifyClientId() {
  const config = readJson(path.join(__dirname, 'spotify-config.local.json'), {});
  return process.env.EVERYTHING_SPOTIFY_CLIENT_ID ?? config?.clientId;
}

function createSpotifyMusic(directory, { clientId = spotifyClientId(), request = fetch, now = Date.now } = {}) {
  const configured = typeof clientId === 'string' && /^[a-f0-9]{32}$/i.test(clientId);
  const file = path.join(directory, 'spotify-music-session.json');
  let state = readJson(file, {}) ?? {};
  let authorization;
  let operation;
  let retryAfter = 0;
  let message = '';

  function store(next) {
    fs.mkdirSync(directory, { recursive: true });
    const draft = file + '.' + randomBytes(8).toString('hex') + '.tmp';
    fs.writeFileSync(draft, JSON.stringify(next), { mode: 0o600, flag: 'wx' });
    try { fs.renameSync(draft, file); } finally { fs.rmSync(draft, { force: true }); }
    state = next;
  }

  function connect() {
    if (!configured) return null;
    const verifier = randomBytes(48).toString('base64url');
    authorization = { verifier, nonce: randomBytes(24).toString('base64url'), expires: now() + 10 * 60000 };
    const query = new URLSearchParams({
      client_id: clientId, response_type: 'code', redirect_uri: spotifyRedirect, scope: 'user-top-read user-read-recently-played',
      state: authorization.nonce, code_challenge_method: 'S256',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    });
    return 'https://accounts.spotify.com/authorize?' + query;
  }

  async function token(parameters) {
    const response = await request('https://accounts.spotify.com/api/token', {
      method: 'POST', body: new URLSearchParams({ ...parameters, client_id: clientId }), signal: AbortSignal.timeout(6000),
    });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw Object.assign(new Error('spotify_token'), { spotifyCode: data.error });
    return data;
  }

  async function callback(query) {
    if (!authorization || authorization.nonce !== query.get('state') || authorization.expires < now()) return false;
    const { verifier } = authorization;
    authorization = undefined;
    if (!query.get('code')) return false;
    try {
      const data = await token({ grant_type: 'authorization_code', code: query.get('code'),
        redirect_uri: spotifyRedirect, code_verifier: verifier });
      if (!data.refresh_token) return false;
      if (operation) await operation;
      store({ refreshToken: data.refresh_token, seen: [] });
      message = '';
      retryAfter = 0;
      void refresh(data.access_token);
      return true;
    } catch {
      return false;
    }
  }

  async function get(access, endpoint) {
    const response = await request('https://api.spotify.com/v1/' + endpoint, {
      headers: { Authorization: 'Bearer ' + access }, signal: AbortSignal.timeout(6000),
    });
    return response.ok ? response.json() : null;
  }

  async function refresh(accessToken) {
    const day = turkeyDay.format(now());
    if (!configured || !state.refreshToken || state.day === day || now() < retryAfter) return;
    if (operation) return operation;
    operation = (async () => {
      try {
        let access = accessToken;
        if (!access) {
          const data = await token({ grant_type: 'refresh_token', refresh_token: state.refreshToken });
          access = data.access_token;
          if (data.refresh_token) store({ ...state, refreshToken: data.refresh_token });
        }
        const [artists, top, recent] = await Promise.all([
          get(access, 'me/top/artists?time_range=short_term&limit=10'),
          get(access, 'me/top/tracks?time_range=short_term&limit=30'),
          get(access, 'me/player/recently-played?limit=30'),
        ]);
        const seeds = [...new Map([...(artists?.items ?? []), ...(recent?.items ?? []).flatMap(item => item.track?.artists ?? [])]
          .filter(artist => artist?.id && artist.name).map(artist => [artist.id, artist])).values()];
        const heard = new Set([...(top?.items ?? []).map(track => track.id), ...(recent?.items ?? []).map(item => item.track?.id), ...(state.seen ?? [])]);
        const offset = Math.floor(now() / 86400000) % (seeds.length || 1);
        const candidates = [...seeds.slice(offset), ...seeds.slice(0, offset)].slice(0, 4);
        for (const artist of candidates) {
          const query = new URLSearchParams({ q: 'artist:' + artist.name, type: 'track', limit: '10', market: 'TR' });
          const results = await get(access, 'search?' + query);
          const pick = results?.tracks?.items.find(track => track.id && !heard.has(track.id) &&
            track.artists?.some(item => item.id === artist.id) &&
            /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+$/.test(track.external_urls?.spotify ?? ''));
          if (!pick) continue;
          store({ refreshToken: state.refreshToken, day, pick: {
            title: pick.name, artist: pick.artists.map(item => item.name).join(', '), url: pick.external_urls.spotify,
          }, seen: [...(state.seen ?? []), pick.id].slice(-60) });
          message = '';
          return;
        }
        message = 'Spotify bugün uygun yeni bir parça döndürmedi. Bir süre sonra tekrar denenecek.';
      } catch (error) {
        if (error.spotifyCode === 'invalid_grant') {
          const expired = { ...state, refreshToken: undefined };
          try { store(expired); } catch { state = expired; }
          message = 'Spotify iznini yeniden vermen gerekiyor.';
        } else {
          message = 'Spotify yanıt vermedi. Uygulama daha sonra tekrar deneyecek.';
        }
      } finally {
        retryAfter = now() + 30 * 60000;
      }
    })();
    try { await operation; } finally { operation = undefined; }
  }

  function current() {
    return { configured, connected: Boolean(configured && state.refreshToken),
      track: state.day === turkeyDay.format(now()) ? state.pick : undefined, message };
  }

  return { connect, callback, refresh, current };
}

module.exports = { createSpotifyMusic };
