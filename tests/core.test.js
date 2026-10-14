/* Testes do núcleo do torneio. Rode com: node --test (no Node 22+, "node --test tests/" não acha os arquivos) */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const Core = require(path.join(__dirname, '..', 'script.js'));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'songs.json'), 'utf8'));

function freshState(format, seed) {
  const v = Core.validateDataset(data);
  assert.ok(v.ok, v.errors.join('\n'));
  return Core.createState(v.data, format || 'seeded', seed || 12345);
}

/** Decide todos os confrontos pendentes; `pickFn` escolhe entre as duas participantes. */
function playAll(state, pickFn) {
  let guard = 0;
  let next;
  while ((next = Core.nextPending(state)) && guard++ < 500) {
    const p = Core.participants(state, next.r, next.i);
    const res = Core.setPick(state, next.r, next.i, pickFn(p, next));
    assert.ok(res.ok);
  }
  return guard;
}

const bySeed = (state) => {
  const map = new Map(Core.rankSongs(state.dataset.songs).map((s) => [s.id, s.seed]));
  return (id) => map.get(id);
};

test('os dados padrão têm exatamente 128 músicas únicas, com fonte e data', () => {
  const v = Core.validateDataset(data);
  assert.equal(v.ok, true, v.errors.join('\n'));
  assert.equal(v.data.songs.length, 128);
  assert.equal(new Set(v.data.songs.map((s) => s.id)).size, 128);
  assert.equal(new Set(v.data.songs.map((s) => Core.normalizeText(s.artist + ' ' + s.title))).size, 128);
  assert.ok(v.data.songs.every((s) => s.streams > 0 && s.title && s.artist));
  assert.ok(data.meta.referenceDate && data.meta.source.url);
  assert.equal(v.warnings.length, 0, v.warnings.join('\n'));
});

test('a ordem de cabeças de chave segue o padrão 1x128, 64x65...', () => {
  const order = Core.seedOrder(128);
  assert.equal(order.length, 128);
  assert.equal(new Set(order).size, 128);
  for (let i = 0; i < 128; i += 2) assert.equal(order[i] + order[i + 1], 129);
  assert.deepEqual(order.slice(0, 4), [1, 128, 64, 65]);
  // As cabeças 1 e 2 ficam em metades opostas; 1 a 4 em quartos diferentes.
  assert.ok(order.indexOf(1) < 64 && order.indexOf(2) >= 64);
  const quarter = (s) => Math.floor(order.indexOf(s) / 32);
  assert.equal(new Set([1, 2, 3, 4].map(quarter)).size, 4);
});

test('com favoritas sempre vencendo, a final é cabeça 1 x cabeça 2', () => {
  const st = freshState();
  const seed = bySeed(st);
  playAll(st, (p) => (seed(p[0]) < seed(p[1]) ? p[0] : p[1]));
  const final = Core.participants(st, 6, 0).map(seed).sort((a, b) => a - b);
  assert.deepEqual(final, [1, 2]);
  const semis = [0, 1].map((i) => Core.participants(st, 5, i).map(seed).sort((a, b) => a - b));
  assert.deepEqual(semis, [[1, 4], [2, 3]]);
});

test('o torneio completo tem 7 rodadas, 127 confrontos e uma campeã', () => {
  const st = freshState();
  const played = playAll(st, (p) => p[1]);
  assert.equal(played, 127);
  assert.equal(Core.countDone(st), 127);
  assert.equal(Core.nextPending(st), null);
  assert.equal(Core.currentRound(st), null);
  const champ = Core.champion(st);
  assert.ok(champ);
  const status = Core.computeStatus(st);
  const counts = { champion: 0, eliminated: 0, other: 0 };
  for (const id of Object.keys(status)) {
    if (status[id].state === 'champion') counts.champion++;
    else if (status[id].state === 'eliminated') counts.eliminated++;
    else counts.other++;
  }
  assert.deepEqual(counts, { champion: 1, eliminated: 127, other: 0 });
  const route = Core.path(st, champ);
  assert.equal(route.length, 7);
  assert.ok(route.every((step) => step.result === 'won'));
});

test('repetir a mesma escolha não conta duas vezes', () => {
  const st = freshState();
  const p = Core.participants(st, 0, 0);
  assert.equal(Core.setPick(st, 0, 0, p[0]).changed, true);
  assert.equal(Core.setPick(st, 0, 0, p[0]).changed, false);
  assert.equal(Core.countDone(st), 1);
  assert.equal(st.history.length, 1);
});

test('não aceita votar em confronto incompleto nem em música de fora', () => {
  const st = freshState();
  assert.equal(Core.setPick(st, 1, 0, st.order[0]).ok, false);
  assert.equal(Core.setPick(st, 0, 0, st.order[5]).ok, false);
  assert.equal(Core.setPick(st, 9, 0, st.order[0]).ok, false);
});

