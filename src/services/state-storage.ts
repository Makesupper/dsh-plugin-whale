import fs from 'node:fs'
import path from 'node:path'
import { resolveDefaultStorageFile } from './merit-storage.js'
import type { MuyuSoundType } from '../types.js'

export interface RuntimeState {
  soundType?: MuyuSoundType
  tokensPerMerit?: number
  accompanimentIntervalMs?: number
  modelUrl?: string
}

export function resolveRuntimeStateFile(storagePath?: string): string {
  return `${resolveDefaultStorageFile(storagePath)}.state.json`
}

export class RuntimeStateStorage {
  private file: string

  constructor(storagePath?: string) {
    this.file = resolveRuntimeStateFile(storagePath)
  }

  public get path(): string {
    return this.file
  }

  public clear(): void {
    try {
      if (fs.existsSync(this.file)) {
        fs.unlinkSync(this.file)
      }
    } catch (error) {
      console.warn('[dsh-plugin-whale] Failed to clear runtime state:', error)
    }
  }

  public load(): RuntimeState {
    try {
      if (!fs.existsSync(this.file)) return {}
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf-8'))
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
      const soundType = parsed.soundType
      return {
        soundType:
          soundType === 'whale_deep' || soundType === 'whale_song' || soundType === 'whale_echo' || soundType === 'whale_52hz' || soundType === 'sandalwood' || soundType === 'whitewood' || soundType === 'bell'
            ? soundType
            : undefined,
        tokensPerMerit:
          typeof parsed.tokensPerMerit === 'number' &&
          Number.isFinite(parsed.tokensPerMerit) &&
          parsed.tokensPerMerit !== 0 &&
          Math.abs(parsed.tokensPerMerit) <= 10000000
            ? Math.trunc(parsed.tokensPerMerit)
            : undefined,
        accompanimentIntervalMs:
          typeof parsed.accompanimentIntervalMs === 'number' &&
          Number.isFinite(parsed.accompanimentIntervalMs)
            ? Math.min(60000, Math.max(200, Math.floor(parsed.accompanimentIntervalMs)))
            : undefined,
        modelUrl: typeof parsed.modelUrl === 'string' ? parsed.modelUrl : undefined
      }
    } catch (error) {
      console.warn('[dsh-plugin-whale] Failed to read runtime state:', error)
      return {}
    }
  }

  public save(state: RuntimeState): void {
    try {
      const dir = path.dirname(this.file)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      const payload = {
        version: 1,
        soundType: state.soundType,
        tokensPerMerit:
          typeof state.tokensPerMerit === 'number' && Number.isFinite(state.tokensPerMerit) && state.tokensPerMerit !== 0
            ? Math.trunc(state.tokensPerMerit)
            : undefined,
        accompanimentIntervalMs:
          typeof state.accompanimentIntervalMs === 'number' && Number.isFinite(state.accompanimentIntervalMs)
            ? Math.min(60000, Math.max(200, Math.floor(state.accompanimentIntervalMs)))
            : undefined,
        modelUrl: typeof state.modelUrl === 'string' ? state.modelUrl : undefined,
        updatedAt: Date.now()
      }
      const tmpFile = `${this.file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf-8')
      fs.renameSync(tmpFile, this.file)
    } catch (error) {
      console.warn('[dsh-plugin-whale] Failed to save runtime state:', error)
    }
  }
}
