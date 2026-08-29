# git-rewind

A single page that turns a GitHub username into a short, animated rewind of that account's *entire* public history — first repository to now — presented as slides that advance on their own, like a story. At the end you get an image to download or a link to send.

Built it because the usual "developer wrapped" idea is both a login/backend it doesn't need, and a snapshot of a fixed recent window when the actually interesting story is the whole account. GitHub's public REST API is enough on its own: no token, no server, no database, and everything shown spans the account's real history, not the last N days.

## Running it locally

```
npm install
npm run dev
```

Open a username directly with `?u=<login>`, e.g. `http://localhost:5173/?u=octocat`. `npm run build` outputs the static site to `dist/`.

## Honest limits

- Repo count, stars, and forks are real, lifetime totals from the account's public repositories — not a windowed sample.
- Unauthenticated GitHub API access is capped at 60 requests/hour per IP. Each rewind costs up to 3, cached for an hour so reopening a profile is free. Hitting the cap shows when it resets, not a generic error.
- Repositories are fetched oldest-first, capped at 200. For an account with more repositories than that, the story still starts accurately at the true first repo — it's the most recent ones that would be missing, and the app says so when it applies.
- A repo's language is whichever one GitHub reports as dominant — no per-file breakdown, since that costs a request per repo.
- The closing "profile" is rule-based, not a model — each one is tied to a specific threshold in the data.
