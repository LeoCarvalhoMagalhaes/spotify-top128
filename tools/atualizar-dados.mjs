#!/usr/bin/env node
/*
 * Atualiza data/songs.json e data/songs.js com o ranking atual do Kworb.
 *
 * Uso (Node 18 ou mais novo, com internet):
 *   node tools/atualizar-dados.mjs              baixa https://kworb.net/spotify/songs.html
 *   node tools/atualizar-dados.mjs pagina.html  usa uma cópia salva da página
 *
 * O que faz:
 *   - lê a tabela do Kworb (artista, título, streams e streams diários; a tabela é só texto);
 *   - acha o ID de cada faixa no Spotify nas páginas de artista do Kworb, casando título e
 *     contagem de streams (só para músicas que ainda não têm ID);
 *   - descarta faixas que não são música (ruído branco, sons para dormir) e duplicatas;
 *   - pega as 128 primeiras, mantendo a posição original do Kworb;
 *   - reaproveita as participações (features) já cadastradas para a mesma música;
 *   - regrava a tabela das 128 músicas no README.md;
 *   - mostra o que entrou e o que saiu em relação aos dados atuais.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_URL = 'https://kworb.net/spotify/songs.html';
const NON_MUSIC = /white noise|brown noise|pink noise|baby sleep|sleep sounds|rain sounds|fan noise/i;

const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const decode = (t) => t
  .replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/\s+/g, ' ').trim();

/** Extrai as linhas da tabela do Kworb. Exportada para os testes. */
export function parseKworb(html) {
  const rows = [];
  const body = html.split(/<tbody[^>]*>/i)[1] || html;
  for (const tr of body.split(/<tr[^>]*>/i).slice(1)) {
    const cells = tr.split(/<td[^>]*>/i).slice(1).map((c) => c.split(/<\/td>/i)[0]);
    if (cells.length < 3) continue;
    const first = cells[0];
    const links = [...first.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const trackLink = links.find((l) => /track\/[A-Za-z0-9]{22}\.html/.test(l[1]));
    const artistLink = links.find((l) => /artist\//.test(l[1]));
    let artist;
    let title;
    if (trackLink && artistLink) {
      artist = decode(artistLink[2]);
      title = decode(trackLink[2]);
    } else {
      const text = decode(first);
      const cut = text.indexOf(' - ');
      if (cut === -1) continue;
      artist = text.slice(0, cut).trim();
      title = text.slice(cut + 3).trim();
    }
    const streams = parseInt(decode(cells[1]).replace(/[^\d]/g, ''), 10);
    const daily = parseInt(decode(cells[2]).replace(/[^\d]/g, ''), 10);
    const spotifyId = trackLink ? trackLink[1].match(/track\/([A-Za-z0-9]{22})\.html/)[1] : null;
    if (!artist || !title || !Number.isFinite(streams)) continue;
    rows.push({ artist, title, streams, daily: Number.isFinite(daily) ? daily : null, spotifyId });
  }
  return rows;
}

/** Lê kworb.net/spotify/artists.html e devolve nome normalizado -> ID do artista. Exportada para os testes. */
export function parseArtistIndex(html) {
  const map = new Map();
  for (const m of html.matchAll(/href="[^"]*artist\/([A-Za-z0-9]{22})(?:_songs)?\.html"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const key = norm(decode(m[2]));
    if (key && !map.has(key)) map.set(key, m[1]);
  }
  return map;
}

/** Lê a página de músicas de um artista no Kworb: título, streams e ID da faixa. Exportada para os testes. */
export function parseArtistSongs(html) {
  const out = [];
  for (const tr of html.split(/<tr[^>]*>/i).slice(1)) {
    const link = tr.match(/href="https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const cells = tr.split(/<td[^>]*>/i).slice(1).map((c) => c.split(/<\/td>/i)[0]);
    const streams = parseInt(decode(cells[1] || '').replace(/[^\d]/g, ''), 10);
    out.push({ spotifyId: link[1], title: decode(link[2]), streams: Number.isFinite(streams) ? streams : null });
  }
  return out;
}

/**
 * Escolhe na página do artista a faixa que corresponde à música do ranking: mesmo título
 * e streams com diferença de no máximo 1% (o Kworb pode ter versões diferentes da mesma música).
 * Exportada para os testes.
 */
export function matchTrack(tracks, title, streams) {
  const near = (t) => t.streams && Math.abs(t.streams - streams) / streams <= 0.01;
  const byStreams = (a, b) => Math.abs(a.streams - streams) - Math.abs(b.streams - streams);
  const sameTitle = tracks.filter((t) => norm(t.title) === norm(title) && near(t)).sort(byStreams);
  if (sameTitle.length) return sameTitle[0].spotifyId;
  // Título com sufixo diferente ("- Remastered", "(feat. X)"): exige streams quase idênticos.
  const prefix = tracks.filter((t) => (norm(t.title).startsWith(norm(title)) || norm(title).startsWith(norm(t.title))) &&
    Math.abs(t.streams - streams) / streams <= 0.001).sort(byStreams);
  return prefix.length ? prefix[0].spotifyId : null;
}

/** Monta o conjunto de dados no formato de data/songs.json. Exportada para os testes. */
export function buildDataset(rows, previous, today) {
  const prevByName = new Map((previous?.songs || []).map((s) => [norm(s.artist) + '|' + norm(s.title), s]));
  const songs = [];
  const excluded = [];
  const seen = new Set();
  rows.forEach((row, index) => {
    if (songs.length === 128) return;
    const rank = index + 1;
    if (NON_MUSIC.test(row.title) || NON_MUSIC.test(row.artist)) {
      excluded.push({ rank, artist: row.artist, title: row.title, streams: row.streams, reason: 'Não é uma música (ruído/sons para dormir).' });
      return;
    }
    const key = norm(row.artist) + '|' + norm(row.title);
    if (seen.has(key)) {
      excluded.push({ rank, artist: row.artist, title: row.title, streams: row.streams, reason: 'Duplicata de uma faixa já incluída.' });
      return;
    }
    seen.add(key);
    // Mesmo título e artista principal contido no crédito salvo (ex.: "Macklemore" e "Macklemore & Ryan Lewis").
    const prev = prevByName.get(key) || (previous?.songs || []).find((s) => norm(s.title) === norm(row.title) &&
      (norm(s.artist).includes(norm(row.artist)) || norm(row.artist).includes(norm(s.artist))));
    songs.push({
      id: 'kw-' + String(rank).padStart(3, '0'),
      rank,
      seed: songs.length + 1,
      title: row.title,
      artist: prev ? prev.artist : row.artist,
      features: prev ? prev.features || [] : [],
      streams: row.streams,
      dailyStreams: row.daily,
      spotifyId: row.spotifyId || (prev ? prev.spotifyId || null : null),
      creditsSource: prev ? prev.creditsSource || 'previous' : 'kworb-main-artist'
    });
  });
  if (songs.length !== 128) throw new Error('A tabela tinha só ' + songs.length + ' músicas válidas; esperado 128.');
  const meta = Object.assign({}, previous?.meta || {}, {
    schemaVersion: 1,
    dataVersion: 'kworb-' + today,
    referenceDate: today,
    source: { name: 'Kworb — Spotify Most Streamed Songs of All Time', url: SOURCE_URL, consultedAt: today, note: 'Streams acumulados por faixa no Spotify, atualizados diariamente pelo Kworb.' },
    selection: 'As 128 primeiras faixas musicais do ranking do Kworb. Faixas que não são música foram excluídas e a posição original no Kworb foi preservada.',
    spotifyLinks: 'IDs de faixa extraídos das páginas de artista do Kworb (mesmo título e mesma contagem de streams).',
    excluded,
    lastIncludedRank: songs[songs.length - 1].rank
  });
  return { meta, songs };
}

const README_START = '<!-- tabela:inicio (gerada por tools/atualizar-dados.mjs) -->';
const README_END = '<!-- tabela:fim -->';

/** Regrava a tabela das 128 músicas e a data de referência no README. Exportada para os testes. */
export function updateReadme(readme, data) {
  const start = readme.indexOf(README_START);
  const end = readme.indexOf(README_END);
  if (start === -1 || end === -1) return readme;
  const [y, m, d] = data.meta.referenceDate.split('-');
  const date = d + '/' + m + '/' + y;
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cell = (t) => String(t).replace(/\|/g, '\\|');
  const lines = [
    README_START,
    '`Cab.` é a cabeça de chave. `Kworb` é a posição original no ranking do Kworb em ' + date + '.',
    '',
    '| Cab. | Kworb | Música | Artista(s) | Streams |',
    '|---:|---:|---|---|---:|',
    ...data.songs.map((s) => '| ' + s.seed + ' | ' + s.rank + ' | ' + cell(s.title) + ' | ' +
      cell(s.artist + (s.features.length ? ' com ' + s.features.join(', ') : '')) + ' | ' + fmt(s.streams) + ' |')
  ];
  return (readme.slice(0, start) + lines.join('\n') + '\n\n' + readme.slice(end))
    .replace(/(\| Data de referência \| \*\*)\d{2}\/\d{2}\/\d{4}(\*\*)/, '$1' + date + '$2');
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'spotify-top128-bracket (uso pessoal)' } });
  if (!res.ok) throw new Error('O Kworb respondeu HTTP ' + res.status + ' para ' + url);
  return res.text();
}

