import type { GithubUser, Metrics, Profile } from './types'

const WIDTH = 1080
const HEIGHT = 1350
const INK = '#0b0b12'
const PAPER = '#f3efe7'
const SMOKE = '#8d899b'

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word
    if (ctx.measureText(trial).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = trial
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawStat(ctx: CanvasRenderingContext2D, x: number, y: number, value: string, caption: string): void {
  ctx.fillStyle = PAPER
  ctx.font = '700 64px "Martian Mono", monospace'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(value, x, y)
  ctx.fillStyle = SMOKE
  ctx.font = '400 24px "Martian Mono", monospace'
  ctx.fillText(caption, x, y + 36)
}

export async function renderShareCard(
  user: GithubUser,
  metrics: Metrics,
  profile: Profile,
  accent: string,
): Promise<HTMLCanvasElement> {
  await document.fonts.load('800 64px Archivo')
  await document.fonts.load('700 64px "Martian Mono"')
  await document.fonts.load('400 24px "Martian Mono"')

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.fillStyle = INK
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.save()
  ctx.filter = 'blur(90px)'
  ctx.fillStyle = accent
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  ctx.ellipse(WIDTH - 120, 140, 260, 260, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  let avatar: HTMLImageElement | null = null
  try {
    avatar = await loadImage(`${user.avatar_url}&s=256`)
  } catch {
    avatar = null
  }

  const avatarSize = 128
  const avatarX = 80
  const avatarY = 90
  if (avatar) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
    ctx.restore()
  }

  ctx.fillStyle = PAPER
  ctx.font = '800 40px Archivo'
  ctx.fillText(user.name ?? user.login, avatarX + avatarSize + 28, avatarY + 54)
  ctx.fillStyle = SMOKE
  ctx.font = '400 26px "Martian Mono", monospace'
  ctx.fillText(`@${user.login}`, avatarX + avatarSize + 28, avatarY + 90)

  ctx.fillStyle = PAPER
  ctx.font = '800 76px Archivo'
  const profileLines = wrapText(ctx, profile.name.toUpperCase(), WIDTH - 160)
  let cursorY = 340
  for (const line of profileLines) {
    ctx.fillText(line, 80, cursorY)
    cursorY += 84
  }

  ctx.fillStyle = PAPER
  ctx.font = '400 28px "Martian Mono", monospace'
  const descLines = wrapText(ctx, profile.description, WIDTH - 160)
  cursorY += 12
  for (const line of descLines) {
    ctx.fillText(line, 80, cursorY)
    cursorY += 38
  }

  const statsTop = cursorY + 70
  drawStat(ctx, 80, statsTop, `${metrics.accountAgeYears}y`, 'on GitHub')
  drawStat(ctx, WIDTH / 2 + 20, statsTop, metrics.totalStars.toLocaleString('en-US'), 'stars received')
  drawStat(ctx, 80, statsTop + 140, metrics.publicRepoCount.toLocaleString('en-US'), 'public repos')
  drawStat(ctx, WIDTH / 2 + 20, statsTop + 140, metrics.totalForks.toLocaleString('en-US'), 'forks earned')

  if (metrics.primaryLanguage) {
    const langY = statsTop + 260
    ctx.fillStyle = metrics.primaryLanguage.color
    ctx.beginPath()
    ctx.arc(96, langY - 10, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = PAPER
    ctx.font = '400 30px "Martian Mono", monospace'
    ctx.fillText(metrics.primaryLanguage.name, 124, langY)
  }

  ctx.fillStyle = SMOKE
  ctx.font = '400 22px "Martian Mono", monospace'
  ctx.fillText(`the whole public history, since ${metrics.memberSince.getUTCFullYear()}`, 80, HEIGHT - 100)
  ctx.fillStyle = PAPER
  ctx.font = '700 26px "Martian Mono", monospace'
  ctx.fillText('git-rewind', 80, HEIGHT - 60)

  return canvas
}
