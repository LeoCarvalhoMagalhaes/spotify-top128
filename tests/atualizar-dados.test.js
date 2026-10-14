/* Testes do script de atualização (tools/atualizar-dados.mjs). Rode com: node --test */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () => import(pathToFileURL(path.join(__dirname, '..', 'tools', 'atualizar-dados.mjs')).href);

// Trechos no formato da página ao vivo do Kworb (outubro de 2026).
const SONGS_HTML = '<table><thead><tr><th>Artist and Title</th><th>Streams</th><th>Daily</th></tr></thead><tbody>\n' +
  '<tr><td class="text"><div>The Weeknd - Blinding Lights</div></td><td>5,632,731,972</td><td>1,455,905</td></tr>\n' +
  '<tr><td class="text"><div>Tyler, The Creator - See You Again</div></td><td>3,000,000,000</td><td>900,000</td></tr>\n' +
  '<tr><td class="text"><div>Guns N&#39; Roses - Sweet Child O&#39; Mine</div></td><td>2,700,000,000</td><td></td></tr>\n' +
  '</tbody></table>';
const ARTISTS_HTML = '<tr><td class="text"><div><a href="/spotify/artist/3TVXtAsR1Inumwj472S9r4_songs.html">Drake</a></div></td><td>1</td></tr>' +
  '<tr><td class="text"><div><a href="/spotify/artist/4V8LLVI7PbaPR0K2TGSxFF_songs.html">Tyler, The Creator</a></div></td><td>1</td></tr>';
const ARTIST_SONGS_HTML =
  '<tr><td class="text"><div><a href="https://open.spotify.com/track/1zi7xx7UVEFkmKfv06H8x0" target="_blank">One Dance</a></div></td><td>4,514,151,625</td><td>1,600,290</td></tr>' +
  '<tr><td class="text"><div><a href="https://open.spotify.com/track/AAAAAAAAAAAAAAAAAAAAAA" target="_blank">One Dance</a></div></td><td>120,000,000</td><td>1,000</td></tr>' +
  '<tr><td class="text"><div><a href="https://open.spotify.com/track/6DCZcSspjsKoFjzjrWoCdn" target="_blank">God&#39;s Plan (feat. X)</a></div></td><td>3,500,000,000</td><td>1,000</td></tr>';

test('lê a tabela de texto do ranking do Kworb', async () => {
  const { parseKworb } = await load();
  const rows = parseKworb(SONGS_HTML);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { artist: 'The Weeknd', title: 'Blinding Lights', streams: 5632731972, daily: 1455905, spotifyId: null });
  assert.equal(rows[1].artist, 'Tyler, The Creator');
  assert.equal(rows[2].title, "Sweet Child O' Mine");
  assert.equal(rows[2].daily, null);
});

test('lê o índice de artistas e a página de músicas do artista', async () => {
  const { parseArtistIndex, parseArtistSongs } = await load();
  const index = parseArtistIndex(ARTISTS_HTML);
  assert.equal(index.get('drake'), '3TVXtAsR1Inumwj472S9r4');
  assert.equal(index.get('tyler the creator'), '4V8LLVI7PbaPR0K2TGSxFF');
  const tracks = parseArtistSongs(ARTIST_SONGS_HTML);
  assert.equal(tracks.length, 3);
  assert.deepEqual(tracks[0], { spotifyId: '1zi7xx7UVEFkmKfv06H8x0', title: 'One Dance', streams: 4514151625 });
});

test('casa a faixa pelo título e pelos streams, e não chuta quando não bate', async () => {
  const { parseArtistSongs, matchTrack } = await load();
  const tracks = parseArtistSongs(ARTIST_SONGS_HTML);
  // Duas versões de One Dance: vale a que tem os mesmos streams.
  assert.equal(matchTrack(tracks, 'One Dance', 4514151625), '1zi7xx7UVEFkmKfv06H8x0');
  // O ranking pode estar um dia à frente da página do artista.
  assert.equal(matchTrack(tracks, 'One Dance', 4515700000), '1zi7xx7UVEFkmKfv06H8x0');
  // Sufixo no título do Spotify, streams iguais.
  assert.equal(matchTrack(tracks, "God's Plan", 3500000000), '6DCZcSspjsKoFjzjrWoCdn');
  assert.equal(matchTrack(tracks, 'One Dance', 2000000000), null);
  assert.equal(matchTrack(tracks, 'Hotline Bling', 4514151625), null);
});

test('regrava a tabela do README entre os marcadores', async () => {
  const { updateReadme } = await load();
  const readme = 'Topo\n| Data de referência | **12/10/2026** (x) |\n<!-- tabela:inicio (gerada por tools/atualizar-dados.mjs) -->\nvelha\n<!-- tabela:fim -->\nFim\n';
  const data = { meta: { referenceDate: '2026-10-14' }, songs: [
    { seed: 1, rank: 1, title: 'One Dance', artist: 'Drake', features: ['Wizkid', 'Kyla'], streams: 4514151625 }
  ] };
  const out = updateReadme(readme, data);
  assert.ok(out.includes('**14/10/2026**'));
  assert.ok(out.includes('| 1 | 1 | One Dance | Drake com Wizkid, Kyla | 4.514.151.625 |'));
  assert.ok(!out.includes('velha'));
  assert.ok(out.endsWith('<!-- tabela:fim -->\nFim\n'));
  assert.equal(updateReadme('sem marcadores', data), 'sem marcadores');
});
