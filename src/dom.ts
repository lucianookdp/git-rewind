type Attrs = Record<string, string | number>

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = String(value)
    else node.setAttribute(key, String(value))
  }
  for (const child of children) {
    node.append(child)
  }
  return node
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function fadeInUp(target: Element, delayMs: number, durationMs = 500): void {
  if (prefersReducedMotion()) {
    ;(target as HTMLElement).style.opacity = '1'
    return
  }
  target.animate(
    [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: durationMs, delay: delayMs, fill: 'forwards', easing: 'cubic-bezier(.16,1,.3,1)' },
  )
}

export function staggerWords(headline: HTMLElement, baseDelay = 0): void {
  const text = headline.textContent ?? ''
  headline.textContent = ''
  const words = text.split(' ')
  words.forEach((word, index) => {
    const span = el('span', { class: 'headline__word' }, [`${word} `])
    headline.append(span)
    fadeInUp(span, baseDelay + index * 70, 420)
  })
}

// Shrinks an element's font-size in place until its rendered width fits its
// parent, so a wide number (e.g. a six-digit star count) never runs past
// the edge of a narrow phone screen. Measure against the final text before
// animating it in, since digit count only grows during a count-up.
export function fitToParent(target: HTMLElement, minFontSizePx = 22): void {
  const available = target.parentElement?.clientWidth
  if (!available) return
  const natural = target.scrollWidth
  if (natural <= available) return
  const currentSize = parseFloat(getComputedStyle(target).fontSize)
  const fitted = Math.max(minFontSizePx, Math.floor((currentSize * available * 0.94) / natural))
  target.style.fontSize = `${fitted}px`
}

export function countUp(target: HTMLElement, value: number, delayMs = 0, durationMs = 900): void {
  if (prefersReducedMotion()) {
    target.textContent = value.toLocaleString('en-US')
    return
  }
  const start = performance.now() + delayMs
  function tick(now: number) {
    if (now < start) {
      requestAnimationFrame(tick)
      return
    }
    const elapsed = now - start
    const progress = Math.min(1, elapsed / durationMs)
    const eased = 1 - Math.pow(1 - progress, 3)
    target.textContent = Math.round(eased * value).toLocaleString('en-US')
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
