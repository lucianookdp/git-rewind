import type { GithubRepo, GithubUser, ProfileData } from './types'

const API_ROOT = 'https://api.github.com'
const CACHE_PREFIX = 'git-rewind:v2:'
const CACHE_TTL_MS = 60 * 60 * 1000
const REPO_PAGE_LIMIT = 2

export class NotFoundError extends Error {
  constructor(public login: string) {
    super(`GitHub user "${login}" does not exist.`)
  }
}

export class RateLimitError extends Error {
  constructor(public resetAt: Date) {
    super('GitHub API rate limit reached.')
  }
}

function cacheKey(login: string): string {
  return `${CACHE_PREFIX}${login.toLowerCase()}`
}

function readCache(login: string): ProfileData | null {
  const raw = localStorage.getItem(cacheKey(login))
  if (!raw) return null
  const parsed = JSON.parse(raw) as ProfileData
  if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
  return parsed
}

function writeCache(login: string, data: ProfileData): void {
  localStorage.setItem(cacheKey(login), JSON.stringify(data))
}

async function githubFetch(path: string): Promise<Response> {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (response.status === 403) {
    const resetHeader = response.headers.get('x-ratelimit-reset')
    const resetAt = resetHeader ? new Date(Number(resetHeader) * 1000) : new Date(Date.now() + 60 * 60 * 1000)
    throw new RateLimitError(resetAt)
  }
  return response
}

async function fetchUser(login: string): Promise<GithubUser> {
  const response = await githubFetch(`/users/${encodeURIComponent(login)}`)
  if (response.status === 404) throw new NotFoundError(login)
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`)
  return response.json()
}

// Sorted oldest-first so a 200-repo cap always preserves the start of the
// account's history — the whole point of a "since the beginning" rewind —
// even if it means the most recent repos are the ones left out for
// accounts with more than 200 public repositories.
async function fetchRepos(login: string): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = []
  for (let page = 1; page <= REPO_PAGE_LIMIT; page++) {
    const response = await githubFetch(
      `/users/${encodeURIComponent(login)}/repos?per_page=100&sort=created&direction=asc&type=owner&page=${page}`,
    )
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`)
    const batch: GithubRepo[] = await response.json()
    repos.push(...batch)
    if (batch.length < 100) break
  }
  return repos
}

export async function fetchProfileData(login: string): Promise<ProfileData> {
  const cached = readCache(login)
  if (cached) return cached

  const user = await fetchUser(login)
  const repos = await fetchRepos(login)

  const data: ProfileData = { user, repos, fetchedAt: Date.now() }
  writeCache(login, data)
  return data
}

export function formatResetWait(resetAt: Date): string {
  const minutesLeft = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 60000))
  if (minutesLeft < 60) return `${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}`
  const hours = Math.floor(minutesLeft / 60)
  const minutes = minutesLeft % 60
  return `${hours}h ${minutes}m`
}
