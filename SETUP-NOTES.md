# Setup notes — local only

Not committed. This file is listed in `.gitignore` because it is about my own
account and my employer's configuration, not about how the software works.

## Before opening entries

**Use a personal GitHub account, not one signed in through a UWEC-managed
organisation.** Enterprise-managed accounts can have Pages restricted to
organisation members, which would lock out exactly the people I am inviting.
Confirm this before building the form.

Current setup: pushing from `alemutba`, a personal account, to
`github.com/alemutba/mineral-cup-2026`. Site publishes to
`https://alemutba.github.io/mineral-cup-2026/`.

## The one dependency worth checking first

Whether the UWEC tenant allows **"Anyone can respond"** on a Microsoft Form.
If that option is missing from the form's sharing settings, external form
sharing has been switched off by an administrator and would need enabling.

Check this before building anything else — it is the only part of the design
that depends on somebody else's permission. If it turns out to be blocked,
Google Forms works identically for collection and nothing else changes.

Status: not yet confirmed.

## Daily routine during September

1. Open `https://alemutba.github.io/mineral-cup-2026/admin.html`
2. Tap the winner of each match that resolved
3. Download `data.json`, replace the copy in `C:\Users\alemutb\mineral-cup`
4. Commit and push:
   ```
   git add data.json
   git commit -m "Results through <date>"
   git push
   ```

## Local environment reminders

- Preview locally with `python -m http.server 8000`, then `http://localhost:8000`
- Git lives at `C:\Users\alemutb\AppData\Local\Programs\Git\cmd` and was added
  to the user PATH manually on 1 Sep 2026
- Stop the preview server with Ctrl+C before running git commands in the same
  terminal