/**
 * A página do ranking não tem links; os IDs vêm das páginas de artista do Kworb.
 * Só busca as músicas que ainda não têm ID (as que já tinham são reaproveitadas).
 */
async function resolveSpotifyIds(songs, rows) {
  const missing = songs.filter((s) => !s.spotifyId);
  if (!missing.length) return;
  console.log('Buscando IDs do Spotify para ' + missing.length + ' música(s) nas páginas de artista do Kworb...');
  const index = parseArtistIndex(await fetchText('https://kworb.net/spotify/artists.html'));
  const pages = new Map();
  const failed = [];
  for (const song of missing) {
    const kworbArtist = rows[song.rank - 1].artist;
    const artistId = index.get(norm(kworbArtist)) || index.get(norm(song.artist));
    if (!artistId) { failed.push(song); continue; }
    if (!pages.has(artistId)) {
      await new Promise((r) => setTimeout(r, 300));
      pages.set(artistId, parseArtistSongs(await fetchText('https://kworb.net/spotify/artist/' + artistId + '_songs.html')));
    }
    song.spotifyId = matchTrack(pages.get(artistId), song.title, song.streams);
    if (!song.spotifyId) failed.push(song);
  }
  if (failed.length) console.log('Sem ID encontrado: ' + failed.map((s) => '#' + s.rank + ' ' + s.artist + ' - ' + s.title).join('; '));
}

