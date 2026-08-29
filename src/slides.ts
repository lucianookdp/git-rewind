import { countUp, el, fadeInUp, fitToParent, prefersReducedMotion, staggerWords } from './dom'
import { ACCENT_UNKNOWN } from './languages'
import { renderShareCard } from './canvas-card'
import type { GithubUser, Metrics, Profile } from './types'

export interface SlideContext {
  user: GithubUser
  metrics: Metrics
  profile: Profile
  setAccent: (color: string) => void
  login: string
  onRestart: () => void
}

export interface SlideDef {
  announce: string
  render: (root: HTMLElement, ctx: SlideContext) => void
  autoAdvance: boolean
}

function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)
}

interface StatEntry {
  wrap: HTMLElement
  number: HTMLElement
  numericValue: number
  delay: number
}

// Split into create + activate so a row of stats can all be appended to the
// grid first, and only then measured for font-fit — fitting one number
// before its siblings exist would measure against a column width the grid
// hasn't finished dividing up yet.
function createStat(root: HTMLElement, value: string, caption: string, delay: number): StatEntry {
  const wrap = el('div', { class: 'stat' })
  const number = el('div', { class: 'stat-number' })
  const label = el('div', { class: 'stat-caption' }, [caption])
  wrap.append(number, label)
  root.append(wrap)
  return { wrap, number, numericValue: Number(value) || 0, delay }
}

function activateStat({ wrap, number, numericValue, delay }: StatEntry): void {
  number.textContent = numericValue.toLocaleString('en-US')
  fitToParent(number)
  number.textContent = '0'
  fadeInUp(wrap, delay)
  countUp(number, numericValue, delay + 100)
}

function stat(root: HTMLElement, value: string, caption: string, delay: number): HTMLElement {
  const entry = createStat(root, value, caption, delay)
  activateStat(entry)
  return entry.wrap
}

function headlineBlock(root: HTMLElement, eyebrowText: string, headlineText: string): HTMLElement {
  const eyebrow = el('div', { class: 'eyebrow' }, [eyebrowText])
  const headline = el('h2', { class: 'headline' }, [headlineText])
  root.append(eyebrow, headline)
  fadeInUp(eyebrow, 0)
  staggerWords(headline, 150)
  return headline
}

