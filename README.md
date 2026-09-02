# Mineral Cup 2026 — bracket contest

A static site for running a bracket contest alongside the daily voting at
[mineralcup.org](https://www.mineralcup.org). Players pick all 31 matches, get
an eight-character code, and send that code in through a form. You post the
daily winners and commit one file. No server, no database, no hosting bill.

## Why there is no backend

A 32-mineral single-elimination bracket is 31 matches, and every match is a
binary choice. A complete bracket is therefore exactly 31 bits, which packs
into 7 base32 characters. An eighth character carries a position-weighted
checksum, giving codes like `1MZ2-1VCY`.

That one fact removes the need for a server. The bracket travels as a short
string that a person can type, so collection can be any form you like, and
scoring is a pure function of the code and the results.

The alphabet is Crockford base32, so there is no `I`, `L`, `O` or `U` to
confuse anyone, and the decoder silently forgives the common substitutions.
A mistyped code fails the checksum and is rejected at import rather than
quietly scored as somebody else's bracket.

## Files

| File | What it is |
|---|---|
| `index.html` | Public page: pick a bracket, get a code, view standings and results |
| `admin.html` | Organiser console. Runs entirely in your browser |
| `app.js` | Shared logic: the field, bracket tree, codes, scoring, schedule |
| `styles.css` | Stylesheet for both pages |
| `data.json` | Results, entries, and settings. The only file you edit during the month |
| `test.js` | Stress test for the codec and scoring. Run with `node test.js` |

## Setup

**1. Put the files in a repository and turn on Pages.**
Upload all seven files to the repository root. Then Settings → Pages → Deploy
from a branch → `main` / `root`. Your site appears at
`https://<username>.github.io/<repo>/` within a minute or two.

**2. Build the form.**
Three questions is enough: Name, Email, Bracket code. Set the code question to
short text. Then Collect responses → **Anyone can respond**, which is the
setting that lets people submit without signing in to your organisation.

**3. Paste the form link into the console.**
Open `admin.html` on your published site, go to Settings, paste the form link,
and click Download data.json. Commit that file. The "Enter the contest" button
on the public page now points at your form.

You can also edit `data.json` by hand if you prefer. The console is only a
convenience.

## Running the month

Each day, once voting closes:

1. Open `admin.html` on your site.
2. Tap the winner of each match that has resolved. Tap again to undo.
3. Click **Download data.json** and commit it to the repository.

The public standings update as soon as that commit deploys. Tapping a winner
also clears any later match that depended on it, so correcting a mistake never
leaves the bracket in an impossible state.

To load entries, copy the name and code columns out of your form's response
workbook and paste them into Entries → Import. Every code is validated, and any
line that fails is listed with the reason rather than being scored as garbage.
Importing again updates existing names instead of duplicating them.

The Weekly recap tab writes the newsletter text for you from the current
results and standings.

## Scoring

| Round | Matches | Points each | Round total |
|---|---|---|---|
| Round of 32 | 16 | 1 | 16 |
| Round of 16 | 8 | 2 | 16 |
| Quarter-finals | 4 | 4 | 16 |
| Semi-finals | 2 | 8 | 16 |
| Final | 1 | 16 | 16 |

A perfect bracket scores **80**. Every round is worth the same in total, so an
early run of luck does not decide the contest and a late collapse is
recoverable. A pick scores only when the mineral you chose actually won that
match, so backing a mineral that never got there earns nothing.

The standings also show **Max**, the highest score each player can still
reach given who is left. Once that number drops below the leader's score, that
player is mathematically out, which is usually more interesting than the score
itself by week three.

To change the weighting, edit `ROUND_POINTS` near the top of `app.js`.

## One rule that matters

**Never paste the email column into the import box.** `data.json` lives in a
public repository, so anything in it is public. Addresses belong in your form's
response workbook, which is private. The importer refuses any line containing
an `@` as a backstop, but do not rely on that.

## Changing the field

Edit the `MINERALS` array in `app.js`. It must hold exactly 32 names, in
bracket order top to bottom, so the first round is `MINERALS[0]` against
`MINERALS[1]`, then `[2]` against `[3]`, and so on.

Changing the field invalidates every code already submitted, because the same
31 bits then describe a different bracket. Fix the list before you open
entries.

## Adjusting the schedule

In the console, set the first match date and how many matches run per day in
each round, written as five numbers like `1,1,1,1,1`. The default runs one
match a day for the whole contest, alternating between the left and right
side of the bracket — top-left, top-right, next-left, next-right — the same
way a printed bracket fills in, rather than finishing one whole side before
starting the other. With one match a day that's 31 days from the first match
to the final. Raise the numbers for the early rounds (say `2,2,1,1,1`) if you
want the later rounds to land inside a single calendar month.

The schedule only drives the dates shown on the site; it does not gate
anything.

## Testing

```
node test.js
```

Checks the bracket geometry, round-trips 20,000 random brackets through
encode and decode, confirms that every single-character corruption and every
adjacent transposition is caught by the checksum, and verifies the scoring
against known brackets. All of it runs offline.
