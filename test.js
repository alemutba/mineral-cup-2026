const A = require('./app.js');

let failures = 0;
function check(name, condition, detail) {
  if (!condition) {
    failures++;
    console.log('FAIL  ' + name + (detail ? '  — ' + detail : ''));
  }
}

/* --- field ------------------------------------------------------- */
check('32 minerals', A.MINERALS.length === 32, A.MINERALS.length);
check('no duplicate minerals', new Set(A.MINERALS).size === 32);
check('31 matches', A.TOTAL_MATCHES === 31);

/* --- geometry ---------------------------------------------------- */
check('final has no parent', A.parentOf(30) === null);
check('final feeders', String(A.feedersOf(30)) === '28,29');
check('match 0 has no feeders', A.feedersOf(0) === null);
check('match 16 feeders', String(A.feedersOf(16)) === '0,1');
for (let m = 0; m < 30; m++) {
  const p = A.parentOf(m);
  check('parent/feeder agree at ' + m, A.feedersOf(p).includes(m));
}
check('path from match 0 is 4 long', A.pathToFinal(0).length === 4);

/* --- round trip, 20000 random brackets ---------------------------- */
let mismatches = 0;
const seen = new Set();
for (let i = 0; i < 20000; i++) {
  const picks = Array.from({ length: 31 }, () => (Math.random() < 0.5 ? 0 : 1));
  const code = A.encodeBracket(picks);
  seen.add(code);
  const back = A.decodeBracket(code);
  if (!back.ok || String(back.picks) !== String(picks)) mismatches++;
}
check('20,000 brackets round trip', mismatches === 0, mismatches + ' mismatches');

/* --- code shape --------------------------------------------------- */
const sample = A.encodeBracket(new Array(31).fill(0));
check('code is 9 chars with dash', sample.length === 9 && sample[4] === '-', sample);
check('all zero bracket', A.decodeBracket(sample).picks.every((b) => b === 0));
const ones = A.encodeBracket(new Array(31).fill(1));
check('all one bracket', A.decodeBracket(ones).picks.every((b) => b === 1));

/* --- sloppy input is forgiven ------------------------------------- */
const clean = A.encodeBracket(Array.from({ length: 31 }, (_, i) => i % 2));
const messy = ' ' + clean.toLowerCase().replace('-', ' ') + ' ';
check('sloppy input accepted', A.decodeBracket(messy).ok, messy);
check(
  'sloppy input decodes the same',
  String(A.decodeBracket(messy).picks) === String(A.decodeBracket(clean).picks)
);

/* --- corruption is caught ----------------------------------------- */
let caught = 0;
let tested = 0;
for (let i = 0; i < 5000; i++) {
  const picks = Array.from({ length: 31 }, () => (Math.random() < 0.5 ? 0 : 1));
  const code = A.normaliseCode(A.encodeBracket(picks));
  const pos = Math.floor(Math.random() * 8);
  let ch = A.MINERALS ? null : null;
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  do {
    ch = alphabet[Math.floor(Math.random() * 32)];
  } while (ch === code[pos]);
  const broken = code.slice(0, pos) + ch + code.slice(pos + 1);
  tested++;
  const result = A.decodeBracket(broken);
  if (!result.ok || String(result.picks) !== String(picks)) caught++;
}
check('single character corruption caught', caught === tested, caught + '/' + tested);

/* transpositions */
let transCaught = 0;
let transTested = 0;
for (let i = 0; i < 5000; i++) {
  const picks = Array.from({ length: 31 }, () => (Math.random() < 0.5 ? 0 : 1));
  const code = A.normaliseCode(A.encodeBracket(picks));
  const pos = Math.floor(Math.random() * 7);
  if (code[pos] === code[pos + 1]) continue;
  const swapped =
    code.slice(0, pos) + code[pos + 1] + code[pos] + code.slice(pos + 2);
  transTested++;
  const result = A.decodeBracket(swapped);
  if (!result.ok || String(result.picks) !== String(picks)) transCaught++;
}
check(
  'adjacent transposition caught',
  transCaught === transTested,
  transCaught + '/' + transTested
);

/* --- junk is rejected --------------------------------------------- */
for (const junk of ['', 'ABC', 'not a code', '1MZ2-1VCYZZ', '!!!!-!!!!']) {
  check('junk rejected: "' + junk + '"', A.decodeBracket(junk).ok === false);
}

/* --- expansion ---------------------------------------------------- */
const allTop = A.expandBracket(new Array(31).fill(0));
check('all-top champion is first mineral', allTop.winners[30] === A.MINERALS[0]);
const allBottom = A.expandBracket(new Array(31).fill(1));
check('all-bottom champion is last mineral', allBottom.winners[30] === A.MINERALS[31]);
check('first match participants', allTop.upper[0] === A.MINERALS[0] && allTop.lower[0] === A.MINERALS[1]);

/* partial bracket leaves later matches empty */
const partial = A.emptyResults();
partial[0] = 0;
const pe = A.expandBracket(partial);
check('partial: match 0 resolved', pe.winners[0] === A.MINERALS[0]);
check('partial: match 16 unresolved', pe.winners[16] === null);
check('partial: match 16 has one known side', pe.upper[16] === A.MINERALS[0] && pe.lower[16] === null);