async function main() {
  const file = process.argv[2];
  let html;
  if (file) {
    html = await readFile(file, 'utf8');
  } else {
    console.log('Baixando ' + SOURCE_URL + ' ...');
    const res = await fetch(SOURCE_URL, { headers: { 'user-agent': 'spotify-top128-bracket (uso pessoal)' } });
    if (!res.ok) throw new Error('O Kworb respondeu HTTP ' + res.status);
    html = await res.text();
  }
  const rows = parseKworb(html);
  if (rows.length < 130) throw new Error('Só ' + rows.length + ' linhas foram lidas. O formato da página do Kworb pode ter mudado.');

  const jsonPath = path.join(ROOT, 'data', 'songs.json');
  let previous = null;
  try { previous = JSON.parse(await readFile(jsonPath, 'utf8')); } catch { /* primeira execução */ }

  const today = new Date().toISOString().slice(0, 10);
  const data = buildDataset(rows, previous, today);
  if (!file) await resolveSpotifyIds(data.songs, rows);

  const before = new Set((previous?.songs || []).map((s) => norm(s.artist) + '|' + norm(s.title)));
  const after = new Set(data.songs.map((s) => norm(s.artist) + '|' + norm(s.title)));
  const entered = data.songs.filter((s) => !before.has(norm(s.artist) + '|' + norm(s.title)));
  const left = (previous?.songs || []).filter((s) => !after.has(norm(s.artist) + '|' + norm(s.title)));

  await writeFile(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await writeFile(path.join(ROOT, 'data', 'songs.js'),
    '/* Gerado a partir de data/songs.json — permite abrir o site direto do arquivo (file://). */\n' +
    'window.SPOTIFY_TOP128_DATA = ' + JSON.stringify(data, null, 2) + ';\n', 'utf8');
  const readmePath = path.join(ROOT, 'README.md');
  try {
    await writeFile(readmePath, updateReadme(await readFile(readmePath, 'utf8'), data), 'utf8');
  } catch { /* sem README, nada a atualizar */ }

  const withId = data.songs.filter((s) => s.spotifyId).length;
  console.log('Pronto: 128 músicas, ' + withId + ' com link direto do Spotify. Referência: ' + today + '.');
  if (data.meta.excluded.length) console.log('Excluídas: ' + data.meta.excluded.map((e) => '#' + e.rank + ' ' + e.artist + ' - ' + e.title).join('; '));
  if (entered.length) console.log('Entraram: ' + entered.map((s) => s.artist + ' - ' + s.title).join('; '));
  if (left.length) console.log('Saíram: ' + left.map((s) => s.artist + ' - ' + s.title).join('; '));
  const noFeat = entered.filter((s) => !s.features.length).length;
  if (noFeat) console.log('Atenção: ' + noFeat + ' música(s) nova(s) entraram sem participações; confira os créditos e edite data/songs.json se precisar.');
}

if (import.meta.url === 'file://' + process.argv[1] || process.argv[1]?.endsWith('atualizar-dados.mjs')) {
  main().catch((err) => {
    console.error('Erro: ' + err.message);
    process.exit(1);
  });
}
