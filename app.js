/* Mineral Cup 2026 — shared logic
 *
 * A 32-mineral single-elimination bracket is 31 matches. Every match is a
 * binary choice, so a complete bracket is exactly 31 bits. Those 31 bits pack
 * into 7 base32 characters, plus one checksum character = an 8-character code.
 * That is why this site needs no server: the bracket travels as a short string.
 */

/* ------------------------------------------------------------------ *
 * The field
 * ------------------------------------------------------------------ */

// Bracket order, top to bottom. Matches are (0 v 1), (2 v 3), (4 v 5), ...
const MINERALS = [
  'Azurite',
  'Smithsonite',
  'Graphite',
  'Cuprite',
  'Orpiment',
  'Monazite-(Ce)',
  'Halite',
  'Hafnon',
  'Putnisite',
  'Pyrrhotite',
  'Cylindrite',
  'Arsenopyrite',
  'Andalusite',
  'Chrysocolla',
  'Xocolatlite',
  'Pyromorphite',
  'Riebeckite',
  'Quartz',
  'Anorthite',
  'Sphalerite',
  'Skutterudite',
  'Erythrite',
  'Vesuvianite',
  'Bournonite',
  'Gadolinite-(Y)',
  'Asagiite',
  'Stichtite',
  'Gypsum',
  'Cassiterite',
  'Julienite',
  'Calcite',
  'Talc',
];

/* ------------------------------------------------------------------ *
 * Bracket geometry
 * ------------------------------------------------------------------ */

const TOTAL_MATCHES = 31;
const ROUND_SIZES = [16, 8, 4, 2, 1];
const ROUND_STARTS = [0, 16, 24, 28, 30];
const ROUND_NAMES = [
  'Round of 32',
  'Round of 16',
  'Quarter-finals',
  'Semi-finals',
  'Final',
];

// Points per correct pick, by round. Each round is worth 16 points in total,
// so no single round decides the contest on its own. Perfect bracket = 80.
const ROUND_POINTS = [1, 2, 4, 8, 16];
const PERFECT_SCORE = ROUND_SIZES.reduce(
  (sum, n, r) => sum + n * ROUND_POINTS[r],
  0
);

function roundOf(match) {
  for (let r = ROUND_STARTS.length - 1; r >= 0; r--) {
    if (match >= ROUND_STARTS[r]) return r;
  }
  return 0;
}

function offsetOf(match) {
  return match - ROUND_STARTS[roundOf(match)];
}

function matchAt(round, offset) {
  return ROUND_STARTS[round] + offset;
}

// The two matches whose winners meet in this match. Null for the first round.
function feedersOf(match) {
  const r = roundOf(match);
  if (r === 0) return null;
  const k = offsetOf(match);
  return [matchAt(r - 1, 2 * k), matchAt(r - 1, 2 * k + 1)];
}

// The match this one feeds into. Null for the final.
function parentOf(match) {
  const r = roundOf(match);
  if (r === ROUND_SIZES.length - 1) return null;
  return matchAt(r + 1, Math.floor(offsetOf(match) / 2));
}

// Every match from this one up to and including the final.
function pathToFinal(match) {
  const path = [];
  let m = parentOf(match);
  while (m !== null) {
    path.push(m);
    m = parentOf(m);
  }
  return path;
}

/* ------------------------------------------------------------------ *
 * Turning picks into names
 *
 * `picks` is an array of 31 entries, each 0 (upper mineral wins),
 * 1 (lower mineral wins), or null (not yet decided).
 * ------------------------------------------------------------------ */

// Returns { winners, upper, lower } — each an array of 31 names or nulls.
function expandBracket(picks) {
  const winners = new Array(TOTAL_MATCHES).fill(null);
  const upper = new Array(TOTAL_MATCHES).fill(null);
  const lower = new Array(TOTAL_MATCHES).fill(null);

  for (let m = 0; m < TOTAL_MATCHES; m++) {
    const r = roundOf(m);
    if (r === 0) {
      const k = offsetOf(m);
      upper[m] = MINERALS[2 * k];
      lower[m] = MINERALS[2 * k + 1];
    } else {
      const [f1, f2] = feedersOf(m);
      upper[m] = winners[f1];
      lower[m] = winners[f2];
    }
    const pick = picks[m];
    if (pick === 0 && upper[m]) winners[m] = upper[m];
    else if (pick === 1 && lower[m]) winners[m] = lower[m];
  }
  return { winners, upper, lower };
}

