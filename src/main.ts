import './style.css'
import { el, prefersReducedMotion } from './dom'
import { NotFoundError, RateLimitError, fetchProfileData, formatResetWait } from './github-api'
import { ACCENT_UNKNOWN, IDLE_ACCENT_CYCLE } from './languages'
import { LOGO_MARK_SVG } from './logo'
import { computeMetrics } from './metrics'
import { deriveProfile } from './profiles'
import { buildSlides } from './slides'
import type { GithubUser, Metrics, Profile } from './types'

const appQuery = document.querySelector<HTMLDivElement>('#app')
if (!appQuery) throw new Error('Missing #app root element')
const app: HTMLDivElement = appQuery

const SLIDE_DURATION_MS = 5000
// People who created something widely known, not just high follower counts.
const EXAMPLE_LOGINS = ['torvalds', 'gvanrossum', 'yyx990803', 'gaearon']

let cleanupActiveMount: (() => void) | null = null

function setApp(stage: HTMLElement): void {
  cleanupActiveMount?.()
  cleanupActiveMount = null
  app.replaceChildren(stage)
}

function setAccent(color: string): void {
  document.documentElement.style.setProperty('--accent', color)
}

function shareUrlFor(login: string): string {
  return `${location.origin}${location.pathname}?u=${encodeURIComponent(login)}`
}

// --- entry ---

function mountEntry(options: { prefill?: string; errorMessage?: string } = {}): void {
  setAccent(ACCENT_UNKNOWN)
  history.replaceState(null, '', location.pathname)

  const stage = el('div', { class: 'stage' })
  const ambient = el('div', { class: 'ambient' }, [
    el('div', { class: 'ambient__blob' }),
    el('div', { class: 'ambient__blob ambient__blob--b' }),
  ])
  const content = el('div', { class: 'slide-content entry' })
  stage.append(ambient, content)

  const logo = el('div', { class: 'entry__logo' })
  logo.innerHTML = LOGO_MARK_SVG
  content.append(
    el('div', { class: 'entry__brand' }, [logo, el('h1', { class: 'entry__title' }, ['git-rewind'])]),
    el('p', { class: 'entry__subtitle' }, [
      'Type a GitHub username. The whole public history of the account, first repository to now, turned into something you can watch and send.',
    ]),
  )

  const form = el('form', { class: 'entry__form' })
  const input = el('input', {
    class: 'entry__input',
    type: 'text',
    placeholder: 'octocat',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    'aria-label': 'GitHub username',
  })
  const submit = el('button', { class: 'entry__submit', type: 'submit' }, ['Rewind'])
  form.append(input, submit)
  content.append(form)

  const examples = el('div', { class: 'entry__examples' }, [
    el('span', { class: 'entry__examples-label' }, ['or try']),
    ...EXAMPLE_LOGINS.map((login) => {
      const chip = el('button', { class: 'entry__chip', type: 'button' }, [login])
      chip.addEventListener('click', () => startRewind(login))
      return chip
    }),
  ])
  content.append(examples)

  if (options.prefill) input.value = options.prefill
  if (options.errorMessage) {
    content.append(el('div', { class: 'entry__error', role: 'alert' }, [options.errorMessage]))
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const login = input.value.trim()
    if (login) startRewind(login)
  })

  setApp(stage)
  input.focus()

  let cycleIndex = 0
  const applyIdleColor = () => {
    stage.style.setProperty('--idle-accent', IDLE_ACCENT_CYCLE[cycleIndex])
  }
  applyIdleColor()

  let intervalId: number | undefined
  if (!prefersReducedMotion()) {
    intervalId = window.setInterval(() => {
      cycleIndex = (cycleIndex + 1) % IDLE_ACCENT_CYCLE.length
      applyIdleColor()
    }, 3200)
  }
  cleanupActiveMount = () => {
    if (intervalId !== undefined) window.clearInterval(intervalId)
  }
}

// --- loading ---

function mountLoading(login: string): void {
  const stage = el('div', { class: 'stage' })
  stage.append(
    el('div', { class: 'loading' }, [
      el('div', { class: 'loading__ring' }),
      el('div', { class: 'loading__label' }, [`Fetching ${login}'s history`]),
    ]),
  )
  setApp(stage)
}

// --- generic message screen (errors) ---

function mountMessage(
  eyebrowText: string,
  headlineText: string,
  bodyText: string,
  ctaLabel: string,
  onCta: () => void,
): void {
  const stage = el('div', { class: 'stage' })
  const content = el('div', { class: 'slide-content' })
  content.append(
    el('div', { class: 'eyebrow' }, [eyebrowText]),
    el('h2', { class: 'headline' }, [headlineText]),
    el('p', { class: 'entry__subtitle' }, [bodyText]),
  )
  const button = el('button', { class: 'entry__submit', type: 'button' }, [ctaLabel])
  button.style.alignSelf = 'flex-start'
  button.addEventListener('click', onCta)
  content.append(button)
  stage.append(content)
  setApp(stage)
}

// --- story sequence ---

