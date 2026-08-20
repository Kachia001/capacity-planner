import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import sharp from 'sharp'

export const MAX_LOGO_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_LOGO_WIDTH = 1200
export const MAX_LOGO_HEIGHT = 400
export const MAX_LOGO_INPUT_PIXELS = 40_000_000

const ALLOWED_INPUT_FORMATS = new Set(['jpeg', 'png', 'webp'])
const STORAGE_KEY_PATTERN = /^[0-9a-f-]{36}\.webp$/i

export class LogoStorageError extends Error {
  constructor(
    message: string,
    readonly code: 'FILE_TOO_LARGE' | 'INVALID_IMAGE' | 'UNSUPPORTED_FORMAT',
  ) {
    super(message)
    this.name = 'LogoStorageError'
  }
}

export type StoredLogoImage = {
  storageKey: string
  originalName: string
  mimeType: 'image/webp'
  sizeBytes: number
  width: number
  height: number
}

function getStorageDirectory() {
  const configured = useRuntimeConfig().logoStorageDir?.trim() || './data/logos'
  return resolve(process.cwd(), configured)
}

function resolveStoragePath(storageKey: string) {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new Error('Invalid logo storage key.')
  }

  return resolve(getStorageDirectory(), storageKey)
}

export async function processAndStoreLogo(input: {
  data: Buffer
  filename?: string
}): Promise<StoredLogoImage> {
  if (input.data.byteLength > MAX_LOGO_UPLOAD_BYTES) {
    throw new LogoStorageError('로고 파일은 10MB 이하여야 합니다.', 'FILE_TOO_LARGE')
  }

  let sourceMetadata: sharp.Metadata
  try {
    sourceMetadata = await sharp(input.data, {
      failOn: 'error',
      limitInputPixels: MAX_LOGO_INPUT_PIXELS,
    }).metadata()
  } catch {
    throw new LogoStorageError('손상되었거나 처리할 수 없는 이미지입니다.', 'INVALID_IMAGE')
  }

  if (!sourceMetadata.format || !ALLOWED_INPUT_FORMATS.has(sourceMetadata.format)) {
    throw new LogoStorageError(
      'PNG, JPEG, WebP 이미지만 업로드할 수 있습니다.',
      'UNSUPPORTED_FORMAT',
    )
  }

  let result: Awaited<ReturnType<ReturnType<typeof sharp>['toBuffer']>>
  try {
    result = await sharp(input.data, {
      failOn: 'error',
      limitInputPixels: MAX_LOGO_INPUT_PIXELS,
    })
      .rotate()
      .resize({
        width: MAX_LOGO_WIDTH,
        height: MAX_LOGO_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 88, effort: 4 })
      .toBuffer({ resolveWithObject: true })
  } catch {
    throw new LogoStorageError('이미지를 최적화하지 못했습니다.', 'INVALID_IMAGE')
  }

  const storageKey = `${randomUUID()}.webp`
  const storageDirectory = getStorageDirectory()
  const finalPath = resolveStoragePath(storageKey)
  const temporaryPath = `${finalPath}.tmp-${randomUUID()}`

  await mkdir(storageDirectory, { recursive: true })
  await writeFile(temporaryPath, result.data, { flag: 'wx' })
  try {
    await rename(temporaryPath, finalPath)
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }

  return {
    storageKey,
    originalName: basename(input.filename?.trim() || 'logo').slice(0, 255),
    mimeType: 'image/webp',
    sizeBytes: result.info.size,
    width: result.info.width,
    height: result.info.height,
  }
}

export function readStoredLogo(storageKey: string) {
  return readFile(resolveStoragePath(storageKey))
}

export async function deleteStoredLogo(storageKey: string) {
  try {
    await unlink(resolveStoragePath(storageKey))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}
