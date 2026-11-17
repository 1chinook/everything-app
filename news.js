'use strict';

const { createHash } = require('node:crypto');
const sources = [
  ['Quanta Magazine', 'Matematik', 'https://www.quantamagazine.org/mathematics/feed/', 3],
  ['Quanta Magazine', 'Bilgisayar bilimi', 'https://www.quantamagazine.org/computer-science/feed/', 3],
  ['TRT Haber', 'Türkiye', 'https://www.trthaber.com/turkiye_articles.rss', 2],
  ['TRT Haber', 'Eğitim', 'https://www.trthaber.com/egitim_articles.rss', 1],
  ['BBC News', 'Dünya', 'https://feeds.bbci.co.uk/news/world/rss.xml', 2],
  ['BBC News', 'Ekonomi', 'https://feeds.bbci.co.uk/news/business/rss.xml', 2],
  ['BBC News', 'Teknoloji', 'https://feeds.bbci.co.uk/news/technology/rss.xml', 2],
  ['BBC News', 'Bilim ve çevre', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', 2],
  ['BBC News', 'Sağlık', 'https://feeds.bbci.co.uk/news/health/rss.xml', 2],
  ['BBC News', 'Kültür ve sanat', 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', 2],
  ['BBC Sport', 'Spor', 'https://feeds.bbci.co.uk/sport/rss.xml', 2],
];
const turkeyDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul', dateStyle: 'short' });
const fourteenDays = 14 * 86400000;

function feedText(xml) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, body) => {
      if (!body.startsWith('#')) return entities[body.toLowerCase()] ?? whole;
      const code = body[1].toLowerCase() === 'x' ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).trim();
}

function parseFeed(xml, [source, topic, , limit], now) {
  const items = [];
  const field = (item, tag) => item.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'i'))?.[1] ?? '';
  for (const [, entry] of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const published = Date.parse(feedText(field(entry, 'pubDate')));
    if (!Number.isFinite(published) || published < now - fourteenDays || published > now + 3600000) continue;
    const title = feedText(field(entry, 'title')).replace(/<[^>]*>/g, '').slice(0, 220);
    let url;
    try { url = new URL(feedText(field(entry, 'link'))); } catch { continue; }
    if (!title || url.protocol !== 'https:' || url.username || url.password) continue;
    items.push({ id: 'news-' + createHash('sha256').update(url.href).digest('hex').slice(0, 20),
      type: 'news', source, topic, title, url: url.href, date: new Date(published).toISOString().slice(0, 10), published });
  }
  return items.sort((a, b) => b.published - a.published).slice(0, limit);
}

function createNewsReader({ fetchFeed = fetch, clock = Date.now } = {}) {
  const cache = new Map();
  let pending;
  return async function dailyNews() {
    if (pending) return pending;
    pending = (async () => {
      const now = clock();
      const day = turkeyDate.format(now);
      await Promise.all(sources.map(async source => {
        const url = source[2];
        const previous = cache.get(url);
        if (previous?.day === day || previous?.retryAfter > now) return;
        try {
          const response = await fetchFeed(url, { signal: AbortSignal.timeout(6000), redirect: 'follow' });
          if (!response.ok) throw new Error('feed');
          const xml = await response.text();
          if (!/<(?:rss|channel)(?:\s|>)/i.test(xml)) throw new Error('format');
          cache.set(url, { day, items: parseFeed(xml, source, now), checked: now });
        } catch {
          cache.set(url, { ...previous, retryAfter: now + 15 * 60000 });
        }
      }));
      const checked = Math.max(0, ...[...cache.values()].map(entry => entry.checked ?? 0));
      const available = new Set();
      const items = sources.flatMap(source => cache.get(source[2])?.items ?? []).filter(item => {
        if (item.published < now - fourteenDays || available.has(item.id)) return false;
        available.add(item.id);
        return true;
      });
      return { day, checked, items, sourcesUpdated: [...cache.values()].filter(entry => entry.day === day).length, sourcesTotal: sources.length };
    })();
    try { return await pending; } finally { pending = null; }
  };
}

module.exports = { createNewsReader, parseFeed };
