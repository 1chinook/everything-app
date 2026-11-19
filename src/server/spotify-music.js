'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');

const spotifyRedirect = 'http://127.0.0.1:4173/api/music/callback';
const turkeyDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul', dateStyle: 'short' });
const discoveryVersion = 3;

function trackKeys(track) {
  const title = (track.name ?? '').replace(/\([^)]*(?:live|remaster|acoustic|version|mix)[^)]*\)/gi, '')
    .replace(/\s[-–]\s.*(?:live|remaster|acoustic|version|mix).*/gi, '')
    .normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return [track.id && 'id:' + track.id, track.linked_from?.id && 'id:' + track.linked_from.id,
    track.external_ids?.isrc && 'isrc:' + track.external_ids.isrc, title && 'title:' + title].filter(Boolean);
}

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
  let quotaUntil = 0;
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
      store({ ...state, refreshToken: data.refresh_token, day: undefined });
      message = '';
      retryAfter = 0;
      void refresh(data.access_token);
      return true;
    } catch {
      return false;
    }
  }

  async function get(access, endpoint, optional = false) {
    const response = await request('https://api.spotify.com/v1/' + endpoint, {
      headers: { Authorization: 'Bearer ' + access }, signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      if (optional && [403,404].includes(response.status)) return null;
      const delay = Number(response.headers?.get('retry-after'));
      throw Object.assign(new Error('spotify_request'), { retryMs: response.status === 429 ? (Number.isFinite(delay) && delay > 0 ? delay * 1000 : 3600000) : 0 });
    }
    return response.json();
  }

  async function refresh(accessToken) {
    const day = turkeyDay.format(now());
    if (!configured || !state.refreshToken || (state.day === day && state.discoveryVersion === discoveryVersion) || now() < Math.max(retryAfter,quotaUntil)) return;
    if (operation) return operation;
    operation = (async () => {
      try {
        let access = accessToken;
        if (!access) {
          const data = await token({ grant_type: 'refresh_token', refresh_token: state.refreshToken });
          access = data.access_token;
          if (data.refresh_token) store({ ...state, refreshToken: data.refresh_token });
        }
        const ranges = ['short_term','medium_term','long_term'];
        const [artists, top, recent] = await Promise.all([
          Promise.all(ranges.map(range => get(access, 'me/top/artists?time_range=' + range + '&limit=50'))),
          Promise.all(ranges.map(range => get(access, 'me/top/tracks?time_range=' + range + '&limit=50'))),
          get(access, 'me/player/recently-played?limit=50'),
        ]);
        if (artists.some(result => !Array.isArray(result.items)) || top.some(result => !Array.isArray(result.items)) || !Array.isArray(recent.items)) throw new Error('spotify_history');
        const artistItems = artists.flatMap(result => result.items);
        const tracks = [...top.flatMap(result => result.items), ...recent.items.map(item => item.track).filter(Boolean)];
        const known = new Set([...(state.known ?? []), ...tracks.flatMap(trackKeys)]);
        const recentCounts = new Map();
        for (const item of recent.items) for (const key of trackKeys(item.track ?? {})) recentCounts.set(key,(recentCounts.get(key) ?? 0)+1);
        const frequent = new Set(top.flatMap((result,index) => result.items.slice(0,index===0?20:10).flatMap(trackKeys)));
        for (const [key,count] of recentCounts) if(count>=3) frequent.add(key);
        const recommendedKeys = new Set([...(state.recommendedKeys ?? []),...(state.seen ?? []).map(id=>'id:'+id)]);
        if(state.pick) for(const key of trackKeys({id:state.pick.id,name:state.pick.title})) recommendedKeys.add(key);
        const knownArtists = new Set([...(state.knownArtists ?? []), ...artistItems.map(a => a.id), ...tracks.flatMap(t => t.artists ?? []).map(a => a.id)].filter(Boolean));
        const genres = state.genres?.length ? state.genres : [...new Set(artistItems.flatMap(a => a.genres ?? []))].slice(0,8);
        const seeds = [...new Map(artistItems.filter(a=>a.id&&a.name).map(a=>[a.id,a])).values()];
        if (!genres.length && !seeds.length) {
          store({ ...state, known:[...known], knownArtists:[...knownArtists] });
          message = 'Spotify sanatçı veya tür bilgisi sağlamadı. Keşif türlerini aşağıdan seçebilirsin.';
          return;
        }
        const dayNumber = Math.floor(now()/86400000);
        const artistOffset = dayNumber % (seeds.length || 1);
        const genreOffset = dayNumber % (genres.length || 1);
        const artistSearches = [...seeds.slice(artistOffset),...seeds.slice(0,artistOffset)].slice(0,3)
          .map(artist=>({mode:'artist',label:artist.name,artistId:artist.id,query:'artist:"'+artist.name.replace(/["\\]/g,'')+'"',offset:10+(dayNumber%3)*10}));
        const genreSearches = [...genres.slice(genreOffset),...genres.slice(0,genreOffset)].slice(0,3)
          .map(genre=>({mode:'genre',label:genre,query:'genre:"'+genre.replace(/["\\]/g,'')+'"',offset:(dayNumber%8)*10}));
        const searches = state.lastDiscoveryMode==='artist' ? [...genreSearches,...artistSearches] : [...artistSearches,...genreSearches];
        for (const search of searches) {
          const query = new URLSearchParams({ q:search.query, type:'track', limit:'10', offset:String(search.offset), market:'TR' });
          const results = await get(access, 'search?' + query);
          const candidates = (results?.tracks?.items ?? []).filter(track => track.id && !track.is_local && track.is_playable !== false &&
            !trackKeys(track).some(key => frequent.has(key) || recommendedKeys.has(key)) && track.artists?.length &&
            (search.mode!=='artist' || track.artists.some(a=>a.id===search.artistId)) &&
            /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+$/.test(track.external_urls?.spotify ?? ''));
          const score = track => (trackKeys(track).some(key=>known.has(key))?2:0) +
            (trackKeys(track).some(key=>recentCounts.has(key))?1:0) +
            (search.mode==='genre' && track.artists.every(a=>knownArtists.has(a.id))?2:0) +
            (track.artists.some(a=>(state.recommendedArtists ?? []).slice(-6).includes(a.id))?1:0);
          const bestScore = Math.min(...candidates.map(score));
          const preferred = candidates.filter(track=>score(track)===bestScore);
          const pick = preferred[Math.floor(Math.random()*preferred.length)];
          if (!pick) continue;
          store({ ...state, day, discoveryVersion, pick: {
            id:pick.id, title: pick.name, artist: pick.artists.map(item => item.name).join(', '), url: pick.external_urls.spotify,
            reason:search.mode==='artist' ? 'Sevdiğin sanatçıdan farklı bir parça' : search.label+' tarzında keşif',
          }, seen: [...new Set([...(state.seen ?? []),pick.id])], known:[...new Set([...known,...trackKeys(pick)])],
            knownArtists:[...knownArtists], recommendedKeys:[...new Set([...recommendedKeys,...trackKeys(pick)])], lastDiscoveryMode:search.mode,
            recommendedArtists:[...(state.recommendedArtists ?? []),...pick.artists.map(a=>a.id)].slice(-40) });
          message = '';
          return;
        }
        store({ ...state, known:[...known], knownArtists:[...knownArtists] });
        message = 'Sık dinlediklerini ve önceki önerileri eleyince uygun parça kalmadı. Keşif türlerini genişletebilirsin.';
      } catch (error) {
        if (error.spotifyCode === 'invalid_grant') {
          const expired = { ...state, refreshToken: undefined };
          try { store(expired); } catch { state = expired; }
          message = 'Spotify iznini yeniden vermen gerekiyor.';
        } else {
          message = 'Spotify yanıt vermedi. Uygulama daha sonra tekrar deneyecek.';
          quotaUntil = Math.max(quotaUntil,now()+(error.retryMs ?? 0));
        }
      } finally {
        retryAfter = Math.max(retryAfter,now() + 30 * 60000);
      }
    })();
    try { await operation; } finally { operation = undefined; }
  }

  function current() {
    return { configured, connected: Boolean(configured && state.refreshToken),
      track: state.day === turkeyDay.format(now()) && state.discoveryVersion === discoveryVersion ? state.pick : undefined,
      genres: state.genres ?? [], message };
  }

  async function discover({ rejectId, genres } = {}) {
    if (operation) await operation;
    if (genres !== undefined && (!Array.isArray(genres) || genres.length > 8 || genres.some(g => typeof g !== 'string' || !g.trim() || g.length > 60))) throw Object.assign(new Error('Invalid genres'),{status:400});
    if (rejectId && state.pick?.id !== rejectId) return current();
    store({ ...state, ...(genres !== undefined ? {genres:genres.map(g=>g.trim())} : {}), day:undefined });
    retryAfter=0;
    await refresh();
    return current();
  }

  return { connect, callback, refresh, current, discover };
}

module.exports = { createSpotifyMusic };