export function buildSlides(): SlideDef[] {
  return [
    // 1. Opening
    {
      announce: 'Member since',
      autoAdvance: true,
      render(root, { user, metrics }) {
        const avatar = el('img', {
          src: user.avatar_url,
          alt: '',
          class: 'avatar',
          width: 88,
          height: 88,
          style: 'border-radius:50%;display:block;margin-bottom:1rem;',
        })
        root.append(avatar)
        fadeInUp(avatar, 0)
        headlineBlock(root, `@${user.login}`, `On GitHub since ${formatMonthYear(metrics.memberSince)}`)
        const caption = el('p', { class: 'footnote' }, [
          `${metrics.accountAgeYears} year${metrics.accountAgeYears === 1 ? '' : 's'} in, ${user.followers.toLocaleString('en-US')} followers`,
        ])
        root.append(caption)
        fadeInUp(caption, 500)
      },
    },
    // 2. Origin — the first repository
    {
      announce: 'Where it started',
      autoAdvance: true,
      render(root, { metrics }) {
        const first = metrics.firstRepo
        if (!first) {
          headlineBlock(root, 'The origin', 'No public repositories yet')
          return
        }
        headlineBlock(root, `First repository, ${formatMonthYear(first.createdAt)}`, first.name)
        const caption = el('p', { class: 'footnote' }, [
          first.stars > 0
            ? `Still standing, with ${first.stars.toLocaleString('en-US')} star${first.stars === 1 ? '' : 's'} today.`
            : `Where the account's public history begins.`,
        ])
        root.append(caption)
        fadeInUp(caption, 500)
      },
    },
    // 3. Repos, stars, forks — lifetime totals
    {
      announce: 'Repositories, stars, and forks',
      autoAdvance: true,
      render(root, { metrics }) {
        headlineBlock(root, 'The whole history', 'Repos, stars, and forks')
        const grid = el('div', { class: 'stat-grid' })
        root.append(grid)
        ;[
          createStat(grid, String(metrics.publicRepoCount), 'public repositories', 350),
          createStat(grid, String(metrics.totalStars), 'stars received', 500),
          createStat(grid, String(metrics.totalForks), 'forks earned', 650),
        ].forEach(activateStat)
        if (!metrics.repoSampleIsComplete) {
          const note = el('p', { class: 'footnote' }, [
            'Based on the oldest 200 public repositories — the account has more than that.',
          ])
          root.append(note)
          fadeInUp(note, 900)
        }
      },
    },
    // 4. Primary language — the palette flip
    {
      announce: 'Primary language',
      autoAdvance: true,
      render(root, { metrics, setAccent }) {
        const primary = metrics.primaryLanguage
        setAccent(primary ? primary.color : ACCENT_UNKNOWN)
        headlineBlock(root, 'Primary language', primary ? primary.name : 'No language detected')
        if (metrics.languages.length > 0) {
          const list = el('div', { class: 'langs' })
          root.append(list)
          metrics.languages.slice(0, 5).forEach((lang, index) => {
            const row = el('div', { class: 'langs__row' }, [
              el('span', { class: 'langs__dot', style: `background:${lang.color}` }),
              el('span', { class: 'langs__name' }, [lang.name]),
              el('span', { class: 'langs__count' }, [`${lang.count}`]),
            ])
            list.append(row)
            fadeInUp(row, 450 + index * 80)
          })
        }
      },
    },
    // 5. Top starred repo
    {
      announce: 'Most starred repository',
      autoAdvance: true,
      render(root, { metrics }) {
        const top = metrics.topStarredRepo
        headlineBlock(root, 'Most starred', top ? top.name : 'No stars yet')
        if (top) stat(root, String(top.stars), 'stars', 400)
      },
    },
    // 6. Timeline — repositories created per year
    {
      announce: 'Repositories over the years',
      autoAdvance: true,
      render(root, { metrics }) {
        const years = metrics.reposByYear
        const hasAny = years.some((y) => y.count > 0)
        headlineBlock(root, 'The timeline', hasAny ? `${years.length} years of public repositories` : 'A quiet history so far')
        if (!hasAny) return

        const maxCount = Math.max(1, ...years.map((y) => y.count))
        const bars = el('div', { class: 'timeline' })
        root.append(bars)
        years.forEach((entry, index) => {
          const isPeak = metrics.mostProductiveYear?.year === entry.year
          const bar = el('div', { class: 'timeline__bar', 'data-active': String(isPeak) })
          bars.append(bar)
          const heightPercent = Math.max(8, Math.round((entry.count / maxCount) * 100))
          if (prefersReducedMotion()) {
            bar.style.height = `${heightPercent}%`
            return
          }
          bar.animate([{ height: '8%' }, { height: `${heightPercent}%` }], {
            duration: 500,
            delay: 300 + index * (years.length > 20 ? 10 : 25),
            fill: 'forwards',
            easing: 'cubic-bezier(.16,1,.3,1)',
          })
        })

        const labelIndexes = new Set([0, years.length - 1])
        if (years.length > 2) labelIndexes.add(Math.floor((years.length - 1) / 2))
        const labels = el('div', { class: 'timeline__labels' })
        years.forEach((entry, index) => {
          if (labelIndexes.has(index)) labels.append(el('span', {}, [String(entry.year)]))
        })
        root.append(labels)
      },
    },
    // 7. Best year
    {
      announce: 'Biggest year',
      autoAdvance: true,
      render(root, { metrics }) {
        const best = metrics.mostProductiveYear
        if (!best) {
          headlineBlock(root, 'Biggest year', 'Not enough history yet')
          return
        }
        headlineBlock(root, 'Biggest year', String(best.year))
        stat(root, String(best.count), `repositor${best.count === 1 ? 'y' : 'ies'} started`, 400)
      },
    },
    // 8. Profile reveal
    {
      announce: 'Your profile',
      autoAdvance: true,
      render(root, { profile }) {
        const lead = el('div', { class: 'eyebrow' }, ['The verdict'])
        const preface = el('p', { class: 'footnote' }, ['Across the whole history of the account, you are'])
        root.append(lead, preface)
        fadeInUp(lead, 0)
        fadeInUp(preface, 150)
        const headline = el('h2', { class: 'headline' }, [profile.name])
        const desc = el('p', { class: 'stat-caption' }, [profile.description])
        root.append(headline, desc)
        fadeInUp(headline, 900, 600)
        fadeInUp(desc, 1500)
      },
    },
    // 9. Final share card
    {
      announce: 'Your share card',
      autoAdvance: false,
      render(root, { user, metrics, profile, login, onRestart }) {
        const wrap = el('div', { class: 'final' })
        root.append(wrap)
        const status = el('div', { class: 'final__status', role: 'status' }, [''])
        const actions = el('div', { class: 'final__actions' }, [
          el('button', { class: 'final__button final__button--primary', type: 'button' }, ['Download PNG']),
          el('button', { class: 'final__button', type: 'button' }, ['Copy link']),
        ])
        const restart = el('button', { class: 'final__restart', type: 'button' }, ['Rewind someone else'])
        restart.addEventListener('click', (event) => {
          event.stopPropagation()
          onRestart()
        })
        wrap.append(status, actions, restart)

        renderShareCard(user, metrics, profile, getComputedAccent()).then((canvas) => {
          wrap.prepend(canvas)

          const [downloadBtn, copyBtn] = Array.from(actions.children) as HTMLButtonElement[]
          downloadBtn.addEventListener('click', (event) => {
            event.stopPropagation()
            canvas.toBlob((blob) => {
              if (!blob) return
              const url = URL.createObjectURL(blob)
              const link = el('a', { href: url, download: `git-rewind-${login}.png` })
              link.click()
              URL.revokeObjectURL(url)
              status.textContent = 'Image downloaded.'
            }, 'image/png')
          })

          copyBtn.addEventListener('click', async (event) => {
            event.stopPropagation()
            const shareUrl = `${location.origin}${location.pathname}?u=${encodeURIComponent(login)}`
            try {
              await navigator.clipboard.writeText(shareUrl)
              status.textContent = 'Link copied to clipboard.'
            } catch {
              status.textContent = shareUrl
            }
          })
        })
      },
    },
  ]
}

function getComputedAccent(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || ACCENT_UNKNOWN
}
