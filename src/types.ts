export interface GithubUser {
  login: string
  name: string | null
  bio: string | null
  avatar_url: string
  created_at: string
  followers: number
  public_repos: number
}

export interface GithubRepo {
  name: string
  full_name: string
  stargazers_count: number
  forks_count: number
  language: string | null
  fork: boolean
  created_at: string
  pushed_at: string
}

export interface ProfileData {
  user: GithubUser
  repos: GithubRepo[]
  fetchedAt: number
}

export interface LanguageCount {
  name: string
  count: number
  color: string
}

export interface YearCount {
  year: number
  count: number
}

export interface Metrics {
  memberSince: Date
  accountAgeYears: number
  publicRepoCount: number
  totalStars: number
  totalForks: number
  topStarredRepo: { name: string; stars: number } | null
  languages: LanguageCount[]
  primaryLanguage: LanguageCount | null
  firstRepo: { name: string; createdAt: Date; stars: number } | null
  reposByYear: YearCount[]
  mostProductiveYear: YearCount | null
  activeYearRatio: number
  repoSampleIsComplete: boolean
}

export interface Profile {
  name: string
  description: string
}