function isComplete(picks) {
  return picks.length === TOTAL_MATCHES && picks.every((p) => p === 0 || p === 1);
}

// Clears any pick further up the tree that depended on this match.
function clearDownstream(picks, match) {
  for (const m of pathToFinal(match)) picks[m] = null;
  return picks;
}

// Every mineral knocked out so far, given official results.
function eliminatedFrom(results) {
  const { winners, upper, lower } = expandBracket(results);
  const out = new Set();
  for (let m = 0; m < TOTAL_MATCHES; m++) {
    if (!winners[m]) continue;
    const loser = winners[m] === upper[m] ? lower[m] : upper[m];
    if (loser) out.add(loser);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Bracket codes
 *
 * 31 bits + 4 zero pad bits = 35 bits = 7 base32 characters.
 * An eighth character carries a position-weighted checksum, so a typo or a
 * transposition is rejected rather than silently scored as a different bracket.
 * The alphabet is Crockford base32: no I, L, O or U.
 * ------------------------------------------------------------------ */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_CHARS = 8;

function checksumOf(values) {
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += (i + 1) * values[i];
  return sum % 32;
}

function encodeBracket(picks) {
  if (!isComplete(picks)) {
    throw new Error('Bracket is not complete');
  }
  const bits = picks.concat([0, 0, 0, 0]); // 35 bits
  const values = [];
  for (let i = 0; i < 7; i++) {
    let v = 0;
    for (let j = 0; j < 5; j++) v = v * 2 + bits[i * 5 + j];
    values.push(v);
  }
  values.push(checksumOf(values));
  const text = values.map((v) => ALPHABET[v]).join('');
  return text.slice(0, 4) + '-' + text.slice(4);
}

// Accepts sloppy input: lower case, missing dash, stray spaces, and the
// Crockford lookalikes (O for zero, I or L for one).
function normaliseCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

// Returns { ok: true, picks } or { ok: false, reason }.
function decodeBracket(raw) {
  const text = normaliseCode(raw);
  if (text.length === 0) return { ok: false, reason: 'No code entered' };
  if (text.length !== CODE_CHARS) {
    return {
      ok: false,
      reason: `Codes are ${CODE_CHARS} characters, this one has ${text.length}`,
    };
  }
  const values = [];
  for (const ch of text) {
    const v = ALPHABET.indexOf(ch);
    if (v === -1) return { ok: false, reason: `"${ch}" is not a valid character` };
    values.push(v);
  }
  const payload = values.slice(0, 7);
  if (checksumOf(payload) !== values[7]) {
    return { ok: false, reason: 'Checksum failed, so the code is mistyped' };
  }
  const bits = [];
  for (const v of payload) {
    for (let j = 4; j >= 0; j--) bits.push((v >> j) & 1);
  }
  if (bits.slice(31).some((b) => b !== 0)) {
    return { ok: false, reason: 'Code carries impossible padding' };
  }
  return { ok: true, picks: bits.slice(0, TOTAL_MATCHES) };
}

function formatCode(raw) {
  const text = normaliseCode(raw);
  return text.length === CODE_CHARS ? text.slice(0, 4) + '-' + text.slice(4) : text;
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

// A pick scores when the mineral you chose is the mineral that actually won
// that match. If your mineral never reached the match, the pick scores zero.
function scoreEntry(picks, results) {
  const mine = expandBracket(picks).winners;
  const real = expandBracket(results).winners;
  const dead = eliminatedFrom(results);

  let score = 0;
  let correct = 0;
  let decided = 0;
  let potential = 0;

  for (let m = 0; m < TOTAL_MATCHES; m++) {
    const points = ROUND_POINTS[roundOf(m)];
    if (real[m]) {
      decided++;
      if (mine[m] && mine[m] === real[m]) {
        score += points;
        correct++;
      }
    } else if (mine[m] && !dead.has(mine[m])) {
      potential += points;
    }
  }

  return {
    score,
    correct,
    decided,
    maxPossible: score + potential,
    champion: mine[TOTAL_MATCHES - 1],
    championAlive: mine[TOTAL_MATCHES - 1]
      ? !dead.has(mine[TOTAL_MATCHES - 1])
      : false,
  };
}

// Sorted leaderboard. Ties break on max possible, then correct picks, then name.
function buildStandings(entries, results) {
  const rows = entries.map((entry) => {
    const decoded = decodeBracket(entry.code);
    const picks = decoded.ok ? decoded.picks : new Array(TOTAL_MATCHES).fill(null);
    return { ...entry, ...scoreEntry(picks, results), valid: decoded.ok };
  });

  rows.sort(
    (a, b) =>
      b.score - a.score ||
      b.maxPossible - a.maxPossible ||
      b.correct - a.correct ||
      a.name.localeCompare(b.name)
  );

  let rank = 0;
  let lastScore = null;
  rows.forEach((row, i) => {
    if (row.score !== lastScore) {
      rank = i + 1;
      lastScore = row.score;
    }
    row.rank = rank;
  });
  return rows;
}

/* ------------------------------------------------------------------ *
 * Schedule
 *
 * Matches run in bracket order from the start date. `perDay` says how many
 * matches are voted on each day in each round.
 * ------------------------------------------------------------------ */

const DEFAULT_SCHEDULE = { startDate: '2026-09-01', perDay: [2, 2, 1, 1, 1] };

function buildSchedule(schedule) {
  const config = schedule || DEFAULT_SCHEDULE;
  const perDay = config.perDay || DEFAULT_SCHEDULE.perDay;
  const dates = new Array(TOTAL_MATCHES).fill(null);
  const start = new Date(config.startDate + 'T12:00:00Z');
  if (Number.isNaN(start.getTime())) return dates;

  let day = 0;
  for (let r = 0; r < ROUND_SIZES.length; r++) {
    const rate = Math.max(1, perDay[r] || 1);
    for (let k = 0; k < ROUND_SIZES[r]; k++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + day + Math.floor(k / rate));
      dates[matchAt(r, k)] = d.toISOString().slice(0, 10);
    }
    day += Math.ceil(ROUND_SIZES[r] / rate);
  }
  return dates;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// The matches scheduled for a given day that have no result yet.
function openMatches(results, dates, isoDate) {
  const open = [];
  for (let m = 0; m < TOTAL_MATCHES; m++) {
    if (results[m] === null && dates[m] === isoDate) open.push(m);
  }
  return open;
}

function prettyDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/* ------------------------------------------------------------------ *
 * Data file
 * ------------------------------------------------------------------ */

function emptyResults() {
  return new Array(TOTAL_MATCHES).fill(null);
}

function normaliseData(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const results = Array.isArray(data.results) ? data.results.slice(0, TOTAL_MATCHES) : [];
  while (results.length < TOTAL_MATCHES) results.push(null);
  return {
    season: data.season || 'Mineral Cup 2026',
    formUrl: typeof data.formUrl === 'string' ? data.formUrl : '',
    schedule: data.schedule || DEFAULT_SCHEDULE,
    results: results.map((v) => (v === 0 || v === 1 ? v : null)),
    entries: Array.isArray(data.entries)
      ? data.entries
          .filter((e) => e && e.name && e.code)
          .map((e) => ({ name: String(e.name), code: formatCode(e.code) }))
      : [],
    updated: data.updated || null,
  };
}

async function loadData(url = 'data.json') {
  const response = await fetch(url + '?v=' + Date.now());
  if (!response.ok) throw new Error('Could not load ' + url);
  return normaliseData(await response.json());
}

/* ------------------------------------------------------------------ *
 * Exports for Node (tests). Browsers ignore this block.
 * ------------------------------------------------------------------ */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MINERALS,
    TOTAL_MATCHES,
    ROUND_SIZES,
    ROUND_STARTS,
    ROUND_NAMES,
    ROUND_POINTS,
    PERFECT_SCORE,
    roundOf,
    offsetOf,
    matchAt,
    feedersOf,
    parentOf,
    pathToFinal,
    expandBracket,
    isComplete,
    clearDownstream,
    eliminatedFrom,
    encodeBracket,
    decodeBracket,
    normaliseCode,
    formatCode,
    scoreEntry,
    buildStandings,
    buildSchedule,
    openMatches,
    emptyResults,
    normaliseData,
  };
}