function mountStory(user: GithubUser, metrics: Metrics, profile: Profile, login: string): void {
  setAccent(ACCENT_UNKNOWN)

  const slides = buildSlides()
  const stage = el('div', { class: 'stage' })
  const glow = el('div', { class: 'story-glow' })
  const progress = el('div', { class: 'progress', role: 'presentation' })
  const segments = slides.map(() => {
    const fill = el('div', { class: 'progress__fill' })
    const segment = el('div', { class: 'progress__segment' }, [fill])
    progress.append(segment)
    return { segment, fill }
  })
  const slideContent = el('div', { class: 'slide-content' })
  const liveRegion = el('div', { class: 'visually-hidden', 'aria-live': 'polite' }, [''])
  const tapHint = el('div', { class: 'tap-hint' }, ['tap →'])

  stage.append(glow, progress, slideContent, liveRegion, tapHint)
  setApp(stage)

  let index = 0
  let currentAnimation: Animation | null = null

  function showSlide(next: number): void {
    index = next
    segments.forEach(({ fill }, i) => {
      fill.style.width = i < index ? '100%' : '0%'
    })
    slideContent.replaceChildren()
    slides[index].render(slideContent, {
      user,
      metrics,
      profile,
      setAccent,
      login,
      onRestart: () => mountEntry(),
    })
    liveRegion.textContent = `Slide ${index + 1} of ${slides.length}: ${slides[index].announce}`
    tapHint.style.display = index === slides.length - 1 ? 'none' : ''
    startAutoAdvance()
  }

  function startAutoAdvance(): void {
    currentAnimation?.cancel()
    currentAnimation = null
    const isLast = index === slides.length - 1
    const { fill } = segments[index]
    if (prefersReducedMotion() || !slides[index].autoAdvance || isLast) {
      fill.style.width = '0%'
      return
    }
    currentAnimation = fill.animate([{ width: '0%' }, { width: '100%' }], {
      duration: SLIDE_DURATION_MS,
      easing: 'linear',
      fill: 'forwards',
    })
    currentAnimation.onfinish = () => {
      if (index < slides.length - 1) showSlide(index + 1)
    }
  }

  function next(): void {
    if (index < slides.length - 1) showSlide(index + 1)
  }

  function prev(): void {
    if (index > 0) showSlide(index - 1)
  }

  function isInteractiveTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement ? Boolean(target.closest('button, input, a, form')) : false
  }

  let holdTimeoutId: number | undefined
  let isHeldPaused = false

  function handlePointerDown(event: PointerEvent): void {
    if (isInteractiveTarget(event.target)) return
    holdTimeoutId = window.setTimeout(() => {
      currentAnimation?.pause()
      isHeldPaused = true
    }, 250)
  }

  function handlePointerUp(event: PointerEvent): void {
    if (isInteractiveTarget(event.target)) return
    window.clearTimeout(holdTimeoutId)
    if (isHeldPaused) {
      currentAnimation?.play()
      isHeldPaused = false
      return
    }
    const isRightSide = event.clientX > window.innerWidth * 0.3
    if (isRightSide) next()
    else prev()
  }

  function handlePointerLeave(): void {
    window.clearTimeout(holdTimeoutId)
    if (isHeldPaused) {
      currentAnimation?.play()
      isHeldPaused = false
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (isInteractiveTarget(event.target)) return
    if (event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault()
      next()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      prev()
    }
  }

  stage.addEventListener('pointerdown', handlePointerDown)
  stage.addEventListener('pointerup', handlePointerUp)
  stage.addEventListener('pointerleave', handlePointerLeave)
  document.addEventListener('keydown', handleKeydown)

  cleanupActiveMount = () => {
    currentAnimation?.cancel()
    document.removeEventListener('keydown', handleKeydown)
  }

  showSlide(0)
}

// --- boot ---

async function startRewind(login: string): Promise<void> {
  history.replaceState(null, '', shareUrlFor(login))
  mountLoading(login)
  try {
    const data = await fetchProfileData(login)
    const metrics = computeMetrics(data.user, data.repos)
    const profile = deriveProfile(metrics)
    mountStory(data.user, metrics, profile, login)
  } catch (error) {
    if (error instanceof NotFoundError) {
      mountMessage(
        'Not found',
        `"${login}" doesn't exist`,
        'Double-check the spelling and try a different username.',
        'Try another username',
        () => mountEntry(),
      )
      return
    }
    if (error instanceof RateLimitError) {
      mountMessage(
        'Rate limited',
        'Too many requests',
        `GitHub's public API allows 60 requests per hour without a token, and that limit has been reached. It resets in ${formatResetWait(error.resetAt)}.`,
        'Back',
        () => mountEntry(),
      )
      return
    }
    mountMessage(
      'Something went wrong',
      'Could not load that profile',
      error instanceof Error ? error.message : 'An unexpected error occurred.',
      'Back',
      () => mountEntry(),
    )
  }
}

const initialLogin = new URLSearchParams(location.search).get('u')
if (initialLogin) {
  startRewind(initialLogin)
} else {
  mountEntry()
}
