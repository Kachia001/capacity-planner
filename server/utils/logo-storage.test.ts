import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteStoredLogo,
  MAX_LOGO_HEIGHT,
  MAX_LOGO_UPLOAD_BYTES,
  MAX_LOGO_WIDTH,
  processAndStoreLogo,
  readStoredLogo,
} from './logo-storage'

let storageDirectory: string

beforeEach(async () => {
  storageDirectory = await mkdtemp(join(tmpdir(), 'capacity-planner-logo-test-'))
  vi.stubGlobal('useRuntimeConfig', () => ({ logoStorageDir: storageDirectory }))
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await rm(storageDirectory, { recursive: true, force: true })
})

describe('logo storage', () => {
  it('downsizes a large image while preserving its aspect ratio and stores WebP', async () => {
    const source = await sharp({
      create: {
        width: 2400,
        height: 800,
        channels: 4,
        background: { r: 20, g: 120, b: 80, alpha: 1 },
      },
    })
      .png()
      .toBuffer()

    const stored = await processAndStoreLogo({ data: source, filename: 'large-logo.png' })
    const output = await readStoredLogo(stored.storageKey)
    const metadata = await sharp(output).metadata()

    expect(stored).toMatchObject({
      originalName: 'large-logo.png',
      mimeType: 'image/webp',
      width: MAX_LOGO_WIDTH,
      height: MAX_LOGO_HEIGHT,
    })
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(MAX_LOGO_WIDTH)
    expect(metadata.height).toBe(MAX_LOGO_HEIGHT)

    await deleteStoredLogo(stored.storageKey)
    await expect(readStoredLogo(stored.storageKey)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('does not enlarge an image that already fits the maximum dimensions', async () => {
    const source = await sharp({
      create: {
        width: 300,
        height: 100,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .jpeg()
      .toBuffer()

    const stored = await processAndStoreLogo({ data: source, filename: 'small.jpg' })

    expect(stored.width).toBe(300)
    expect(stored.height).toBe(100)
  })

  it('rejects uploads larger than the input byte limit', async () => {
    await expect(
      processAndStoreLogo({
        data: Buffer.alloc(MAX_LOGO_UPLOAD_BYTES + 1),
        filename: 'too-large.png',
      }),
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' })
  })

  it('rejects SVG even when the image decoder can read it', async () => {
    const source = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><rect width="100" height="40" fill="red"/></svg>',
    )

    await expect(
      processAndStoreLogo({ data: source, filename: 'unsafe.svg' }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FORMAT' })
  })
})