test('trocar uma escolha antiga limpa os confrontos dependentes e nenhuma eliminada reaparece', () => {
  const st = freshState();
  playAll(st, (p) => p[0]);
  const champBefore = Core.champion(st);
  const p = Core.participants(st, 0, 0);
  assert.equal(Core.winner(st, 0, 0), p[0]);
  const preview = Core.previewChange(st, 0, 0, p[1]);
  const res = Core.setPick(st, 0, 0, p[1]);
  assert.equal(res.cleared.length, preview);
  assert.equal(preview, 6); // R64, R32, oitavas, quartas, semi e final daquele caminho
  assert.equal(Core.champion(st), null);
  assert.notEqual(champBefore, null);
  // Nenhuma vencedora registrada pode ser uma música já eliminada antes daquela rodada.
  Core.forEachMatch((r, i) => {
    const w = Core.winner(st, r, i);
    if (w) assert.ok(Core.participants(st, r, i).includes(w));
  });
  assert.equal(Core.path(st, p[0]).length, 1);
  assert.equal(Core.path(st, p[0])[0].result, 'lost');
  // O próximo pendente é exatamente o confronto seguinte do caminho alterado.
  assert.deepEqual(Core.nextPending(st), { r: 1, i: 0 });
});

test('desfazer restaura a escolha anterior e tudo o que foi apagado', () => {
  const st = freshState();
  playAll(st, (p) => p[0]);
  const snapshot = JSON.stringify(st.picks);
  const p = Core.participants(st, 0, 3);
  Core.setPick(st, 0, 3, p[1]);
  assert.notEqual(JSON.stringify(st.picks), snapshot);
  Core.undo(st);
  assert.equal(JSON.stringify(Object.entries(st.picks).sort()), JSON.stringify(Object.entries(JSON.parse(snapshot)).sort()));
  // Desfazer tudo leva de volta a um torneio vazio.
  while (Core.undo(st)) { /* esvazia o histórico */ }
  assert.equal(Core.countDone(st), 0);
});

test('o sorteio é determinístico e muda com outro número', () => {
  const a = freshState('random', 777).order;
  const b = freshState('random', 777).order;
  const c = freshState('random', 778).order;
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(new Set(a).size, 128);
});

test('o estado sobrevive a salvar e recarregar (JSON) sem mudanças', () => {
  const st = freshState();
  playAll(st, (p, m) => (m.r < 3 ? p[1] : p[0]));
  Core.undo(st);
  const restored = Core.restoreState(JSON.parse(JSON.stringify(st)));
  assert.equal(restored.repaired, 0);
  assert.deepEqual(restored.state.picks, st.picks);
  assert.deepEqual(restored.state.order, st.order);
  assert.equal(restored.state.history.length, st.history.length);
});

test('um estado salvo adulterado é reparado ou recusado', () => {
  const st = freshState();
  playAll(st, (p) => p[0]);
  const bad = JSON.parse(JSON.stringify(st));
  bad.picks['1-0'] = bad.order[127];   // vencedora que não disputou aquele confronto
  bad.picks['9-9'] = bad.order[0];     // chave inexistente
  const res = Core.restoreState(bad);
  assert.ok(res.state);
  assert.ok(res.repaired >= 2);
  Core.forEachMatch((r, i) => {
    const w = Core.winner(res.state, r, i);
    if (w) assert.ok(Core.participants(res.state, r, i).includes(w));
  });
  const broken = JSON.parse(JSON.stringify(st));
  broken.order[5] = broken.order[6];
  assert.ok(Core.restoreState(broken).error);
});

test('a validação recusa listas incompletas, duplicadas ou sem streams', () => {
  const songs = data.songs.map((s) => Object.assign({}, s));
  assert.equal(Core.validateDataset({ songs: songs.slice(0, 127) }).ok, false);
  const dup = songs.map((s) => Object.assign({}, s));
  dup[10] = Object.assign({}, dup[3], { id: 'outra', rank: 999 });
  const r1 = Core.validateDataset({ songs: dup });
  assert.equal(r1.ok, false);
  assert.ok(r1.errors.some((e) => e.includes('aparece duas vezes')));
  const noStreams = songs.map((s) => Object.assign({}, s));
  noStreams[0].streams = '';
  assert.equal(Core.validateDataset({ songs: noStreams }).ok, false);
});

test('links do Spotify: aceita link, URI e ID; recusa o resto', () => {
  const id = 'AbCdEfGhIjKlMnOpQrStUv';
  assert.equal(Core.parseSpotifyTrack('https://open.spotify.com/track/' + id + '?si=abc'), id);
  assert.equal(Core.parseSpotifyTrack('https://open.spotify.com/intl-pt/track/' + id), id);
  assert.equal(Core.parseSpotifyTrack('spotify:track:' + id), id);
  assert.equal(Core.parseSpotifyTrack(id), id);
  assert.equal(Core.parseSpotifyTrack('https://open.spotify.com/album/' + id), null);
  assert.equal(Core.parseSpotifyTrack('https://example.com/track/' + id), null);
  assert.equal(Core.parseSpotifyTrack('javascript:alert(1)'), null);
});

test('importação CSV: aspas, vírgulas no nome e ponto e vírgula como separador', () => {
  const header = 'rank;title;artist;features;streams;spotify_id';
  const rows = data.songs.map((s) => [s.rank, '"' + s.title.replace(/"/g, '""') + '"', s.artist, s.features.join('|'), s.streams, ''].join(';'));
  const res = Core.csvToDataset([header].concat(rows).join('\r\n'));
  assert.ok(res.data);
  const v = Core.validateDataset(res.data);
  assert.equal(v.ok, true, v.errors.join('\n'));
  assert.equal(v.data.songs.find((s) => s.rank === 66).artist, 'Tyler, The Creator');
  assert.deepEqual(v.data.songs.find((s) => s.rank === 6).features, ['Wizkid', 'Kyla']);
  assert.ok(Core.csvToDataset('title,artist\nA,B').error);
});
