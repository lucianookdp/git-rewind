import type { Metrics, Profile } from './types'

export function deriveProfile(metrics: Metrics): Profile {
  if (metrics.accountAgeYears >= 10) {
    return {
      name: 'The Veteran',
      description: `${metrics.accountAgeYears} years on GitHub and counting — an account older than most of the tools built on it.`,
    }
  }

  if (metrics.topStarredRepo && metrics.totalStars >= 20 && metrics.topStarredRepo.stars >= metrics.totalStars * 0.6) {
    return {
      name: 'The Breakout Hit',
      description: `${metrics.topStarredRepo.name} alone accounts for most of the ${metrics.totalStars.toLocaleString('en-US')} stars earned — one idea that traveled further than the rest.`,
    }
  }

  if (
    metrics.mostProductiveYear &&
    metrics.publicRepoCount >= 6 &&
    metrics.mostProductiveYear.count >= metrics.publicRepoCount * 0.5
  ) {
    return {
      name: 'The Sprinter',
      description: `${metrics.mostProductiveYear.count} of ${metrics.publicRepoCount} repositories were started in ${metrics.mostProductiveYear.year} alone — a single, concentrated burst.`,
    }
  }

  if (metrics.languages.length >= 8) {
    return {
      name: 'The Polyglot',
      description: `${metrics.languages.length} different languages across public repositories. No single tool ever got to be the only one.`,
    }
  }

  if (metrics.activeYearRatio >= 0.75 && metrics.accountAgeYears >= 4) {
    return {
      name: 'The Steady Hand',
      description: `Something new started in almost every year since joining — about ${Math.round(metrics.activeYearRatio * 100)}% of the account's history has a repository to show for it.`,
    }
  }

  if (metrics.totalForks >= 50 && metrics.totalForks >= metrics.totalStars * 0.3) {
    return {
      name: 'The Community Favorite',
      description: `${metrics.totalForks.toLocaleString('en-US')} forks across public repositories — code other people actually picked up and ran with.`,
    }
  }

  if (metrics.publicRepoCount >= 25 && metrics.totalStars < metrics.publicRepoCount * 3) {
    return {
      name: 'The Quiet Architect',
      description: `${metrics.publicRepoCount} public repositories built, mostly without an audience watching. The work was the point.`,
    }
  }

  return {
    name: 'The Long Game',
    description: `${metrics.accountAgeYears} years, ${metrics.publicRepoCount} repositories, ${metrics.totalStars.toLocaleString('en-US')} stars — steady, unhurried progress.`,
  }
}
