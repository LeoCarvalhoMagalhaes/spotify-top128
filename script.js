/*
 * Spotify Top 128 — The Ultimate Music Bracket
 *
 * Organização do arquivo:
 *   1. Constantes
 *   2. Core: lógica pura do torneio (sem DOM, testável no Node)
 *   3. Persistência (LocalStorage)
 *   4. Utilidades de interface
 *   5. Telas (início, confronto, chaveamento, músicas, estatísticas, campeã, dados)
 *   6. Roteamento, atalhos e inicialização
 */
(function (global) {
  'use strict';

  /* =========================================================================
   * 1. Constantes
   * ========================================================================= */

  const TOTAL_SONGS = 128;
  const ROUNDS = 7;
  const ROUND_SIZES = [64, 32, 16, 8, 4, 2, 1]; // confrontos por rodada
  const TOTAL_MATCHES = 127;
  const ROUND_NAMES = [
    'Rodada de 128', 'Rodada de 64', 'Rodada de 32', 'Oitavas de final',
    'Quartas de final', 'Semifinais', 'Grande final'
  ];
  const ROUND_SHORT = ['R128', 'R64', 'R32', 'Oitavas', 'Quartas', 'Semis', 'Final'];
  const REGION_NAMES = ['Lado A', 'Lado B', 'Lado C', 'Lado D'];
  const REGION_SLUGS = ['lado-a', 'lado-b', 'lado-c', 'lado-d'];
  const SPOTIFY_ID_RE = /^[A-Za-z0-9]{22}$/;
  const STATE_VERSION = 1;
  const HISTORY_LIMIT = 600;

  /* =========================================================================
   * 2. Core — regras do torneio
   *
   * Modelo: `order` guarda os 128 IDs na ordem dos slots da primeira rodada
   * (slots 2i e 2i+1 formam o confronto i). `picks` guarda só as vencedoras,
   * com chave "rodada-indice". As participantes de qualquer confronto são
   * sempre DERIVADAS de `order` + `picks`; nada é duplicado. Isso impede que
   * o chaveamento fique inconsistente com as escolhas registradas.
   * ========================================================================= */

  const Core = {};

  Core.constants = { TOTAL_SONGS, ROUNDS, ROUND_SIZES, TOTAL_MATCHES, ROUND_NAMES, REGION_NAMES };

  const key = (r, i) => r + '-' + i;
  Core.key = key;

  Core.normalizeText = function (text) {
    return String(text == null ? '' : text)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  };

  /**
   * Ordem padrão de cabeças de chave (1 x 128, 64 x 65, ...).
   * Constrói recursivamente: cada cabeça s de um chaveamento de tamanho n/2
   * enfrenta (n + 1 - s) no chaveamento de tamanho n. Resultado: as cabeças
   * 1 e 2 só podem se encontrar na final, 1 a 4 só nas semifinais etc.
   */
  Core.seedOrder = function (n) {
    let order = [1, 2];
    while (order.length < n) {
      const size = order.length * 2;
      const next = [];
      for (const s of order) next.push(s, size + 1 - s);
      order = next;
    }
    return order;
  };

  /** Gerador pseudoaleatório determinístico (mulberry32): o mesmo número gera sempre o mesmo sorteio. */
  Core.createRng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  Core.shuffle = function (list, rng) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  };

  /** Ordena pela posição histórica (desempate por streams) e devolve a cabeça de chave de cada música. */
  Core.rankSongs = function (songs) {
    return songs.slice()
      .sort((a, b) => (a.rank - b.rank) || (b.streams - a.streams))
      .map((song, index) => Object.assign({}, song, { seed: index + 1 }));
  };

  Core.buildOrder = function (songs, format, rngSeed) {
    const ranked = Core.rankSongs(songs);
    const ids = ranked.map((s) => s.id); // ids[0] = cabeça 1
    if (format === 'random') return Core.shuffle(ids, Core.createRng(rngSeed));
    return Core.seedOrder(TOTAL_SONGS).map((seed) => ids[seed - 1]);
  };

  Core.createState = function (dataset, format, rngSeed) {
    const fmt = format === 'random' ? 'random' : 'seeded';
    const seed = fmt === 'random' ? (rngSeed >>> 0) : null;
    const now = new Date().toISOString();
    return {
      version: STATE_VERSION,
      createdAt: now,
      updatedAt: now,
      dataset: dataset,
      format: fmt,
      rngSeed: seed,
      order: Core.buildOrder(dataset.songs, fmt, seed),
      picks: {},
      history: []
    };
  };

  Core.participants = function (state, r, i) {
    if (r === 0) return [state.order[2 * i] || null, state.order[2 * i + 1] || null];
    return [state.picks[key(r - 1, 2 * i)] || null, state.picks[key(r - 1, 2 * i + 1)] || null];
  };

  Core.isReady = function (state, r, i) {
    const p = Core.participants(state, r, i);
    return Boolean(p[0] && p[1]);
  };

  Core.winner = (state, r, i) => state.picks[key(r, i)] || null;

  /**
   * Remove qualquer vencedora que não seja mais uma das participantes do
   * confronto (ou cujo confronto perdeu uma participante). Percorre as rodadas
   * em ordem, então uma remoção na rodada r propaga para r+1, r+2...
   * Devolve a lista do que foi removido, para permitir desfazer.
   */
  Core.sanitize = function (state) {
    const cleared = [];
    for (let r = 0; r < ROUNDS; r++) {
      for (let i = 0; i < ROUND_SIZES[r]; i++) {
        const k = key(r, i);
        const w = state.picks[k];
        if (w === undefined) continue;
        const p = Core.participants(state, r, i);
        if (!p[0] || !p[1] || (w !== p[0] && w !== p[1])) {
          cleared.push({ key: k, value: w });
          delete state.picks[k];
        }
      }
    }
    return cleared;
  };

  /**
   * Registra a vencedora de um confronto.
   * - Repetir a mesma escolha não faz nada (impede contagem dupla).
   * - Trocar uma escolha já feita invalida o confronto seguinte, porque ele
   *   passa a ter outra participante; a limpeza se propaga pelas rodadas.
   * Cada alteração entra no histórico com tudo o que foi apagado.
   */
  Core.setPick = function (state, r, i, songId) {
    if (!(r >= 0 && r < ROUNDS && i >= 0 && i < ROUND_SIZES[r])) return { ok: false, reason: 'match' };
    const p = Core.participants(state, r, i);
    if (!p[0] || !p[1]) return { ok: false, reason: 'not-ready' };
    if (songId !== p[0] && songId !== p[1]) return { ok: false, reason: 'not-participant' };
    const k = key(r, i);
    const prev = state.picks[k] || null;
    if (prev === songId) return { ok: true, changed: false, cleared: [] };

    state.picks[k] = songId;
    const cleared = [];
    if (prev && r < ROUNDS - 1) {
      const parent = key(r + 1, i >> 1);
      if (state.picks[parent] !== undefined) {
        cleared.push({ key: parent, value: state.picks[parent] });
        delete state.picks[parent];
      }
    }
    Array.prototype.push.apply(cleared, Core.sanitize(state));
    state.history.push({ key: k, prev: prev, next: songId, cleared: cleared });
    if (state.history.length > HISTORY_LIMIT) state.history.splice(0, state.history.length - HISTORY_LIMIT);
    return { ok: true, changed: true, cleared: cleared, prev: prev };
  };

  /** Simula uma troca sem alterar o estado; devolve quantos resultados seriam apagados. */
  Core.previewChange = function (state, r, i, songId) {
    const clone = { order: state.order, picks: Object.assign({}, state.picks), history: [] };
    const res = Core.setPick(clone, r, i, songId);
    return res.ok ? res.cleared.length : 0;
  };

  /** Desfaz a última alteração, restaurando a escolha anterior e tudo o que ela apagou. */
  Core.undo = function (state) {
    const h = state.history.pop();
    if (!h) return null;
    if (h.prev) state.picks[h.key] = h.prev; else delete state.picks[h.key];
    for (const c of h.cleared) state.picks[c.key] = c.value;
    Core.sanitize(state);
    return h;
  };

  Core.forEachMatch = function (fn) {
    for (let r = 0; r < ROUNDS; r++) for (let i = 0; i < ROUND_SIZES[r]; i++) fn(r, i);
  };

  Core.nextPending = function (state) {
    for (let r = 0; r < ROUNDS; r++) {
      for (let i = 0; i < ROUND_SIZES[r]; i++) {
        if (state.picks[key(r, i)] === undefined && Core.isReady(state, r, i)) return { r: r, i: i };
      }
    }
    return null;
  };

  Core.champion = (state) => state.picks[key(ROUNDS - 1, 0)] || null;

  Core.countDone = function (state) {
    let n = 0;
    Core.forEachMatch((r, i) => { if (state.picks[key(r, i)]) n++; });
    return n;
  };

  Core.doneInRound = function (state, r) {
    let n = 0;
    for (let i = 0; i < ROUND_SIZES[r]; i++) if (state.picks[key(r, i)]) n++;
    return n;
  };

  /** Rodada atual = primeira rodada com algum confronto sem vencedora. */
  Core.currentRound = function (state) {
    for (let r = 0; r < ROUNDS; r++) if (Core.doneInRound(state, r) < ROUND_SIZES[r]) return r;
    return null;
  };

  Core.globalIndex = function (r, i) {
    let n = 0;
    for (let k = 0; k < r; k++) n += ROUND_SIZES[k];
    return n + i;
  };

  Core.fromGlobalIndex = function (g) {
    for (let r = 0; r < ROUNDS; r++) {
      if (g < ROUND_SIZES[r]) return { r: r, i: g };
      g -= ROUND_SIZES[r];
    }
    return null;
  };

  /** Lado (região) do chaveamento: rodadas 0 a 4 pertencem a um dos 4 lados. */
  Core.regionOf = function (r, i) {
    return r <= 4 ? Math.floor(i / (16 >> r)) : null;
  };

  Core.computeStatus = function (state) {
    const status = {};
    for (const id of state.order) status[id] = { wins: 0, eliminatedIn: null, eliminatedBy: null, state: 'waiting' };
    Core.forEachMatch((r, i) => {
      const w = state.picks[key(r, i)];
      if (!w) return;
      const p = Core.participants(state, r, i);
      const loser = p[0] === w ? p[1] : p[0];
      if (status[w]) status[w].wins++;
      if (loser && status[loser]) { status[loser].eliminatedIn = r; status[loser].eliminatedBy = w; }
    });
    const champ = Core.champion(state);
    for (const id of Object.keys(status)) {
      const s = status[id];
      s.state = id === champ ? 'champion' : s.eliminatedIn !== null ? 'eliminated' : s.wins > 0 ? 'advanced' : 'waiting';
    }
    return status;
  };

  /** Caminho de uma música pelo chaveamento: adversária e resultado em cada rodada. */
  Core.path = function (state, id) {
    const pos = state.order.indexOf(id);
    if (pos < 0) return [];
    const out = [];
    let i = pos >> 1;
    for (let r = 0; r < ROUNDS; r++) {
      const p = Core.participants(state, r, i);
      if (p[0] !== id && p[1] !== id) break;
      const w = state.picks[key(r, i)] || null;
      out.push({ r: r, i: i, opponent: p[0] === id ? p[1] : p[0], result: w === null ? 'pending' : (w === id ? 'won' : 'lost') });
      if (w !== id) break;
      i >>= 1;
    }
    return out;
  };

  /* ---------- Links do Spotify ---------- */

  Core.parseSpotifyTrack = function (text) {
    if (!text) return null;
    const s = String(text).trim();
    let m = s.match(/^spotify:track:([A-Za-z0-9]{22})$/);
    if (m) return m[1];
    m = s.match(/^https?:\/\/open\.spotify\.com\/(?:intl-[A-Za-z]{2}(?:-[A-Za-z]{2})?\/)?(?:embed\/)?track\/([A-Za-z0-9]{22})(?:[/?#].*)?$/);
    if (m) return m[1];
    return SPOTIFY_ID_RE.test(s) ? s : null;
  };

  /* ---------- Validação de dados importados ---------- */

  function cleanText(value, max) {
    if (value == null) return '';
    return String(value).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 200);
  }

  function toInt(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : NaN;
    if (value == null) return NaN;
    const digits = String(value).replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : NaN;
  }

  function plainMeta(meta) {
    try { return JSON.parse(JSON.stringify(meta && typeof meta === 'object' ? meta : {})); }
    catch (e) { return {}; }
  }

  /**
   * Valida um conjunto de dados (objeto {meta, songs} ou lista simples).
   * Exige exatamente 128 músicas únicas, com nome, artista, posição e streams.
   */
  Core.validateDataset = function (input) {
    const errors = [];
    const warnings = [];
    let meta = {};
    let list = input;
    if (input && !Array.isArray(input) && typeof input === 'object') { meta = input.meta; list = input.songs; }
    if (!Array.isArray(list)) {
      return { ok: false, errors: ['O arquivo precisa ter uma lista de músicas ("songs").'], warnings: warnings, data: null };
    }
    if (list.length !== TOTAL_SONGS) errors.push('São necessárias exatamente 128 músicas; o arquivo tem ' + list.length + '.');

    const songs = [];
    const ids = new Set();
    const ranks = new Set();
    const names = new Map();
    list.forEach((raw, idx) => {
      const where = 'Linha ' + (idx + 1);
      if (!raw || typeof raw !== 'object') { errors.push(where + ': formato inválido.'); return; }
      const title = cleanText(raw.title);
      const artist = cleanText(raw.artist);
      const label = title ? where + ' ("' + title + '")' : where;
      const rank = toInt(raw.rank);
      const streams = toInt(raw.streams);
      if (!title) errors.push(where + ': falta o nome da música.');
      if (!artist) errors.push(label + ': falta o artista.');
      if (!Number.isInteger(rank) || rank < 1) errors.push(label + ': posição no ranking ausente ou inválida.');
      else if (ranks.has(rank)) errors.push(label + ': a posição ' + rank + ' aparece mais de uma vez.');
      else ranks.add(rank);
      if (!Number.isInteger(streams) || streams <= 0) errors.push(label + ': quantidade de streams ausente ou inválida.');

      let id = cleanText(raw.id, 80) || ('song-' + (Number.isInteger(rank) ? rank : idx + 1));
      if (ids.has(id)) { errors.push(label + ': o identificador "' + id + '" está repetido.'); }
      ids.add(id);

      const nameKey = Core.normalizeText(artist) + '|' + Core.normalizeText(title);
      if (title && artist) {
        if (names.has(nameKey)) errors.push(label + ': "' + title + '" de ' + artist + ' aparece duas vezes (linha ' + names.get(nameKey) + ').');
        else names.set(nameKey, idx + 1);
      }

      const rawLink = raw.spotifyId != null && raw.spotifyId !== '' ? raw.spotifyId : (raw.spotify_id || raw.spotifyUrl || raw.spotify_url || '');
      let spotifyId = null;
      if (rawLink) {
        spotifyId = Core.parseSpotifyTrack(rawLink);
        if (!spotifyId) warnings.push(label + ': o link ou ID do Spotify não é válido e foi ignorado.');
      }

      let features = [];
      if (Array.isArray(raw.features)) features = raw.features.map((f) => cleanText(f, 80)).filter(Boolean);
      else if (typeof raw.features === 'string') features = raw.features.split(/[;|]/).map((f) => cleanText(f, 80)).filter(Boolean);

      const daily = toInt(raw.dailyStreams);
      songs.push({
        id: id, rank: rank, title: title, artist: artist, features: features.slice(0, 8),
        streams: streams, dailyStreams: Number.isInteger(daily) && daily > 0 ? daily : null, spotifyId: spotifyId
      });
    });

    if (!errors.length) {
      const sorted = songs.slice().sort((a, b) => a.rank - b.rank);
      let flagged = 0;
      for (let k = 0; k < sorted.length - 1 && flagged < 3; k++) {
        if (sorted[k].streams < sorted[k + 1].streams) {
          warnings.push('As posições ' + sorted[k].rank + ' e ' + sorted[k + 1].rank + ' não estão em ordem decrescente de streams.');
          flagged++;
        }
      }
    }
    return { ok: errors.length === 0, errors: errors, warnings: warnings, data: errors.length ? null : { meta: plainMeta(meta), songs: songs } };
  };

  /** Leitor de CSV (RFC 4180): aspas, aspas escapadas, vírgula ou ponto e vírgula. */
  Core.parseCSV = function (text) {
    const src = String(text || '').replace(/^\uFEFF/, '');
    const firstLine = src.split(/\r?\n/, 1)[0] || '';
    const delim = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (quoted) {
        if (c === '"') {
          if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
        } else field += c;
      } else if (c === '"') quoted = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && src[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((f) => f.trim() !== ''));
  };

  Core.csvToDataset = function (text) {
    const rows = Core.parseCSV(text);
    if (rows.length < 2) return { error: 'O CSV está vazio ou não tem cabeçalho.' };
    const header = rows[0].map((h) => Core.normalizeText(h).replace(/ /g, '_'));
    const col = (names) => header.findIndex((h) => names.indexOf(h) !== -1);
    const idx = {
      rank: col(['rank', 'posicao', 'position', 'pos', 'ranking']),
      title: col(['title', 'titulo', 'musica', 'song', 'track', 'nome']),
      artist: col(['artist', 'artista']),
      features: col(['features', 'participacoes', 'feat', 'participacao']),
      streams: col(['streams', 'reproducoes', 'plays']),
      daily: col(['daily', 'daily_streams', 'diario']),
      spotify: col(['spotify_id', 'spotify', 'spotify_url', 'link', 'url', 'id_spotify'])
    };
    const missing = [];
    if (idx.rank < 0) missing.push('rank');
    if (idx.title < 0) missing.push('title');
    if (idx.artist < 0) missing.push('artist');
    if (idx.streams < 0) missing.push('streams');
    if (missing.length) return { error: 'Faltam colunas obrigatórias no cabeçalho: ' + missing.join(', ') + '.' };
    const get = (r, j) => (j >= 0 && r[j] != null ? r[j] : '');
    const songs = rows.slice(1).map((r) => ({
      rank: get(r, idx.rank), title: get(r, idx.title), artist: get(r, idx.artist),
      features: get(r, idx.features), streams: get(r, idx.streams), dailyStreams: get(r, idx.daily),
      spotifyId: get(r, idx.spotify)
    }));
    return { data: { meta: { source: { name: 'Arquivo CSV importado' } }, songs: songs } };
  };

  /** Restaura um estado salvo, validando cada parte; escolhas inconsistentes são descartadas. */
  Core.restoreState = function (raw) {
    if (!raw || typeof raw !== 'object') return { error: 'o conteúdo salvo não é um torneio' };
    if (raw.version !== STATE_VERSION) return { error: 'versão de dados desconhecida' };
    const v = Core.validateDataset(raw.dataset);
    if (!v.ok) return { error: 'a lista de músicas salva está incompleta' };
    const ids = new Set(v.data.songs.map((s) => s.id));
    const order = raw.order;
    if (!Array.isArray(order) || order.length !== TOTAL_SONGS || new Set(order).size !== TOTAL_SONGS || !order.every((id) => ids.has(id))) {
      return { error: 'a ordem dos confrontos salva é inválida' };
    }
    const state = {
      version: STATE_VERSION,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
      dataset: v.data,
      format: raw.format === 'random' ? 'random' : 'seeded',
      rngSeed: raw.format === 'random' && Number.isFinite(raw.rngSeed) ? raw.rngSeed >>> 0 : null,
      order: order.slice(),
      picks: {},
      history: []
    };
    let dropped = 0;
    const picks = raw.picks && typeof raw.picks === 'object' ? raw.picks : {};
    for (const k of Object.keys(picks)) {
      const m = /^([0-6])-(\d{1,2})$/.exec(k);
      const value = picks[k];
      if (m && +m[2] < ROUND_SIZES[+m[1]] && ids.has(value)) state.picks[k] = value;
      else dropped++;
    }
    dropped += Core.sanitize(state).length;
    const validEntry = (h) => h && typeof h.key === 'string' && typeof h.next === 'string' &&
      (h.prev === null || typeof h.prev === 'string') && Array.isArray(h.cleared);
    if (!dropped && Array.isArray(raw.history) && raw.history.every(validEntry)) {
      state.history = raw.history.slice(-HISTORY_LIMIT);
    }
    return { state: state, repaired: dropped };
  };

  /* =========================================================================
   * 3. Persistência
   * ========================================================================= */

  const KEYS = {
    state: 'st128:state:v1',
    backup: 'st128:state:backup',
    links: 'st128:links:v1',
    covers: 'st128:covers:v1',
    settings: 'st128:settings:v1'
  };

  function readJSON(k) {
    try {
      const text = global.localStorage.getItem(k);
      return text ? JSON.parse(text) : null;
    } catch (e) {
      return undefined; // armazenamento bloqueado ou JSON corrompido
    }
  }

  function writeJSON(k, value) {
    try {
      global.localStorage.setItem(k, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function removeKey(k) {
    try { global.localStorage.removeItem(k); } catch (e) { /* sem acesso ao armazenamento */ }
  }

  /* =========================================================================
   * 4. Utilidades de interface
   * ========================================================================= */

  const App = {
    state: null,
    defaultData: null,       // { data, origin }
    songs: new Map(),        // id -> música (com cabeça de chave)
    overrides: {},           // links do Spotify adicionados pelo usuário
    covers: {},              // spotifyId -> URL da capa (via oEmbed)
    settings: { autoAdvance: true },
    storageOk: true,
    busy: false,
    route: { name: 'inicio', params: [] },
    songsView: { title: '', artist: '', sort: 'rank', status: 'all' },
    importDraft: null,
    celebrated: {},
    timers: []
  };

  const fmtInt = new Intl.NumberFormat('pt-BR');
  const fmtCompact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 2 });
  const fmtPct = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : (iso || 'data não informada');
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function later(fn, ms) {
    const t = setTimeout(fn, ms);
    App.timers.push(t);
    return t;
  }

  function clearTimers() {
    App.timers.forEach(clearTimeout);
    App.timers = [];
  }

  function announce(text) {
    const live = $('#live');
    if (!live) return;
    live.textContent = '';
    later(() => { live.textContent = text; }, 30);
  }

  let toastTimer = null;
  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.hidden = false;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => { el.hidden = true; }, 250);
    }, 3200);
  }

  function showBanner(html) {
    const el = $('#banner');
    el.innerHTML = '<div class="shell banner-inner"><div>' + html + '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="dismiss-banner">Fechar aviso</button></div>';
    el.hidden = false;
  }

  /** Caixa de diálogo de confirmação baseada em <dialog>, com alternativa para navegadores antigos. */
  function confirmDialog(opts) {
    const dialog = $('#dialog');
    if (!dialog || typeof dialog.showModal !== 'function') {
      return Promise.resolve(global.confirm(opts.title + '\n\n' + (opts.text || '')));
    }
    $('#dialog-title').textContent = opts.title;
    $('#dialog-body').innerHTML = opts.bodyHtml || '<p>' + esc(opts.text || '') + '</p>';
    $('#dialog-actions').innerHTML =
      '<button type="submit" value="cancel" class="btn btn-ghost">' + esc(opts.cancelLabel || 'Cancelar') + '</button>' +
      '<button type="submit" value="ok" class="btn ' + (opts.danger ? 'btn-danger-solid' : 'btn-primary') + '">' + esc(opts.confirmLabel || 'Confirmar') + '</button>';
    return new Promise((resolve) => {
      const onClose = () => {
        dialog.removeEventListener('close', onClose);
        resolve(dialog.returnValue === 'ok');
      };
      dialog.returnValue = 'cancel';
      dialog.addEventListener('close', onClose);
      dialog.showModal();
      const cancel = $('#dialog-actions .btn-ghost');
      if (cancel) cancel.focus();
    });
  }

  /* ---------- Músicas, links e capas ---------- */

  function rebuildSongIndex() {
    App.songs = new Map();
    if (!App.state) return;
    for (const s of Core.rankSongs(App.state.dataset.songs)) App.songs.set(s.id, s);
  }

  const song = (id) => App.songs.get(id) || null;

  function linkKey(s) {
    return Core.normalizeText(s.artist) + '|' + Core.normalizeText(s.title);
  }

  function spotifyIdFor(s) {
    return App.overrides[linkKey(s)] || s.spotifyId || null;
  }

  function spotifyHref(s) {
    const id = spotifyIdFor(s);
    return id
      ? 'https://open.spotify.com/track/' + id
      : 'https://open.spotify.com/search/' + encodeURIComponent(s.title + ' ' + s.artist);
  }

  function artistLine(s) {
    return s.features && s.features.length ? s.artist + ' com ' + joinNames(s.features) : s.artist;
  }

  function joinNames(list) {
    if (list.length <= 1) return list.join('');
    return list.slice(0, -1).join(', ') + ' e ' + list[list.length - 1];
  }

  /* ---------- Player do Spotify (Embed oficial + IFrame API) ----------
   * Toca a faixa dentro do site. Sem login no Spotify, o Embed toca a prévia de 30 s;
   * com login no navegador, a faixa completa. Precisa do ID da faixa: músicas sem ID
   * abrem o passo de vincular a faixa. Tocar nunca registra voto.
   */
  const SPOTIFY_API_SRC = 'https://open.spotify.com/embed/iframe-api/v1';
  const Player = { api: null, controller: null, loading: null, songId: null, state: 'idle', pendingPlay: false };
  const PLAY_ICONS = {
    play: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
    link: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    wait: '<svg class="icon spin-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="30 20" stroke-linecap="round"/></svg>'
  };

  function playState(s) {
    if (!spotifyIdFor(s)) return 'unlinked';
    return Player.songId === s.id ? Player.state : 'idle';
  }

  function playButtonParts(s) {
    const st = playState(s);
    const map = {
      unlinked: ['link', 'Vincular faixa', 'Vincular a faixa de ' + s.title + ' no Spotify para tocar aqui'],
      idle: ['play', 'Tocar', 'Tocar ' + s.title + ' de ' + s.artist],
      loading: ['wait', 'Carregando', 'Carregando ' + s.title],
      playing: ['pause', 'Pausar', 'Pausar ' + s.title],
      paused: ['play', 'Continuar', 'Continuar ' + s.title],
      error: ['play', 'Tentar de novo', 'Tentar tocar ' + s.title + ' de novo']
    };
    return { st: st, parts: map[st] || map.idle };
  }

  /** Botão de tocar: independente do voto. */
  function playButton(s, opts) {
    const o = opts || {};
    const b = playButtonParts(s);
    return '<button type="button" class="btn btn-play ' + (o.size || '') + '" data-action="play" data-song="' + esc(s.id) + '" data-size="' + esc(o.size || '') +
      '" data-state="' + b.st + '" aria-pressed="' + (b.st === 'playing') + '" aria-label="' + esc(b.parts[2]) + '">' +
      PLAY_ICONS[b.parts[0]] + '<span class="btn-label">' + b.parts[1] + '</span></button>';
  }

  function syncPlayButtons() {
    $$('[data-action="play"]').forEach((btn) => {
      const s = song(btn.dataset.song);
      if (!s) return;
      const b = playButtonParts(s);
      btn.dataset.state = b.st;
      btn.setAttribute('aria-pressed', String(b.st === 'playing'));
      btn.setAttribute('aria-label', b.parts[2]);
      btn.innerHTML = PLAY_ICONS[b.parts[0]] + '<span class="btn-label">' + b.parts[1] + '</span>';
    });
  }

  function renderDock() {
    const dock = $('#player-dock');
    const s = Player.songId ? song(Player.songId) : null;
    if (!s) { dock.hidden = true; document.body.classList.remove('has-dock'); return; }
    dock.hidden = false;
    document.body.classList.add('has-dock');
    $('#dock-title').textContent = s.title;
    $('#dock-artist').textContent = artistLine(s);
    const labels = { loading: 'Carregando o player do Spotify…', playing: 'Tocando agora', paused: 'Pausado', error: 'Player indisponível', idle: 'Pronto para tocar' };
    $('#dock-label').textContent = labels[Player.state] || '';
    dock.dataset.state = Player.state;
  }

  function setPlayerState(st) {
    Player.state = st;
    renderDock();
    syncPlayButtons();
  }

  function loadSpotifyApi() {
    if (Player.api) return Promise.resolve(Player.api);
    if (Player.loading) return Player.loading;
    Player.loading = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('tempo esgotado')), 12000);
      global.onSpotifyIframeApiReady = (IFrameAPI) => { clearTimeout(timer); Player.api = IFrameAPI; resolve(IFrameAPI); };
      const sc = document.createElement('script');
      sc.src = SPOTIFY_API_SRC;
      sc.async = true;
      sc.onerror = () => { clearTimeout(timer); reject(new Error('falha ao carregar')); };
      document.head.appendChild(sc);
    }).catch((err) => { Player.loading = null; throw err; });
    return Player.loading;
  }

  function onPlayback(e) {
    const d = (e && e.data) || {};
    if (!Player.songId) return;
    if (d.isBuffering) setPlayerState('loading');
    else setPlayerState(d.isPaused ? 'paused' : 'playing');
  }

  /** Toca (ou pausa/continua) a música no player fixo do rodapé. */
  async function playSong(id) {
    const s = song(id);
    if (!s) return;
    const spId = spotifyIdFor(s);
    if (!spId) { editLink(id, { forPlayer: true }); return; }
    if (Player.songId === id && Player.controller && (Player.state === 'playing' || Player.state === 'paused')) {
      Player.controller.togglePlay();
      return;
    }
    Player.songId = id;
    setPlayerState('loading');
    const uri = 'spotify:track:' + spId;
    try {
      const api = await loadSpotifyApi();
      if (Player.songId !== id) return; // outra música foi pedida enquanto carregava
      Player.pendingPlay = true;
      if (!Player.controller) {
        await new Promise((resolve) => {
          api.createController($('#player-embed'), { uri: uri, width: '100%', height: 80 }, (controller) => {
            Player.controller = controller;
            controller.addListener('playback_update', onPlayback);
            controller.addListener('ready', () => {
              if (Player.pendingPlay) { Player.pendingPlay = false; controller.play(); }
            });
            resolve();
          });
        });
      } else {
        Player.controller.loadUri(uri);
      }
      Player.controller.play();
      announce('Tocando ' + s.title + ' de ' + s.artist + '.');
    } catch (err) {
      if (Player.songId === id) setPlayerState('error');
      toast('Não foi possível carregar o player do Spotify. Verifique a conexão com a internet e tente de novo.');
    }
  }

  function closePlayer() {
    if (Player.controller) { try { Player.controller.pause(); } catch (e) { /* já parado */ } }
    Player.songId = null;
    Player.pendingPlay = false;
    setPlayerState('idle');
  }

  const PALETTES = [
    ['#0E3B2A', '#7CF2AE'], ['#2A1E4D', '#C9B8FF'], ['#4A1730', '#FFB0CB'], ['#3E2A0B', '#FFD27A'],
    ['#0C2F3F', '#8EE3FF'], ['#40140F', '#FF9C86'], ['#262626', '#EDEDE6'], ['#2C3A0C', '#DCFF7A']
  ];

  function hashString(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /**
   * Capa gerada: uma "capa de disco" tipográfica, única para cada faixa.
   * Se houver um link direto do Spotify, a capa oficial (oEmbed) é sobreposta
   * quando carregar; se falhar, a capa gerada continua visível.
   */
  function sleeve(s, size) {
    const pal = PALETTES[hashString(s.artist + '|' + s.title) % PALETTES.length];
    const spId = spotifyIdFor(s);
    const cover = spId ? App.covers[spId] : null;
    if (spId && !cover) queueCover(spId);
    return '<div class="sleeve ' + (size || '') + '" data-cover-for="' + esc(spId || '') + '" style="--sleeve-bg:' + pal[0] + ';--sleeve-fg:' + pal[1] + '" aria-hidden="true">' +
      '<div class="vinyl"><span class="vinyl-label"></span></div>' +
      '<div class="sleeve-face">' +
      '<span class="sleeve-seed">' + s.seed + '</span>' +
      '<span class="sleeve-title">' + esc(s.title) + '</span>' +
      '<span class="sleeve-artist">' + esc(s.artist) + '</span>' +
      (cover ? '<img class="sleeve-img" src="' + esc(cover) + '" alt="" loading="lazy" decoding="async">' : '') +
      '</div></div>';
  }

  const coverQueue = [];
  const coverPending = new Set();
  let coverActive = 0;

  function queueCover(spId) {
    if (App.covers[spId] || coverPending.has(spId) || App.covers['x:' + spId]) return;
    coverPending.add(spId);
    coverQueue.push(spId);
    pumpCovers();
  }

  function pumpCovers() {
    while (coverActive < 3 && coverQueue.length) {
      const spId = coverQueue.shift();
      coverActive++;
      const url = 'https://open.spotify.com/oembed?url=' + encodeURIComponent('https://open.spotify.com/track/' + spId);
      fetch(url)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status))))
        .then((json) => {
          const thumb = json && typeof json.thumbnail_url === 'string' && /^https:\/\//.test(json.thumbnail_url) ? json.thumbnail_url : null;
          if (!thumb) throw new Error('sem capa');
          App.covers[spId] = thumb;
          writeJSON(KEYS.covers, App.covers);
          $$('.sleeve[data-cover-for="' + spId + '"] .sleeve-face').forEach((face) => {
            if (face.querySelector('.sleeve-img')) return;
            const img = document.createElement('img');
            img.className = 'sleeve-img';
            img.alt = '';
            img.src = thumb;
            face.appendChild(img);
          });
        })
        .catch(() => { App.covers['x:' + spId] = Date.now(); }) // não tenta de novo nesta sessão
        .finally(() => { coverActive--; coverPending.delete(spId); pumpCovers(); });
    }
  }

  /* ---------- Estado e salvamento ---------- */

  function save() {
    if (!App.state) return;
    App.state.updatedAt = new Date().toISOString();
    const ok = writeJSON(KEYS.state, App.state);
    if (!ok && App.storageOk) {
      App.storageOk = false;
      showBanner('<strong>O progresso não está sendo salvo.</strong> Este navegador bloqueou o armazenamento local (modo privado ou espaço cheio). As escolhas valem até você fechar a aba.');
    }
  }

  function saveSettings() { writeJSON(KEYS.settings, App.settings); }

  function setState(state) {
    App.state = state;
    rebuildSongIndex();
    save();
  }

  function newTournament(format, dataset) {
    const data = dataset || (App.state ? App.state.dataset : App.defaultData && App.defaultData.data);
    const fmt = format || (App.state ? App.state.format : 'seeded');
    setState(Core.createState(data, fmt, randomSeed()));
    App.celebrated = {};
  }

  function randomSeed() {
    if (global.crypto && global.crypto.getRandomValues) {
      const a = new Uint32Array(1);
      global.crypto.getRandomValues(a);
      return a[0];
    }
    return Math.floor(Math.random() * 4294967296);
  }

  function summary() {
    const st = App.state;
    const done = Core.countDone(st);
    const round = Core.currentRound(st);
    return {
      done: done,
      remaining: TOTAL_MATCHES - done,
      percent: (done / TOTAL_MATCHES) * 100,
      round: round,
      champion: Core.champion(st),
      next: Core.nextPending(st)
    };
  }

  /* =========================================================================
   * 5. Telas
   * ========================================================================= */

  function render(html, opts) {
    const main = $('#main');
    main.innerHTML = html;
    main.dataset.view = App.route.name;
    if (!opts || opts.focus !== false) {
      const h = main.querySelector('h1');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
    if (!opts || opts.scroll !== false) global.scrollTo(0, 0);
  }

  function updateChrome() {
    $$('.nav a').forEach((a) => {
      const active = a.dataset.nav === App.route.name || (App.route.name === 'campea' && a.dataset.nav === 'confronto');
      if (active) {
        a.setAttribute('aria-current', 'page');
        const nav = a.parentElement;
        if (nav.scrollWidth > nav.clientWidth) nav.scrollLeft = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2;
      } else a.removeAttribute('aria-current');
    });
    const box = $('#topbar-progress');
    if (!App.state) { box.innerHTML = ''; return; }
    const s = summary();
    box.innerHTML = '<span class="tp-count"><strong>' + s.done + '</strong>/' + TOTAL_MATCHES + '</span>' +
      '<span class="tp-bar" role="img" aria-label="' + s.done + ' de ' + TOTAL_MATCHES + ' confrontos decididos"><span style="width:' + s.percent.toFixed(2) + '%"></span></span>';
    if (App.state.dataset.meta && App.state.dataset.meta.referenceDate) {
      $('#footer-date').textContent = formatDate(App.state.dataset.meta.referenceDate);
    }
  }

  function roundTrack(st) {
    return '<div class="round-track" role="list" aria-label="Progresso por rodada">' + ROUND_SIZES.map((size, r) => {
      const done = Core.doneInRound(st, r);
      const pct = (done / size) * 100;
      return '<div class="rt-seg" role="listitem" style="flex-grow:' + size + '">' +
        '<span class="rt-bar"><span style="width:' + pct + '%"></span></span>' +
        '<span class="rt-label">' + ROUND_SHORT[r] + '</span>' +
        '<span class="visually-hidden">' + ROUND_NAMES[r] + ': ' + done + ' de ' + size + ' confrontos</span></div>';
    }).join('') + '</div>';
  }

  /* ---------- Início ---------- */

  function viewHome() {
    const st = App.state;
    const s = summary();
    const started = s.done > 0;
    const meta = st.dataset.meta || {};
    const refDate = formatDate(meta.referenceDate || (meta.source && meta.source.consultedAt));
    const ctaLabel = s.champion ? 'Ver a campeã' : started ? 'Continuar o torneio' : 'Começar o torneio';
    const ctaHref = s.champion ? '#/campea' : '#/confronto';

    let side = '';
    if (s.champion) {
      const c = song(s.champion);
      side = '<p class="next-label">Campeã definida</p>' +
        '<div class="next-champ">' + sleeve(c, 'sleeve-md') + '<div><p class="next-title">' + esc(c.title) + '</p><p class="next-artist">' + esc(artistLine(c)) + '</p></div></div>';
    } else if (s.next) {
      const p = Core.participants(st, s.next.r, s.next.i).map(song);
      side = '<p class="next-label">' + (started ? 'Próximo confronto' : 'Confronto de abertura') + '</p>' +
        '<p class="next-round">' + ROUND_NAMES[s.next.r] + ', confronto ' + (s.next.i + 1) + ' de ' + ROUND_SIZES[s.next.r] + '</p>' +
        '<div class="next-pair">' +
        p.map((x) => '<div class="next-side">' + sleeve(x, 'sleeve-sm') + '<div class="next-text"><span class="next-seed">Cabeça ' + x.seed + '</span><p class="next-title">' + esc(x.title) + '</p><p class="next-artist">' + esc(x.artist) + '</p></div></div>').join('<span class="next-vs" aria-hidden="true">vs</span>') +
        '</div>';
    }

    const formatLocked = started;
    const formatPanel =
      '<section class="panel" aria-labelledby="fmt-title">' +
      '<h2 class="panel-title" id="fmt-title">Formato do chaveamento</h2>' +
      (formatLocked
        ? '<p class="panel-text">' + (st.format === 'seeded' ? 'Cabeças de chave por streams' : 'Sorteio salvo') + '. O formato fica travado depois do primeiro voto; para trocar, reinicie o torneio.</p>'
        : '<div class="choice-group" role="radiogroup" aria-label="Formato do chaveamento">' +
          choice('seeded', 'Cabeças de chave', 'A mais ouvida enfrenta a 128ª, a 2ª enfrenta a 127ª, e assim por diante. As favoritas só se cruzam no fim.', st.format === 'seeded') +
          choice('random', 'Sorteio', 'Os confrontos são sorteados uma vez e o sorteio fica salvo até o fim do torneio.', st.format === 'random') +
          '</div>' +
          (st.format === 'random' ? '<button type="button" class="btn btn-ghost btn-sm" data-action="redraw">Sortear de novo</button>' : '')) +
      '</section>';

    render(
      '<section class="home shell">' +
      '<div class="home-hero">' +
      '<div class="hero-copy">' +
      '<h1 class="display hero-title"><span>Spotify</span> <span>Top 128</span></h1>' +
      '<p class="hero-sub">The Ultimate Music Bracket</p>' +
      '<p class="hero-tagline">128 músicas. Uma campeã. Você decide.</p>' +
      '<p class="hero-text">As 128 faixas mais reproduzidas da história do Spotify, pela contagem do Kworb em ' + esc(refDate) + ', entram num mata-mata de sete rodadas. Os streams históricos só definem o chaveamento inicial. Quem escolhe a campeã é você.</p>' +
      '<div class="hero-actions">' +
      '<a class="btn btn-primary btn-lg" href="' + ctaHref + '">' + ctaLabel + '</a>' +
      '<a class="btn btn-ghost" href="#/musicas">Ver as 128 músicas</a>' +
      '<a class="btn btn-ghost" href="#/chave">Ver o chaveamento</a>' +
      '</div></div>' +
      '<aside class="hero-next" aria-label="Confronto em destaque">' + side + '</aside>' +
      '</div>' +
      '<dl class="scoreboard">' +
      stat('Participantes', '128') +
      stat('Fase atual', s.round === null ? 'Encerrado' : ROUND_NAMES[s.round]) +
      stat('Confrontos restantes', String(s.remaining)) +
      stat('Progresso', fmtPct.format(s.percent) + '%') +
      '</dl>' +
      roundTrack(st) +
      '<div class="home-panels">' + formatPanel +
      '<section class="panel" aria-labelledby="opt-title">' +
      '<h2 class="panel-title" id="opt-title">Preferências</h2>' +
      '<label class="toggle"><input type="checkbox" data-action="toggle-auto"' + (App.settings.autoAdvance ? ' checked' : '') + '> <span>Avançar sozinho para o próximo confronto depois de cada voto</span></label>' +
      '<p class="panel-text">O progresso é salvo a cada voto. Reiniciar apaga todas as escolhas deste torneio.</p>' +
      '<button type="button" class="btn btn-danger btn-sm" data-action="reset"' + (started ? '' : ' disabled') + '>Reiniciar o torneio</button>' +
      '</section></div>' +
      '</section>'
    );
  }

  function choice(value, title, text, checked) {
    return '<label class="choice' + (checked ? ' is-checked' : '') + '"><input type="radio" name="format" value="' + value + '" data-action="format"' + (checked ? ' checked' : '') + '>' +
      '<span class="choice-title">' + esc(title) + '</span><span class="choice-text">' + esc(text) + '</span></label>';
  }

  function stat(label, value) {
    return '<div class="sb-item"><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>';
  }

  /* ---------- Confronto ---------- */

  function viewMatch(params) {
    const st = App.state;
    let target = null;
    if (params[0]) {
      const m = /^(\d)-(\d{1,2})$/.exec(params[0]);
      if (m && +m[1] < ROUNDS && +m[2] < ROUND_SIZES[+m[1]]) target = { r: +m[1], i: +m[2] };
    }
    const pinned = Boolean(target);
    if (!target) target = Core.nextPending(st);
    if (!target) {
      if (Core.champion(st)) { navigate('#/campea', true); return; }
      target = { r: 0, i: 0 };
    }
    const r = target.r;
    const i = target.i;
    App.route.match = { r: r, i: i, pinned: pinned };
    const s = summary();
    const region = Core.regionOf(r, i);
    const p = Core.participants(st, r, i);
    const winner = Core.winner(st, r, i);

    const head =
      '<header class="match-head">' +
      '<div><p class="match-round">' + ROUND_NAMES[r] + (region !== null ? ' <span class="match-region">' + REGION_NAMES[region] + '</span>' : r === 5 ? ' <span class="match-region">Final Four</span>' : '') + '</p>' +
      '<h1 class="match-title">Confronto ' + (i + 1) + ' de ' + ROUND_SIZES[r] + '</h1></div>' +
      '<div class="match-progress"><span>' + s.done + ' de ' + TOTAL_MATCHES + ' confrontos decididos</span>' +
      '<span class="bar" aria-hidden="true"><span style="width:' + s.percent.toFixed(2) + '%"></span></span></div>' +
      '</header>';

    if (!p[0] || !p[1]) {
      render('<section class="match shell">' + head +
        '<div class="empty"><p class="empty-title">Este confronto ainda não tem as duas participantes.</p>' +
        '<p>Ele depende de resultados da rodada anterior que ainda não foram decididos.</p>' +
        '<a class="btn btn-primary" href="#/confronto">Ir para o próximo confronto pendente</a></div></section>');
      return;
    }

    const a = song(p[0]);
    const b = song(p[1]);
    const total = a.streams + b.streams;
    const pa = (a.streams / total) * 100;
    const leader = a.streams >= b.streams ? a : b;
    const diff = Math.abs(a.streams - b.streams);

    const g = Core.globalIndex(r, i);
    const prev = findReady(g, -1);
    const next = findReady(g, +1);
    const canUndo = st.history.length > 0;
    const pendingLink = s.next && (s.next.r !== r || s.next.i !== i)
      ? '<a class="btn ' + (winner ? 'btn-primary' : 'btn-ghost') + ' btn-sm" href="#/confronto">' + (winner ? 'Seguir para o próximo voto' : 'Ir para o pendente') + '</a>' : '';

    render(
      '<section class="match shell" data-r="' + r + '" data-i="' + i + '">' + head +
      '<div class="arena' + (winner ? ' is-decided' : '') + '">' +
      contender(a, winner, r, i, 'left') +
      '<div class="vs" aria-hidden="true"><span>vs</span></div>' +
      contender(b, winner, r, i, 'right') +
      '</div>' +
      '<div class="tape" aria-label="Comparação de streams">' +
      '<div class="tape-row"><span class="tape-num">' + fmtCompact.format(a.streams) + '</span><span class="tape-label">Streams no Spotify</span><span class="tape-num">' + fmtCompact.format(b.streams) + '</span></div>' +
      '<div class="tape-bar" aria-hidden="true"><span class="tape-a" style="width:' + pa.toFixed(2) + '%"></span><span class="tape-b"></span></div>' +
      '<p class="tape-note">' + (diff === 0 ? 'Empate exato em streams.' : esc(leader.title) + ' tem ' + fmtInt.format(diff) + ' streams a mais.') + '</p>' +
      '</div>' +
      '<div class="match-controls">' +
      '<div class="mc-group">' +
      '<a class="btn btn-ghost btn-sm' + (prev === null ? ' is-disabled' : '') + '" ' + (prev === null ? 'aria-disabled="true"' : 'href="#/confronto/' + matchParam(prev) + '"') + '>Confronto anterior</a>' +
      '<a class="btn btn-ghost btn-sm' + (next === null ? ' is-disabled' : '') + '" ' + (next === null ? 'aria-disabled="true"' : 'href="#/confronto/' + matchParam(next) + '"') + '>Próximo confronto</a>' +
      pendingLink +
      '</div>' +
      '<div class="mc-group">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="undo"' + (canUndo ? '' : ' disabled') + '>Desfazer última escolha</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="fullscreen">' + (document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia') + '</button>' +
      '</div>' +
      '</div>' +
      '<p class="kbd-hint">Atalhos: <kbd>1</kbd> e <kbd>2</kbd> escolhem a vencedora, <kbd>←</kbd> e <kbd>→</kbd> trocam de confronto, <kbd>Z</kbd> desfaz.</p>' +
      '</section>',
    );
  }

  function matchParam(g) {
    const m = Core.fromGlobalIndex(g);
    return m.r + '-' + m.i;
  }

  /** Procura o confronto pronto (com as duas participantes) mais próximo numa direção. */
  function findReady(g, dir) {
    for (let k = g + dir; k >= 0 && k < TOTAL_MATCHES; k += dir) {
      const m = Core.fromGlobalIndex(k);
      if (Core.isReady(App.state, m.r, m.i)) return k;
    }
    return null;
  }

  function contender(s, winner, r, i, side) {
    const isWinner = winner === s.id;
    const isLoser = Boolean(winner) && !isWinner;
    const keyHint = side === 'left' ? '1' : '2';
    let pickBtn;
    if (isWinner) {
      pickBtn = '<button type="button" class="btn btn-primary is-picked" disabled aria-pressed="true">Vencedora</button>';
    } else {
      pickBtn = '<button type="button" class="btn ' + (isLoser ? 'btn-ghost' : 'btn-primary') + '" data-action="pick" data-r="' + r + '" data-i="' + i + '" data-song="' + esc(s.id) + '" aria-keyshortcuts="' + keyHint + '" aria-label="' + esc((isLoser ? 'Trocar a vencedora para ' : 'Escolher ') + s.title + (isLoser ? '' : ' como vencedora')) + '">' +
        (isLoser ? 'Trocar para esta' : 'Escolher vencedora') + '</button>';
    }
    return '<article class="contender contender-' + side + (isWinner ? ' is-winner' : '') + (isLoser ? ' is-loser' : '') + '" data-song="' + esc(s.id) + '">' +
      '<div class="contender-art">' + sleeve(s, 'sleeve-lg') + '</div>' +
      '<div class="contender-body">' +
      '<p class="contender-meta"><span class="chip">Cabeça ' + s.seed + '</span><span>#' + s.rank + ' no ranking histórico</span></p>' +
      '<h2 class="contender-title">' + esc(s.title) + '</h2>' +
      '<p class="contender-artist">' + esc(artistLine(s)) + '</p>' +
      '<p class="contender-streams"><strong>' + fmtInt.format(s.streams) + '</strong> <span>streams</span></p>' +
      '<div class="contender-actions">' + playButton(s) + pickBtn + '</div>' +
      '</div>' +
      '<span class="stamp" aria-hidden="true">' + (isWinner ? 'Avançou' : isLoser ? 'Eliminada' : '') + '</span>' +
      (isLoser ? '<span class="visually-hidden">Eliminada neste confronto.</span>' : '') +
      (isWinner ? '<span class="visually-hidden">Vencedora deste confronto.</span>' : '') +
      '</article>';
  }

  /** Registra o voto. Trocar um resultado já decidido pede confirmação se apagar rodadas seguintes. */
  async function choose(r, i, songId) {
    if (App.busy) return;
    const st = App.state;
    const prev = Core.winner(st, r, i);
    if (prev === songId) return;
    if (prev) {
      const affected = Core.previewChange(st, r, i, songId);
      if (affected > 0) {
        const ok = await confirmDialog({
          title: 'Trocar a vencedora?',
          text: 'Isso também apaga ' + affected + (affected === 1 ? ' resultado' : ' resultados') + ' das rodadas seguintes que dependiam deste confronto. Você poderá votar neles de novo.',
          confirmLabel: 'Trocar e apagar',
          danger: true
        });
        if (!ok) return;
      }
    }
    App.busy = true;
    const res = Core.setPick(st, r, i, songId);
    if (!res.ok) {
      App.busy = false;
      toast('Não foi possível registrar o voto: este confronto mudou. A tela foi atualizada.');
      route();
      return;
    }
    save();
    const p = Core.participants(st, r, i);
    const w = song(songId);
    const l = song(p[0] === songId ? p[1] : p[0]);
    announce(w.title + ' avançou. ' + l.title + ' foi eliminada.');
    if (res.cleared.length) toast(res.cleared.length + (res.cleared.length === 1 ? ' resultado seguinte foi apagado.' : ' resultados seguintes foram apagados.'));

    // Mostra o resultado no próprio card antes de seguir.
    const arena = $('.arena');
    if (arena) {
      arena.classList.add('is-decided');
      $$('.contender', arena).forEach((card) => {
        const won = card.dataset.song === songId;
        card.classList.toggle('is-winner', won);
        card.classList.toggle('is-loser', !won);
        $('.stamp', card).textContent = won ? 'Avançou' : 'Eliminada';
        $$('[data-action="pick"], .is-picked', card).forEach((btn) => {
          btn.disabled = true;
          if (won) { btn.textContent = 'Vencedora'; btn.classList.add('is-picked'); btn.classList.replace('btn-ghost', 'btn-primary'); }
        });
      });
    }
    const done = Core.countDone(st);
    const prog = $('.match-progress');
    if (prog) {
      prog.firstElementChild.textContent = done + ' de ' + TOTAL_MATCHES + ' confrontos decididos';
      $('.bar > span', prog).style.width = (done / TOTAL_MATCHES * 100).toFixed(2) + '%';
    }
    updateChrome();

    const delay = prefersReducedMotion() ? 450 : 1100;
    const champion = Core.champion(st);
    later(() => {
      App.busy = false;
      if (champion && r === ROUNDS - 1) { navigate('#/campea'); return; }
      if (App.settings.autoAdvance && !prev && Core.nextPending(st)) { navigate('#/confronto'); return; }
      // Sem avanço automático: fica neste confronto (fixado na URL) com o botão para seguir.
      navigate('#/confronto/' + r + '-' + i, true);
    }, delay);
  }

  function undoLast() {
    if (App.busy) return;
    const h = Core.undo(App.state);
    if (!h) { toast('Não há escolha para desfazer.'); return; }
    save();
    const m = /^(\d)-(\d+)$/.exec(h.key);
    const s = song(h.next);
    toast('Escolha desfeita: ' + (s ? s.title : 'vencedora') + ' em ' + ROUND_NAMES[+m[1]] + '.');
    announce('Última escolha desfeita.');
    navigate('#/confronto/' + h.key);
  }

  /* ---------- Chaveamento ---------- */

  function viewBracket(params) {
    const st = App.state;
    const tabs = REGION_SLUGS.concat(['final-four']);
    let tab = params[0] && tabs.indexOf(params[0]) !== -1 ? params[0] : null;
    if (!tab) {
      const next = Core.nextPending(st);
      tab = next ? (next.r <= 4 ? REGION_SLUGS[Core.regionOf(next.r, next.i)] : 'final-four') : 'final-four';
    }
    const status = Core.computeStatus(st);
    const next = Core.nextPending(st);

    const tabBar = '<nav class="tabs" aria-label="Partes do chaveamento">' + tabs.map((t, k) => {
      const label = k < 4 ? REGION_NAMES[k] : 'Final Four';
      return '<a class="tab" href="#/chave/' + t + '"' + (t === tab ? ' aria-current="page"' : '') + '>' + label + '</a>';
    }).join('') + '</nav>';

    let columns = '';
    if (tab === 'final-four') {
      columns =
        bracketColumn(5, [0, 1], next, 'Semifinais') +
        bracketColumn(6, [0], next, 'Grande final') +
        championColumn(Core.champion(st), 'Campeã');
    } else {
      const reg = REGION_SLUGS.indexOf(tab);
      for (let r = 0; r <= 4; r++) {
        const per = 16 >> r;
        const list = [];
        for (let i = reg * per; i < (reg + 1) * per; i++) list.push(i);
        columns += bracketColumn(r, list, next, ROUND_NAMES[r]);
      }
      columns += championColumn(Core.winner(st, 4, reg), 'Vai à semifinal');
    }

    const alive = Object.keys(status).filter((id) => status[id].state !== 'eliminated').length;
    render(
      '<section class="bracket-view shell">' +
      '<header class="page-head"><h1 class="page-title">Chaveamento</h1>' +
      '<p class="page-text">' + (st.format === 'seeded' ? 'Cabeças de chave por streams históricos.' : 'Confrontos definidos por sorteio salvo.') + ' ' + alive + ' de 128 músicas seguem vivas. Toque em um confronto para votar ou revisar.</p></header>' +
      tabBar +
      '<div class="bracket-scroll" tabindex="0" aria-label="Chaveamento, role para os lados para ver as rodadas">' +
      '<div class="bracket ' + (tab === 'final-four' ? 'bracket-ff' : 'bracket-region') + '">' + columns + '</div></div>' +
      '<p class="legend"><span class="lg lg-win"></span> Classificada <span class="lg lg-lose"></span> Eliminada <span class="lg lg-next"></span> Próximo voto</p>' +
      '</section>'
    );
  }

  function bracketColumn(r, indices, next, title) {
    const cells = indices.map((i) => '<div class="b-cell">' + bracketMatch(r, i, next) + '</div>');
    let body = '';
    if (cells.length === 1) body = '<div class="b-single">' + cells[0] + '</div>';
    else for (let k = 0; k < cells.length; k += 2) body += '<div class="b-pair">' + cells[k] + cells[k + 1] + '</div>';
    return '<div class="b-col"><h2 class="b-col-head">' + esc(title) + '</h2><div class="b-col-body">' + body + '</div></div>';
  }

  function bracketMatch(r, i, next) {
    const st = App.state;
    const p = Core.participants(st, r, i);
    const w = Core.winner(st, r, i);
    const ready = Boolean(p[0] && p[1]);
    const isNext = next && next.r === r && next.i === i;
    const row = (id) => {
      if (!id) return '<span class="bm-row is-tbd"><span class="bm-seed"></span><span class="bm-name">A definir</span></span>';
      const s = song(id);
      const cls = w ? (w === id ? ' is-win' : ' is-lose') : '';
      return '<span class="bm-row' + cls + '"><span class="bm-seed">' + s.seed + '</span><span class="bm-name">' + esc(s.title) + '</span></span>';
    };
    const label = ROUND_NAMES[r] + ', confronto ' + (i + 1) + ': ' +
      (p[0] ? song(p[0]).title : 'a definir') + ' contra ' + (p[1] ? song(p[1]).title : 'a definir') +
      (w ? '. Vencedora: ' + song(w).title : ready ? '. Aguardando voto' : '');
    const inner = row(p[0]) + row(p[1]);
    if (!ready) return '<div class="bm is-waiting" aria-label="' + esc(label) + '">' + inner + '</div>';
    return '<a class="bm' + (isNext ? ' is-next' : '') + (w ? ' is-done' : '') + '" href="#/confronto/' + r + '-' + i + '" aria-label="' + esc(label) + '">' + inner + '</a>';
  }

  function championColumn(id, title) {
    let content;
    if (id) {
      const s = song(id);
      content = '<div class="b-champ is-set">' + sleeve(s, 'sleeve-xs') + '<span><strong>' + esc(s.title) + '</strong><small>' + esc(s.artist) + '</small></span></div>';
    } else content = '<div class="b-champ"><span><strong>A definir</strong></span></div>';
    return '<div class="b-col b-col-champ"><h2 class="b-col-head">' + esc(title) + '</h2><div class="b-col-body"><div class="b-single"><div class="b-cell">' + content + '</div></div></div></div>';
  }

  /* ---------- Lista das 128 músicas ---------- */

  const STATUS_LABEL = { waiting: 'Aguardando', advanced: 'Classificada', eliminated: 'Eliminada', champion: 'Campeã' };

  function viewSongs() {
    const v = App.songsView;
    render(
      '<section class="songs-view shell">' +
      '<header class="page-head"><h1 class="page-title">As 128 músicas</h1>' +
      '<p class="page-text">Mesma lista usada no chaveamento. Posição e streams vêm do Kworb; a cabeça de chave é a ordem entre as 128 participantes.</p></header>' +
      '<div class="filters" role="search">' +
      '<label class="field"><span>Música</span><input type="search" id="f-title" autocomplete="off" placeholder="Ex.: Yellow" value="' + esc(v.title) + '"></label>' +
      '<label class="field"><span>Artista</span><input type="search" id="f-artist" autocomplete="off" placeholder="Ex.: Coldplay" value="' + esc(v.artist) + '"></label>' +
      '<label class="field"><span>Ordenar por</span><select id="f-sort">' +
      opt('rank', 'Ranking', v.sort) + opt('streams-desc', 'Mais streams', v.sort) + opt('streams-asc', 'Menos streams', v.sort) + opt('title', 'Nome (A–Z)', v.sort) +
      '</select></label>' +
      '<label class="field"><span>Situação</span><select id="f-status">' +
      opt('all', 'Todas', v.status) + opt('waiting', 'Aguardando', v.status) + opt('advanced', 'Classificadas', v.status) + opt('eliminated', 'Eliminadas', v.status) + opt('champion', 'Campeã', v.status) +
      '</select></label>' +
      '</div>' +
      '<p class="list-count" id="list-count" aria-live="polite"></p>' +
      '<ol class="song-list" id="song-list"></ol>' +
      '</section>'
    );
    renderSongList();
  }

  function opt(value, label, current) {
    return '<option value="' + value + '"' + (value === current ? ' selected' : '') + '>' + esc(label) + '</option>';
  }

  function renderSongList() {
    const list = $('#song-list');
    if (!list) return;
    const v = App.songsView;
    const status = Core.computeStatus(App.state);
    const qt = Core.normalizeText(v.title);
    const qa = Core.normalizeText(v.artist);
    let items = Array.from(App.songs.values()).filter((s) => {
      if (qt && Core.normalizeText(s.title).indexOf(qt) === -1) return false;
      if (qa && Core.normalizeText([s.artist].concat(s.features || []).join(' ')).indexOf(qa) === -1) return false;
      return v.status === 'all' || status[s.id].state === v.status;
    });
    const sorters = {
      rank: (a, b) => a.rank - b.rank,
      'streams-desc': (a, b) => b.streams - a.streams,
      'streams-asc': (a, b) => a.streams - b.streams,
      title: (a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })
    };
    items.sort(sorters[v.sort] || sorters.rank);
    $('#list-count').textContent = items.length === 128 ? '128 músicas' : 'Mostrando ' + items.length + ' de 128 músicas';
    if (!items.length) {
      list.innerHTML = '<li class="song-empty">Nenhuma música corresponde aos filtros. Limpe a busca para ver a lista completa.</li>';
      return;
    }
    list.innerHTML = items.map((s) => {
      const st = status[s.id];
      let detail = '';
      if (st.state === 'eliminated') detail = 'na ' + ROUND_NAMES[st.eliminatedIn];
      else if (st.state === 'advanced') detail = st.wins + (st.wins === 1 ? ' vitória' : ' vitórias');
      const direct = Boolean(spotifyIdFor(s));
      return '<li class="song-row is-' + st.state + '">' +
        sleeve(s, 'sleeve-xs') +
        '<span class="sr-rank" title="Posição no ranking histórico do Kworb">#' + s.rank + '</span>' +
        '<span class="sr-main"><strong>' + esc(s.title) + '</strong><span>' + esc(artistLine(s)) + '</span></span>' +
        '<span class="sr-streams"><strong>' + fmtInt.format(s.streams) + '</strong><span>streams</span></span>' +
        '<span class="sr-status"><span class="pill pill-' + st.state + '">' + STATUS_LABEL[st.state] + '</span>' + (detail ? '<small>' + esc(detail) + '</small>' : '') + '</span>' +
        '<span class="sr-actions">' + playButton(s, { size: 'btn-sm' }) +
        (direct ? '<button type="button" class="btn btn-ghost btn-sm" data-action="edit-link" data-song="' + esc(s.id) + '" aria-label="' + esc('Trocar a faixa vinculada de ' + s.title) + '">Trocar faixa</button>' : '') + '</span>' +
        '</li>';
    }).join('');
  }

  /** Permite colar o link oficial de uma faixa; fica salvo neste navegador e vale para os próximos torneios. */
  function editLink(id, opts) {
    const forPlayer = Boolean(opts && opts.forPlayer);
    const s = song(id);
    const dialog = $('#dialog');
    if (!s || !dialog || typeof dialog.showModal !== 'function') return;
    const current = spotifyIdFor(s);
    $('#dialog-title').textContent = (forPlayer ? 'Vincular faixa: ' : 'Faixa no Spotify: ') + s.title;
    $('#dialog-body').innerHTML =
      '<p>' + (forPlayer ? 'Para tocar aqui, o site precisa saber qual é a faixa exata no Spotify. ' : '') +
      'Abra a busca, escolha a faixa certa (' + esc(s.title) + ', de ' + esc(s.artist) + '), use Compartilhar e Copiar link da música, e cole abaixo.</p>' +
      '<p><a href="' + esc(spotifyHref(s)) + '" target="_blank" rel="noopener noreferrer">Buscar esta música no Spotify</a> (abre em nova aba)</p>' +
      '<label class="field field-wide"><span>Link ou ID da faixa</span><input type="text" id="link-input" inputmode="url" autocomplete="off" placeholder="https://open.spotify.com/track/..." value="' + esc(current ? 'https://open.spotify.com/track/' + current : '') + '"></label>' +
      '<p class="field-error" id="link-error" role="alert"></p>';
    $('#dialog-actions').innerHTML =
      (App.overrides[linkKey(s)] ? '<button type="submit" value="remove" class="btn btn-danger btn-sm" formnovalidate>Desvincular</button>' : '') +
      '<button type="submit" value="cancel" class="btn btn-ghost" formnovalidate>Cancelar</button>' +
      '<button type="submit" value="save" class="btn btn-primary" id="link-save">' + (forPlayer ? 'Vincular e tocar' : 'Salvar') + '</button>';
    const onSubmit = (e) => {
      const action = e.submitter ? e.submitter.value : 'cancel';
      if (action !== 'save') return;
      const parsed = Core.parseSpotifyTrack($('#link-input').value);
      if (!parsed) {
        e.preventDefault();
        $('#link-error').textContent = 'Esse não parece um link de faixa do Spotify. Ele deve ter o formato open.spotify.com/track/ seguido de 22 caracteres.';
        $('#link-input').focus();
      }
    };
    const onClose = () => {
      dialog.removeEventListener('close', onClose);
      $('#dialog-form').removeEventListener('submit', onSubmit);
      if (dialog.returnValue === 'save') {
        const parsed = Core.parseSpotifyTrack($('#link-input').value);
        if (parsed) {
          App.overrides[linkKey(s)] = parsed;
          writeJSON(KEYS.links, App.overrides);
          toast('Faixa vinculada: ' + s.title + '.');
          if (forPlayer) setTimeout(() => playSong(s.id), 0);
        }
      } else if (dialog.returnValue === 'remove') {
        delete App.overrides[linkKey(s)];
        writeJSON(KEYS.links, App.overrides);
        if (Player.songId === s.id) closePlayer();
        toast('Faixa desvinculada.');
      }
      renderSongList();
      syncPlayButtons();
    };
    $('#dialog-form').addEventListener('submit', onSubmit);
    dialog.addEventListener('close', onClose);
    dialog.returnValue = 'cancel';
    dialog.showModal();
    $('#link-input').focus();
  }

  /* ---------- Estatísticas ---------- */

  function viewStats() {
    const st = App.state;
    const s = summary();
    const status = Core.computeStatus(st);
    const ids = Object.keys(status);
    const eliminated = ids.filter((id) => status[id].state === 'eliminated').length;
    const champ = s.champion ? song(s.champion) : null;

    const rounds = ROUND_SIZES.map((size, r) => {
      const done = Core.doneInRound(st, r);
      return '<tr><th scope="row">' + ROUND_NAMES[r] + '</th><td>' + done + ' de ' + size + '</td><td class="td-bar"><span class="bar"><span style="width:' + (done / size * 100) + '%"></span></span></td></tr>';
    }).join('');

    // Artistas com mais músicas ainda vivas (crédito principal).
    const byArtist = new Map();
    ids.forEach((id) => {
      if (status[id].state === 'eliminated') return;
      const a = song(id).artist;
      byArtist.set(a, (byArtist.get(a) || 0) + 1);
    });
    const topArtists = Array.from(byArtist.entries()).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 6);

    // Maior surpresa: vitória com a maior diferença de cabeça de chave.
    let upset = null;
    Core.forEachMatch((r, i) => {
      const w = Core.winner(st, r, i);
      if (!w) return;
      const p = Core.participants(st, r, i);
      const ws = song(w);
      const ls = song(p[0] === w ? p[1] : p[0]);
      const gap = ws.seed - ls.seed;
      if (gap > 0 && (!upset || gap > upset.gap)) upset = { gap: gap, w: ws, l: ls, r: r };
    });

    render(
      '<section class="stats-view shell">' +
      '<header class="page-head"><h1 class="page-title">Estatísticas</h1>' +
      '<p class="page-text">Atualizadas a cada voto.</p></header>' +
      '<dl class="scoreboard scoreboard-wide">' +
      stat('Músicas participantes', '128') +
      stat('Confrontos concluídos', String(s.done)) +
      stat('Confrontos restantes', String(s.remaining)) +
      stat('Músicas eliminadas', String(eliminated)) +
      stat('Ainda na disputa', String(128 - eliminated)) +
      stat('Rodada atual', s.round === null ? 'Encerrado' : ROUND_NAMES[s.round]) +
      stat('Progresso', fmtPct.format(s.percent) + '%') +
      stat('Campeã', champ ? champ.title : 'A definir') +
      '</dl>' +
      '<div class="stats-grid">' +
      '<section class="panel"><h2 class="panel-title">Rodada por rodada</h2><table class="round-table"><tbody>' + rounds + '</tbody></table></section>' +
      '<section class="panel"><h2 class="panel-title">Artistas com mais músicas vivas</h2>' +
      (topArtists.length ? '<ol class="rank-list">' + topArtists.map((x) => '<li><span>' + esc(x[0]) + '</span><strong>' + x[1] + '</strong></li>').join('') + '</ol>' : '<p class="panel-text">Nenhuma música na disputa.</p>') +
      '</section>' +
      '<section class="panel"><h2 class="panel-title">Maior surpresa até agora</h2>' +
      (upset
        ? '<p class="upset"><strong>' + esc(upset.w.title) + '</strong> (cabeça ' + upset.w.seed + ') eliminou <strong>' + esc(upset.l.title) + '</strong> (cabeça ' + upset.l.seed + ') na ' + ROUND_NAMES[upset.r] + '.</p>'
        : '<p class="panel-text">Nenhuma cabeça de chave pior colocada venceu uma melhor ainda.</p>') +
      '</section>' +
      '</div>' +
      (champ ? '<p class="center"><a class="btn btn-primary" href="#/campea">Ver a tela da campeã</a></p>' : '') +
      '</section>'
    );
  }

  /* ---------- Campeã ---------- */

  function viewChampion() {
    const st = App.state;
    const id = Core.champion(st);
    if (!id) {
      const s = summary();
      render('<section class="shell"><div class="empty"><h1 class="empty-title">A campeã ainda não foi definida.</h1>' +
        '<p>Faltam ' + s.remaining + ' confrontos para a grande final.</p>' +
        '<a class="btn btn-primary" href="#/confronto">Continuar o torneio</a></div></section>');
      return;
    }
    const c = song(id);
    const path = Core.path(st, id);
    const steps = path.map((p) => {
      const o = song(p.opponent);
      return '<li class="path-step"><span class="path-round">' + ROUND_NAMES[p.r] + '</span>' +
        '<span class="path-opp">' + sleeve(o, 'sleeve-xs') + '<span><strong>' + esc(o.title) + '</strong><small>' + esc(o.artist) + ', cabeça ' + o.seed + '</small></span></span>' +
        '<a class="path-link" href="#/confronto/' + p.r + '-' + p.i + '" aria-label="Revisar o confronto contra ' + esc(o.title) + '">Revisar</a></li>';
    }).join('');

    render(
      '<section class="champion-view shell">' +
      '<div class="champion-hero">' +
      '<div class="champion-art">' + sleeve(c, 'sleeve-xl') + '</div>' +
      '<div class="champion-copy">' +
      '<p class="champion-kicker">A campeã do Spotify Top 128</p>' +
      '<h1 class="display champion-title">' + esc(c.title) + '</h1>' +
      '<p class="champion-artist">' + esc(artistLine(c)) + '</p>' +
      '<dl class="champion-facts">' +
      '<div><dt>Streams históricos</dt><dd>' + fmtInt.format(c.streams) + '</dd></div>' +
      '<div><dt>Posição original no ranking</dt><dd>#' + c.rank + '</dd></div>' +
      '<div><dt>Cabeça de chave</dt><dd>' + c.seed + '</dd></div>' +
      '</dl>' +
      '<p class="champion-message">Sete confrontos, sete vitórias. Entre as 128 faixas mais ouvidas do Spotify, esta foi a sua escolhida.</p>' +
      '<div class="hero-actions">' + playButton(c, { size: 'btn-lg' }) +
      '<button type="button" class="btn btn-ghost" data-action="scroll-path">Ver o caminho até o título</button>' +
      '<button type="button" class="btn btn-ghost" data-action="new-tournament">Começar um novo torneio</button></div>' +
      '</div></div>' +
      '<section class="panel path" id="caminho" aria-labelledby="path-title"><h2 class="panel-title" id="path-title">Caminho até o título</h2>' +
      '<ol class="path-list">' + steps + '</ol></section>' +
      '</section>'
    );
    if (!App.celebrated[id]) {
      App.celebrated[id] = true;
      confetti();
    }
  }

  /** Comemoração curta; não roda se o usuário pediu menos movimento. */
  function confetti() {
    if (prefersReducedMotion()) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const w = canvas.width = global.innerWidth * dpr;
    const h = canvas.height = global.innerHeight * dpr;
    const colors = ['#1ED760', '#F4F4EF', '#7CF2AE', '#C9B8FF', '#FFD27A'];
    const parts = Array.from({ length: 140 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3, y: h * 0.35,
      vx: (Math.random() - 0.5) * 16 * dpr, vy: (-Math.random() * 14 - 4) * dpr,
      s: (Math.random() * 6 + 4) * dpr, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)]
    }));
    const start = performance.now();
    function frame(now) {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += 0.35 * dpr; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - t / 2600);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (t < 2600) requestAnimationFrame(frame); else canvas.remove();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Dados ---------- */

  function viewData() {
    const st = App.state;
    const meta = st ? (st.dataset.meta || {}) : {};
    const src = meta.source || {};
    const cross = meta.crossCheck || {};
    const linked = st ? Array.from(App.songs.values()).filter((s) => spotifyIdFor(s)).length : 0;
    const defaultMeta = App.defaultData ? App.defaultData.data.meta || {} : {};
    const newer = st && defaultMeta.dataVersion && meta.dataVersion && defaultMeta.dataVersion !== meta.dataVersion;
    const excluded = Array.isArray(meta.excluded) ? meta.excluded : [];
    const draft = App.importDraft;

    let draftHtml = '';
    if (draft) {
      draftHtml = '<div class="import-result ' + (draft.ok ? 'is-ok' : 'is-error') + '" role="status">' +
        '<p><strong>' + esc(draft.fileName) + '</strong>: ' + (draft.ok ? 'arquivo válido, com 128 músicas.' : 'o arquivo não pode ser usado.') + '</p>' +
        (draft.errors.length ? '<ul>' + draft.errors.slice(0, 12).map((e) => '<li>' + esc(e) + '</li>').join('') + (draft.errors.length > 12 ? '<li>e mais ' + (draft.errors.length - 12) + ' problema(s).</li>' : '') + '</ul>' : '') +
        (draft.warnings.length ? '<p class="warn-title">Avisos</p><ul>' + draft.warnings.slice(0, 8).map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '') +
        (draft.ok ? '<button type="button" class="btn btn-primary btn-sm" data-action="apply-import">Usar estes dados e começar um novo torneio</button>' : '') +
        '</div>';
    }

    render(
      '<section class="data-view shell">' +
      '<header class="page-head"><h1 class="page-title">Dados e fontes</h1>' +
      '<p class="page-text">De onde vêm as 128 músicas, como atualizá-las e como importar uma lista própria.</p></header>' +
      (App.dataErrors && App.dataErrors.length ? '<div class="import-result is-error"><p><strong>Os dados padrão não puderam ser carregados.</strong></p><ul>' + App.dataErrors.slice(0, 6).map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul></div>' : '') +
      (newer ? '<div class="import-result is-ok"><p>Há uma versão mais nova dos dados padrão (' + esc(defaultMeta.dataVersion) + '). O torneio atual continua com os dados com que começou.</p><button type="button" class="btn btn-primary btn-sm" data-action="use-default">Começar novo torneio com os dados novos</button></div>' : '') +
      '<div class="stats-grid">' +
      '<section class="panel"><h2 class="panel-title">Fonte do ranking</h2>' +
      (st ? '<p class="panel-text">' + esc(src.name || 'Fonte não informada') + (src.url ? ' — <a href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer">abrir a fonte</a>' : '') + '.</p>' +
        '<p class="panel-text">Data de referência: <strong>' + esc(formatDate(meta.referenceDate || src.consultedAt)) + '</strong>.</p>' +
        (cross.name ? '<p class="panel-text">Conferência: ' + esc(cross.name) + (cross.asOf ? ', atualizada em ' + esc(formatDate(cross.asOf)) : '') + '.</p>' : '') +
        (meta.selection ? '<p class="panel-text">' + esc(meta.selection) + '</p>' : '') +
        (excluded.length ? '<p class="panel-text">Fora da lista: ' + excluded.map((x) => esc(x.artist + ' — ' + x.title) + ' (posição ' + x.rank + '). ' + esc(x.reason || '')).join(' ') + '</p>' : '')
        : '<p class="panel-text">Nenhum dado carregado.</p>') +
      '</section>' +
      '<section class="panel"><h2 class="panel-title">Player do Spotify</h2>' +
      '<p class="panel-text"><strong>' + linked + ' de 128</strong> músicas têm a faixa vinculada e tocam aqui no site, pelo player oficial do Spotify: a prévia de 30 segundos, ou a faixa completa se você estiver logado no Spotify neste navegador.</p>' +
      '<p class="panel-text">Para as demais, o botão Vincular faixa pede o link uma única vez. Para vincular todas de uma vez, rode <code>node tools/atualizar-dados.mjs</code> e importe o resultado, ou importe um arquivo com a coluna <code>spotify_id</code>.</p>' +
      '</section>' +
      '<section class="panel"><h2 class="panel-title">Importar uma lista</h2>' +
      '<p class="panel-text">JSON no mesmo formato de <code>data/songs.json</code> ou CSV com as colunas <code>rank, title, artist, streams</code> (opcionais: <code>features, spotify_id, daily</code>). São necessárias exatamente 128 músicas únicas.</p>' +
      '<label class="file-field"><span class="btn btn-ghost btn-sm">Escolher arquivo</span><input type="file" id="import-file" accept=".json,.csv,application/json,text/csv"></label>' +
      draftHtml +
      '</section>' +
      '<section class="panel"><h2 class="panel-title">Exportar e restaurar</h2>' +
      '<div class="stack">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="export-json"' + (st ? '' : ' disabled') + '>Baixar os dados atuais (JSON)</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="export-csv"' + (st ? '' : ' disabled') + '>Baixar os dados atuais (CSV)</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-action="use-default"' + (App.defaultData ? '' : ' disabled') + '>Restaurar os dados padrão</button>' +
      '</div>' +
      '<p class="panel-text">O arquivo exportado inclui os links que você adicionou.</p>' +
      '</section>' +
      '</div>' +
      '</section>'
    );
  }

  function currentDatasetForExport() {
    const ds = App.state.dataset;
    return {
      meta: ds.meta,
      songs: Core.rankSongs(ds.songs).map((s) => ({
        id: s.id, rank: s.rank, seed: s.seed, title: s.title, artist: s.artist, features: s.features,
        streams: s.streams, dailyStreams: s.dailyStreams, spotifyId: spotifyIdFor(s)
      }))
    };
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function handleImportFile(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      App.importDraft = { fileName: file.name, ok: false, errors: ['O arquivo tem mais de 2 MB; uma lista de 128 músicas é bem menor que isso.'], warnings: [] };
      route();
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      App.importDraft = { fileName: file.name, ok: false, errors: ['Não foi possível ler o arquivo.'], warnings: [] };
      route();
    };
    reader.onload = () => {
      const text = String(reader.result || '');
      let parsed;
      const isCsv = /\.csv$/i.test(file.name) || (!/^\s*[[{]/.test(text));
      if (isCsv) {
        const res = Core.csvToDataset(text);
        if (res.error) { App.importDraft = { fileName: file.name, ok: false, errors: [res.error], warnings: [] }; route(); return; }
        parsed = res.data;
      } else {
        try { parsed = JSON.parse(text); }
        catch (e) { App.importDraft = { fileName: file.name, ok: false, errors: ['O JSON tem um erro de sintaxe: ' + e.message], warnings: [] }; route(); return; }
      }
      const v = Core.validateDataset(parsed);
      App.importDraft = { fileName: file.name, ok: v.ok, errors: v.errors, warnings: v.warnings, data: v.data };
      route();
    };
    reader.readAsText(file);
  }

  /* =========================================================================
   * 6. Roteamento, eventos e inicialização
   * ========================================================================= */

  const ROUTES = {
    inicio: viewHome,
    confronto: viewMatch,
    chave: viewBracket,
    musicas: viewSongs,
    estatisticas: viewStats,
    campea: viewChampion,
    dados: viewData
  };

  function parseHash() {
    const raw = (global.location.hash || '').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
    const name = ROUTES[parts[0]] ? parts[0] : 'inicio';
    return { name: name, params: ROUTES[parts[0]] ? parts.slice(1) : [] };
  }

  function navigate(hash, replace) {
    if (global.location.hash === hash) { route(); return; }
    if (replace) { global.history.replaceState(null, '', hash); route(); }
    else global.location.hash = hash;
  }

  function route() {
    clearTimers();
    App.busy = false;
    const dialog = $('#dialog');
    if (dialog && dialog.open) dialog.close('cancel');
    App.route = parseHash();
    if (!App.state && App.route.name !== 'dados') {
      App.route = { name: 'dados', params: [] };
      viewData();
      updateChrome();
      return;
    }
    ROUTES[App.route.name](App.route.params);
    updateChrome();
  }

  async function onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) {
      const dis = e.target.closest('a.is-disabled');
      if (dis) e.preventDefault();
      return;
    }
    const action = el.dataset.action;
    if (el.matches('input')) return; // tratados no evento change
    switch (action) {
      case 'pick':
        choose(+el.dataset.r, +el.dataset.i, el.dataset.song);
        break;
      case 'undo':
        undoLast();
        break;
      case 'fullscreen':
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => toast('O navegador não permitiu a tela cheia.'));
        break;
      case 'redraw':
        if (Core.countDone(App.state) === 0) {
          newTournament('random');
          toast('Novo sorteio feito e salvo.');
          route();
        }
        break;
      case 'reset': {
        const ok = await confirmDialog({
          title: 'Reiniciar o torneio?',
          text: 'Todas as escolhas deste torneio serão apagadas. As 128 músicas e os links que você adicionou continuam.',
          confirmLabel: 'Apagar e reiniciar',
          danger: true
        });
        if (ok) { newTournament(); toast('Torneio reiniciado.'); navigate('#/'); }
        break;
      }
      case 'new-tournament': {
        const ok = await confirmDialog({
          title: 'Começar um novo torneio?',
          text: 'O resultado atual, incluindo a campeã, será apagado.',
          confirmLabel: 'Começar de novo',
          danger: true
        });
        if (ok) { newTournament(); toast('Novo torneio pronto.'); navigate('#/'); }
        break;
      }
      case 'apply-import': {
        if (!App.importDraft || !App.importDraft.ok) break;
        const ok = !App.state || Core.countDone(App.state) === 0 || await confirmDialog({
          title: 'Usar a lista importada?',
          text: 'O torneio atual será apagado e um novo começará com as músicas do arquivo.',
          confirmLabel: 'Usar e recomeçar',
          danger: true
        });
        if (ok) {
          newTournament(App.state ? App.state.format : 'seeded', App.importDraft.data);
          App.importDraft = null;
          toast('Lista importada. Novo torneio pronto.');
          navigate('#/');
        }
        break;
      }
      case 'use-default': {
        if (!App.defaultData) break;
        const ok = !App.state || Core.countDone(App.state) === 0 || await confirmDialog({
          title: 'Voltar aos dados padrão?',
          text: 'O torneio atual será apagado e um novo começará com a lista padrão do Kworb.',
          confirmLabel: 'Restaurar e recomeçar',
          danger: true
        });
        if (ok) {
          newTournament(App.state ? App.state.format : 'seeded', App.defaultData.data);
          toast('Dados padrão restaurados.');
          navigate('#/');
        }
        break;
      }
      case 'export-json':
        download('spotify-top128-dados.json', JSON.stringify(currentDatasetForExport(), null, 2), 'application/json');
        break;
      case 'export-csv': {
        const d = currentDatasetForExport();
        const lines = ['rank,title,artist,features,streams,daily,spotify_id'].concat(d.songs.map((s) =>
          [s.rank, s.title, s.artist, (s.features || []).join('; '), s.streams, s.dailyStreams || '', s.spotifyId || ''].map(csvCell).join(',')));
        download('spotify-top128-dados.csv', '\uFEFF' + lines.join('\n') + '\n', 'text/csv;charset=utf-8');
        break;
      }
      case 'edit-link':
        editLink(el.dataset.song);
        break;
      case 'play':
        playSong(el.dataset.song);
        break;
      case 'player-close':
        closePlayer();
        break;
      case 'dismiss-banner':
        $('#banner').hidden = true;
        break;
      case 'skip':
        e.preventDefault();
        $('#main').focus();
        break;
      case 'scroll-path': {
        const target = $('#path-title');
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
          target.focus({ preventScroll: true });
        }
        break;
      }
      default:
        break;
    }
  }

  function onChange(e) {
    const t = e.target;
    if (t.matches('[data-action="format"]')) {
      if (Core.countDone(App.state) > 0) return; // formato travado depois do primeiro voto
      newTournament(t.value);
      toast(t.value === 'random' ? 'Sorteio feito e salvo.' : 'Chaveamento por cabeças de chave.');
      route();
    } else if (t.matches('[data-action="toggle-auto"]')) {
      App.settings.autoAdvance = t.checked;
      saveSettings();
    } else if (t.id === 'f-sort' || t.id === 'f-status') {
      App.songsView[t.id === 'f-sort' ? 'sort' : 'status'] = t.value;
      renderSongList();
    } else if (t.id === 'import-file') {
      handleImportFile(t.files && t.files[0]);
    }
  }

  function onInput(e) {
    const t = e.target;
    if (t.id === 'f-title' || t.id === 'f-artist') {
      App.songsView[t.id === 'f-title' ? 'title' : 'artist'] = t.value;
      renderSongList();
    }
  }

  function onKey(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || e.target.isContentEditable) return;
    if ($('#dialog') && $('#dialog').open) return;
    if (App.route.name !== 'confronto' || !App.route.match) return;
    if (e.altKey || e.metaKey) return;
    const k = e.key;
    if ((k === 'z' || k === 'Z') && !e.shiftKey) { e.preventDefault(); undoLast(); return; }
    if (e.ctrlKey) return;
    const m = App.route.match;
    if (k === '1' || k === '2') {
      const p = Core.participants(App.state, m.r, m.i);
      const id = p[k === '1' ? 0 : 1];
      if (id && p[0] && p[1] && Core.winner(App.state, m.r, m.i) !== id) { e.preventDefault(); choose(m.r, m.i, id); }
    } else if (k === 'ArrowLeft' || k === 'ArrowRight') {
      const g = findReady(Core.globalIndex(m.r, m.i), k === 'ArrowLeft' ? -1 : 1);
      if (g !== null) { e.preventDefault(); navigate('#/confronto/' + matchParam(g)); }
    }
  }

  async function loadDefaultData() {
    App.dataErrors = [];
    if (/^https?:$/.test(global.location.protocol)) {
      try {
        const res = await fetch('data/songs.json', { cache: 'no-cache' });
        if (res.ok) {
          const v = Core.validateDataset(await res.json());
          if (v.ok) return { data: v.data, origin: 'data/songs.json' };
          App.dataErrors = v.errors;
        }
      } catch (e) {
        /* sem servidor ou arquivo ausente: usa a cópia embutida em songs.js */
      }
    }
    const embedded = global.SPOTIFY_TOP128_DATA;
    if (embedded) {
      const v = Core.validateDataset(embedded);
      if (v.ok) { App.dataErrors = []; return { data: v.data, origin: 'data/songs.js' }; }
      App.dataErrors = v.errors;
    } else if (!App.dataErrors.length) {
      App.dataErrors = ['Os arquivos data/songs.json e data/songs.js não foram encontrados ao lado do index.html.'];
    }
    return null;
  }

  async function boot() {
    const settings = readJSON(KEYS.settings);
    if (settings && typeof settings === 'object') App.settings.autoAdvance = settings.autoAdvance !== false;
    const links = readJSON(KEYS.links);
    if (links && typeof links === 'object') {
      for (const k of Object.keys(links)) if (SPOTIFY_ID_RE.test(links[k])) App.overrides[k] = links[k];
    }
    const covers = readJSON(KEYS.covers);
    if (covers && typeof covers === 'object') {
      for (const k of Object.keys(covers)) if (SPOTIFY_ID_RE.test(k) && /^https:\/\//.test(covers[k])) App.covers[k] = covers[k];
    }
    App.storageOk = writeJSON('st128:probe', 1);
    removeKey('st128:probe');

    App.defaultData = await loadDefaultData();

    const saved = App.storageOk ? readJSON(KEYS.state) : null;
    if (saved === undefined) {
      try { global.localStorage.setItem(KEYS.backup, global.localStorage.getItem(KEYS.state) || ''); } catch (e) { /* sem espaço */ }
      showBanner('<strong>O progresso salvo estava corrompido e não pôde ser lido.</strong> Uma cópia foi guardada e um novo torneio foi iniciado.');
    } else if (saved) {
      const res = Core.restoreState(saved);
      if (res.state) {
        App.state = res.state;
        rebuildSongIndex();
        if (res.repaired) {
          save();
          showBanner('<strong>Parte do progresso salvo estava inconsistente</strong> e foi descartada (' + res.repaired + ' resultado(s)). O restante foi mantido.');
        }
      } else {
        writeJSON(KEYS.backup, saved);
        showBanner('<strong>O progresso salvo não pôde ser usado</strong> (' + esc(res.error) + '). Uma cópia foi guardada e um novo torneio foi iniciado.');
      }
    }
    if (!App.state && App.defaultData) newTournament('seeded', App.defaultData.data);
    if (!App.storageOk) {
      showBanner('<strong>O progresso não está sendo salvo.</strong> Este navegador bloqueou o armazenamento local (modo privado ou configuração). As escolhas valem até você fechar a aba.');
    }

    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    document.addEventListener('error', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('sleeve-img')) e.target.remove();
    }, true);
    document.addEventListener('fullscreenchange', () => {
      const b = $('[data-action="fullscreen"]');
      if (b) b.textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia';
      document.body.classList.toggle('is-stage', Boolean(document.fullscreenElement));
    });
    // Cada voto é salvo na hora. Se o torneio for alterado em outra aba, esta aba se atualiza
    // em vez de sobrescrever o progresso mais novo com uma cópia antiga.
    global.addEventListener('storage', (e) => {
      if (e.key === KEYS.links) {
        const links = readJSON(KEYS.links) || {};
        App.overrides = {};
        for (const k of Object.keys(links)) if (SPOTIFY_ID_RE.test(links[k])) App.overrides[k] = links[k];
        route();
        return;
      }
      if (e.key !== KEYS.state || !e.newValue) return;
      try {
        const res = Core.restoreState(JSON.parse(e.newValue));
        if (res.state) {
          App.state = res.state;
          rebuildSongIndex();
          route();
          toast('Progresso atualizado a partir de outra aba.');
        }
      } catch (err) { /* conteúdo inválido vindo de outra aba: ignora */ }
    });
    global.addEventListener('hashchange', route);
    route();
  }

  /* Exporta o núcleo para os testes no Node; no navegador, inicia o app. */
  if (typeof module === 'object' && module.exports) module.exports = Core;
  global.SpotifyTop128 = { Core: Core };
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
