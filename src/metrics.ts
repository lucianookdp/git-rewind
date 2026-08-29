import { getLanguageColor } from './languages'
import type { GithubRepo, GithubUser, LanguageCount, Metrics, YearCount } from './types'

function computeLanguages(repos: GithubRepo[]): LanguageCount[] {
  const counts = new Map<string, number>()
  for (const repo of repos) {
    if (!repo.language) continue
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, color: getLanguageColor(name) }))
    .sort((a, b) => b.count - a.count)
}

function computeReposByYear(repos: GithubRepo[], startYear: number, endYear: number): YearCount[] {
  const counts = new Map<number, number>()
  for (let year = startYear; year <= endYear; year++) counts.set(year, 0)
  for (const repo of repos) {
    const year = new Date(repo.created_at).getUTCFullYear()
    if (counts.has(year)) counts.set(year, (counts.get(year) ?? 0) + 1)
  }
  return [...counts.entries()].map(([year, count]) => ({ year, count }))
}

export function computeMetrics(user: GithubUser, repos: GithubRepo[]): Metrics {
  const ownedRepos = repos.filter((repo) => !repo.fork)

  const memberSince = new Date(user.created_at)
  const now = new Date()
  const accountAgeYears = Math.max(0, now.getUTCFullYear() - memberSince.getUTCFullYear())

  const totalStars = ownedRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0)
  const totalForks = ownedRepos.reduce((sum, repo) => sum + repo.forks_count, 0)

  const topStarred = ownedRepos.reduce<GithubRepo | null>((best, repo) => {
    if (repo.stargazers_count <= 0) return best
    if (!best || repo.stargazers_count > best.stargazers_count) return repo
    return best
  }, null)

  const languages = computeLanguages(ownedRepos)

  const firstRepo = ownedRepos.reduce<GithubRepo | null>((oldest, repo) => {
    if (!oldest || new Date(repo.created_at) < new Date(oldest.created_at)) return repo
    return oldest
  }, null)

  const reposByYear = computeReposByYear(ownedRepos, memberSince.getUTCFullYear(), now.getUTCFullYear())
  const mostProductiveYear = reposByYear.reduce<YearCount | null>((best, entry) => {
    if (entry.count <= 0) return best
    if (!best || entry.count > best.count) return entry
    return best
  }, null)
  const activeYears = reposByYear.filter((entry) => entry.count > 0).length
  const activeYearRatio = reposByYear.length > 0 ? activeYears / reposByYear.length : 0

  return {
    memberSince,
    accountAgeYears,
    publicRepoCount: user.public_repos,
    totalStars,
    totalForks,
    topStarredRepo: topStarred ? { name: topStarred.name, stars: topStarred.stargazers_count } : null,
    languages,
    primaryLanguage: languages[0] ?? null,
    firstRepo: firstRepo
      ? { name: firstRepo.name, createdAt: new Date(firstRepo.created_at), stars: firstRepo.stargazers_count }
      : null,
    reposByYear,
    mostProductiveYear,
    activeYearRatio,
    repoSampleIsComplete: repos.length >= user.public_repos,
  }
}