/* --- scoring ------------------------------------------------------ */
check('perfect score is 80', A.PERFECT_SCORE === 80);
const truth = Array.from({ length: 31 }, () => (Math.random() < 0.5 ? 0 : 1));
const perfect = A.scoreEntry(truth, truth);
check('perfect bracket scores 80', perfect.score === 80, perfect.score);
check('perfect bracket has 31 correct', perfect.correct === 31);
check('perfect max equals score', perfect.maxPossible === 80);

/* an empty results set gives everyone zero but full potential */
const zero = A.scoreEntry(truth, A.emptyResults());
check('no results yet: score 0', zero.score === 0);
check('no results yet: max 80', zero.maxPossible === 80, zero.maxPossible);
check('no results yet: 0 decided', zero.decided === 0);

/* a wrong first-round pick costs the mineral its whole run */
const opposite = truth.map((b) => 1 - b);
const wrong = A.scoreEntry(opposite, truth);
check('opposite bracket scores 0', wrong.score === 0, wrong.score);
check('opposite bracket max is 0 once all decided', wrong.maxPossible === 0);

/* eliminating a champion caps the max below 80 */
const half = truth.slice(0, 16).concat(new Array(15).fill(null));
const stillAlive = A.scoreEntry(truth, half);
check('after round 1, correct bracket has 16', stillAlive.score === 16, stillAlive.score);
check('after round 1, max still 80', stillAlive.maxPossible === 80, stillAlive.maxPossible);
const oppositeHalf = A.scoreEntry(opposite, half);
check('after round 1, opposite max drops', oppositeHalf.maxPossible < 80, oppositeHalf.maxPossible);

/* eliminated set */
const elim = A.eliminatedFrom(half);
check('16 minerals eliminated after round 1', elim.size === 16, elim.size);

/* --- standings ---------------------------------------------------- */
const entries = [
  { name: 'Perfect Pat', code: A.encodeBracket(truth) },
  { name: 'Wrong Wren', code: A.encodeBracket(opposite) },
  { name: 'Broken Bo', code: 'ZZZZ-ZZZZ' },
];
const table = A.buildStandings(entries, truth);
check('leader is Perfect Pat', table[0].name === 'Perfect Pat', table[0].name);
check('leader scores 80', table[0].score === 80);
check('broken code flagged invalid', table.find((r) => r.name === 'Broken Bo').valid === false);
check('ranks assigned', table.every((r) => typeof r.rank === 'number'));

/* --- clearing downstream ------------------------------------------ */
const picks = Array.from({ length: 31 }, () => 0);
A.clearDownstream(picks, 0);
check('clearing match 0 clears 4 ancestors', picks.filter((p) => p === null).length === 4);
check('clearing match 0 keeps match 0', picks[0] === 0);
check('clearing match 0 clears the final', picks[30] === null);

/* --- schedule ------------------------------------------------------ */
const dates = A.buildSchedule({ startDate: '2026-09-01', perDay: [2, 2, 1, 1, 1] });
check('31 dates', dates.length === 31 && dates.every(Boolean));
check('first match on start date', dates[0] === '2026-09-01');
check('dates never go backwards within a round for one conference', (function () {
  // Match order within a single conference is preserved (only interleaving
  // *between* left and right changed), so each side's own matches still run
  // in ascending calendar order.
  for (let r = 0; r < 4; r++) {
    const half = A.ROUND_SIZES[r] / 2;
    for (const side of [0, half]) {
      for (let i = side; i < side + half - 1; i++) {
        const a = dates[A.matchAt(r, i)];
        const b = dates[A.matchAt(r, i + 1)];
        if (a > b) return false;
      }
    }
  }
  return true;
})());
const last = dates[30];
check('final lands inside September', last <= '2026-09-30', last);
const open = A.openMatches(A.emptyResults(), dates, '2026-09-01');
check('two matches open on day one', open.length === 2, open.length);

/* the schedule alternates left/right, one match a day by default */
const oneAday = A.buildSchedule({ startDate: '2026-09-01', perDay: [1, 1, 1, 1, 1] });
const order = [];
for (let m = 0; m < 31; m++) order.push(m);
order.sort((a, b) => oneAday[a].localeCompare(oneAday[b]) || a - b);
const expectedOrder = [
  0, 8, 1, 9, 2, 10, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15,
  16, 20, 17, 21, 18, 22, 19, 23,
  24, 26, 25, 27,
  28, 29,
  30,
];
check(
  'one-a-day schedule alternates left and right conferences',
  String(order) === String(expectedOrder),
  order.join(',')
);
check('day 1 is match 1 (left top)', order[0] === 0);
check('day 2 is match 9 (right top)', order[1] === 8);
check('day 3 returns to the left side', order[2] === 1);
check('default schedule is one match a day', String(A.buildSchedule(null)) === String(A.buildSchedule({ startDate: '2026-09-01', perDay: [1, 1, 1, 1, 1] })));

/* --- data normalising ---------------------------------------------- */
const bad = A.normaliseData({ results: [0, 1, 5, null], entries: [{ name: 'x' }, null] });
check('results padded to 31', bad.results.length === 31);
check('invalid result value nulled', bad.results[2] === null);
check('entry without code dropped', bad.entries.length === 0);

/* --- report -------------------------------------------------------- */
console.log('');
console.log('Distinct codes from 20,000 random brackets: ' + seen.size);
console.log('Perfect bracket scores ' + A.PERFECT_SCORE + ' points');
console.log('Example code: ' + A.encodeBracket(truth));
console.log('');
console.log(failures === 0 ? 'All checks passed.' : failures + ' CHECK(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
