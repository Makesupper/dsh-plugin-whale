/**
 * DSH Whale Companion Client Bundle
 * Complies with DSH lazy CJS model: window.__ModuleLoader__.load({ id, factory })
 *
 * Real-Time LLM Speech + Rhythmic Wooden-Fish Accompaniment:
 * - Polls `/dsh-whale/state` for new LLM speech segments (`speechQueue`) and merit/token updates.
 * - Feeds each LLM sentence into `WhaleSpeechSynthesizer` (Web Speech API).
 * - Automatically triggers rhythmic wooden-fish accompaniment knocks while the Whale Girl is speaking,
 *   and stops the accompaniment timer automatically once the LLM speech queue finishes.
 */

import { createWhaleFloatingPet, type MeritHistoryItem, type WhaleWidgetOptions } from './widget-ui.js'
import { MuyuWebAudioPlayer } from './sound-player.js'
import { WhaleSpeechSynthesizer } from './speech-synthesizer.js'
import { formatMeritCount, formatTokenLabel, formatWhaleWeight, formatWeightDelta } from '../format.js'
import type { MuyuSoundType, SpeechSegment } from '../types.js'

const API_BASE = '/dsh-whale'
const POLL_INTERVAL_MS = 750
const MAX_VISUAL_BURST = 12
const PREF_KEY = 'dsh_whale_client_prefs'

interface ClientPreferences {
  soundId: MuyuSoundType
  soundEnabled: boolean
  voiceId: string
  personaId?: string
  voiceEnabled: boolean
  rate: number
  pitch: number
  volume: number
  accompanimentIntervalMs: number
  modelUrl: string
}

interface ServerState {
  apiVersion?: number
  todayMerit: number
  totalMerit: number
  todayTokens: number
  totalTokens: number
  pendingTokens: number
  tokensPerMerit: number
  accompanimentIntervalMs: number
  modelUrl: string
  todayKey: string
  currentSpeech: SpeechSegment
  speechSeq: number
  ackedSpeechSeq: number
  speechQueue: SpeechSegment[]
  knockSeq: number
  auto: {
    running: boolean
    targetCount: number
    currentCount: number
    intervalMs: number
    cycleTitle: string
  }
  records?: MeritHistoryItem[]
}

function buildExports(_require?: any) {
  return {
    name: 'whale-client',
    inject: ['slots'],
    apply(ctx: any) {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return
      }

      let prefs: ClientPreferences = {
        soundId: 'whale_deep',
        soundEnabled: true,
        voiceId: '',
        personaId: 'persona_kawaii',
        voiceEnabled: true,
        rate: 0.92,
        pitch: 1.05,
        volume: 1.0,
        accompanimentIntervalMs: 1200,
        modelUrl: ''
      }

      try {
        const savedPrefs = localStorage.getItem(PREF_KEY)
        if (savedPrefs) {
          const parsed = JSON.parse(savedPrefs)
          if (parsed && typeof parsed === 'object') {
            prefs = { ...prefs, ...parsed }
          }
        }
      } catch {}

      const savePrefs = () => {
        try {
          localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
        } catch {}
      }

      const audioPlayer = new MuyuWebAudioPlayer(prefs.soundId)
      audioPlayer.volume = prefs.volume
      audioPlayer.muted = !prefs.soundEnabled

      const speechSynth = new WhaleSpeechSynthesizer({
        rate: prefs.rate,
        pitch: prefs.pitch,
        volume: prefs.volume,
        voiceId: prefs.voiceId
      })
      speechSynth.enabled = prefs.voiceEnabled

      const transport = (globalThis as any).__DSH_TRANSPORT__
      const fetchImpl: any =
        transport && typeof transport.fetch === 'function'
          ? transport.fetch.bind(transport)
          : typeof fetch === 'function'
            ? fetch.bind(globalThis)
            : undefined

      let serverState: ServerState | null = null
      let historyRecords: MeritHistoryItem[] = []
      let recentSpeeches: SpeechSegment[] = []
      const pendingSpeechQueue: SpeechSegment[] = []
      let activeSpeechSegment: SpeechSegment | null = null
      let lastSeenSpeechSeq = 0
      let lastMerit = -1
      let lastTokens = -1
      let meritInitialized = false
      let displaySpeechText: string = '你好呀，我是深度求索鲸鱼娘！随时准备为你播报 LLM 回复并敲木鱼伴奏~'
      let alive = true
      let pollTimer: ReturnType<typeof setInterval> | null = null
      let accompanimentTimer: ReturnType<typeof setInterval> | null = null
      let pollInFlight = false
      let historyInFlight = false
      const burstTimers = new Set<ReturnType<typeof setTimeout>>()

      async function apiRequest(path: string, init: { method?: string; body?: string } = {}): Promise<any> {
        if (!fetchImpl) throw new Error('fetch unavailable')
        const headers: Record<string, string> = { accept: 'application/json' }
        if (init.body !== undefined) {
          headers['content-type'] = 'application/json'
        }
        const response = await fetchImpl(`${API_BASE}${path}`, {
          method: init.method || 'GET',
          headers,
          body: init.body,
          credentials: 'same-origin'
        })
        if (!response || !response.ok) {
          const error: any = new Error(`whale api HTTP ${response?.status ?? '???'}`)
          error.status = response?.status
          throw error
        }
        return await response.json()
      }

      async function refreshHistory(): Promise<void> {
        if (historyInFlight) return
        historyInFlight = true
        try {
          const next = await apiRequest(`/state?history=1&afterSeq=${lastSeenSpeechSeq}`)
          if (Array.isArray(next.records)) {
            historyRecords = next.records
          }
        } catch {
        } finally {
          historyInFlight = false
        }
      }

      function updatePetView(): void {
        const state = serverState
        const text =
          activeSpeechSegment?.text ||
          displaySpeechText ||
          state?.currentSpeech?.text ||
          '你好呀，我是深度求索鲸鱼娘！'
        pet.update(
          state?.todayMerit ?? 0,
          text,
          (state?.auto?.running ?? false) || accompanimentTimer !== null,
          { todayTokens: state?.todayTokens ?? 0, totalTokens: state?.totalTokens ?? 0 },
          activeSpeechSegment !== null
        )
      }

      /**
       * Perform one rhythmic wooden-fish accompaniment beat while the Whale Girl is speaking.
       */
      function triggerAccompanimentBeat(label: string = '🍚 投喂白米饭 +1kg'): void {
        if (!alive) return
        audioPlayer.playWoodenSound()
        pet.animateKnock()
        pet.triggerKnockEffect(label)
        void (async () => {
          try {
            const res = await apiRequest('/knock', {
              method: 'POST',
              body: JSON.stringify({ count: 1 })
            })
            if (res?.state) {
              lastMerit = res.state.todayMerit
              lastTokens = res.state.todayTokens
              serverState = res.state
              updatePetView()
            }
          } catch {}
        })()
      }

      function startAccompanimentRhythm(): void {
        stopAccompanimentRhythm()
        if (!alive) return
        const intervalMs = Math.max(
          250,
          serverState?.accompanimentIntervalMs || prefs.accompanimentIntervalMs || 1200
        )
        // Immediate beat at sentence start
        triggerAccompanimentBeat('🍚 播报投喂 +1kg')
        accompanimentTimer = setInterval(() => {
          if (!alive || !activeSpeechSegment) {
            stopAccompanimentRhythm()
            return
          }
          triggerAccompanimentBeat('🍚 投喂白米饭 +1kg')
        }, intervalMs)
        updatePetView()
      }

      function stopAccompanimentRhythm(): void {
        if (accompanimentTimer !== null) {
          clearInterval(accompanimentTimer)
          accompanimentTimer = null
          updatePetView()
        }
      }

      function drainSpeechQueue(): void {
        if (!alive) return
        if (activeSpeechSegment !== null) return
        const nextSeg = pendingSpeechQueue.shift()
        if (!nextSeg) {
          pet.setSpeaking(false)
          stopAccompanimentRhythm()
          updatePetView()
          return
        }

        activeSpeechSegment = nextSeg
        displaySpeechText = nextSeg.text
        recentSpeeches.push(nextSeg)
        if (recentSpeeches.length > 20) {
          recentSpeeches.shift()
        }

        pet.setSpeaking(true, 0.78)
        updatePetView()

        // Acknowledge segment to server so reloads don't replay old messages
        void apiRequest('/speech-ack', {
          method: 'POST',
          body: JSON.stringify({ seq: nextSeg.seq })
        }).catch(() => {})

        if (!speechSynth.enabled) {
          // Even if voice is muted, show sentence briefly and tap one accompaniment beat
          triggerAccompanimentBeat('🍚 投喂白米饭 +1kg')
          const timer = setTimeout(() => {
            burstTimers.delete(timer)
            activeSpeechSegment = null
            drainSpeechQueue()
          }, 900)
          burstTimers.add(timer)
          return
        }

        startAccompanimentRhythm()
        speechSynth.speakSentence(nextSeg.text, () => {
          if (!alive) return
          activeSpeechSegment = null
          if (pendingSpeechQueue.length === 0) {
            pet.setSpeaking(false)
            stopAccompanimentRhythm()
            updatePetView()
          } else {
            drainSpeechQueue()
          }
        })
      }

      speechSynth.onSpeakBoundary = () => {
        pet.pulseSpeechSyllable()
      }

      function animateMeritLoss(loss: number, tokenDelta: number): void {
        if (!alive) return
        pet.triggerKnockEffect(`⚡ ${formatTokenLabel(tokenDelta)} · 减重 -${formatWhaleWeight(loss)}`)
        updatePetView()
      }

      /**
       * 每次对话投喂的大米饭合并成好几kg的一大碗，只播放一次清脆温和音效，避免连续密集音效打扰
       */
      function animateMerit(delta: number, tokenDelta: number): void {
        if (!alive || delta <= 0) return
        // 播放单次音效并触发单次动画
        audioPlayer.playWoodenSound()
        pet.animateKnock()

        // 浮现合并后的一大碗白米饭提示
        const label =
          tokenDelta > 0
            ? `⚡ ${formatTokenLabel(tokenDelta)} · 投喂大碗白米饭 +${formatWhaleWeight(delta)}`
            : `🍚 投喂一大碗白米饭 +${formatWhaleWeight(delta)}`
        pet.triggerKnockEffect(label)
        updatePetView()
      }

      function applyState(
        next: ServerState,
        opts: {
          animate?: boolean
          consumeSpeech?: boolean
          mergeHistory?: boolean
        } = {}
      ): void {
        if (!alive || !next) return
        const prevMerit = lastMerit
        const prevTokens = lastTokens
        const prevModelUrl = serverState?.modelUrl || ''
        serverState = next

        if (typeof next.modelUrl === 'string' && next.modelUrl !== prevModelUrl) {
          pet.loadExternalModel(next.modelUrl)
        }

        if (opts.mergeHistory && Array.isArray(next.records)) {
          historyRecords = next.records
        }

        if (opts.animate && meritInitialized && !activeSpeechSegment) {
          const tokenDelta = Math.max(0, next.todayTokens - prevTokens)
          if (next.todayMerit > prevMerit) {
            animateMerit(next.todayMerit - prevMerit, tokenDelta)
          } else if (next.todayMerit < prevMerit) {
            animateMeritLoss(prevMerit - next.todayMerit, tokenDelta)
          }
        }

        lastMerit = next.todayMerit
        lastTokens = next.todayTokens
        meritInitialized = true

        // Enqueue any newly arrived LLM response speech segments
        if (opts.consumeSpeech && Array.isArray(next.speechQueue) && next.speechQueue.length > 0) {
          let addedNew = false
          for (const seg of next.speechQueue) {
            if (seg && typeof seg.seq === 'number' && seg.seq > lastSeenSpeechSeq && seg.text) {
              lastSeenSpeechSeq = seg.seq
              pendingSpeechQueue.push(seg)
              addedNew = true
            }
          }
          if (addedNew) {
            drainSpeechQueue()
          }
        } else if (!meritInitialized || lastSeenSpeechSeq === 0) {
          lastSeenSpeechSeq = Math.max(lastSeenSpeechSeq, next.ackedSpeechSeq || 0)
          if (next.currentSpeech?.text && !activeSpeechSegment) {
            displaySpeechText = next.currentSpeech.text
          }
        }

        updatePetView()
        if (next.todayMerit !== prevMerit) {
          void refreshHistory()
        }
      }

      const widgetOptions: WhaleWidgetOptions = {
        initialVoiceEnabled: prefs.voiceEnabled,
        initialSoundEnabled: prefs.soundEnabled,
        initialModelUrl: prefs.modelUrl,
        getAccompanimentIntervalMs: () =>
          serverState?.accompanimentIntervalMs ?? prefs.accompanimentIntervalMs ?? 1200,
        onSetAccompanimentIntervalMs: async (intervalMs: number) => {
          prefs.accompanimentIntervalMs = intervalMs
          savePrefs()
          try {
            const res = await apiRequest('/speech-ack', {
              method: 'POST',
              body: JSON.stringify({ accompanimentIntervalMs: intervalMs })
            })
            applyState(res.state, { animate: false })
            return true
          } catch {
            return false
          }
        },
        getModelUrl: () => serverState?.modelUrl || prefs.modelUrl || '',
        onSetModelUrl: async (url: string) => {
          prefs.modelUrl = url
          savePrefs()
          try {
            const res = await apiRequest('/speech-ack', {
              method: 'POST',
              body: JSON.stringify({ modelUrl: url })
            })
            applyState(res.state, { animate: false })
            return true
          } catch {
            return false
          }
        },
        getRecentSpeeches: () => recentSpeeches,
        onTestSpeak: (text: string) => {
          void (async () => {
            try {
              const res = await apiRequest('/speech-ack', {
                method: 'POST',
                body: JSON.stringify({ text })
              })
              applyState(res.state, { animate: false, consumeSpeech: true })
            } catch {
              // Offline fallback: directly enqueue locally
              lastSeenSpeechSeq += 1
              pendingSpeechQueue.push({
                seq: lastSeenSpeechSeq,
                text,
                createdAt: Date.now(),
                source: 'tool'
              })
              drainSpeechQueue()
            }
          })()
        },
        getTokensPerMerit: () => serverState?.tokensPerMerit ?? 10000,
        isTokensPerMeritSupported: () => (serverState?.apiVersion ?? 2) >= 2,
        onSetTokensPerMerit: async (value: number) => {
          try {
            const res = await apiRequest('/tokens-per-merit', {
              method: 'POST',
              body: JSON.stringify({ value })
            })
            applyState(res.state, { animate: false })
            return true
          } catch {
            pet.triggerKnockEffect('阈值保存失败')
            return false
          }
        },
        getMeritRecords: () => ({
          todayMerit: serverState?.todayMerit ?? 0,
          totalMerit: serverState?.totalMerit ?? 0,
          todayTokens: serverState?.todayTokens ?? 0,
          totalTokens: serverState?.totalTokens ?? 0,
          pendingTokens: serverState?.pendingTokens ?? 0,
          records: historyRecords
        }),
        onKnock: () => {
          audioPlayer.playWoodenSound()
          void (async () => {
            try {
              const res = await apiRequest('/knock', {
                method: 'POST',
                body: JSON.stringify({ count: 1 })
              })
              applyState(res.state, { animate: false })
            } catch {
              pet.triggerKnockEffect('服务端未响应')
            }
          })()
        },
        onToggleAuto: () => {
          if (accompanimentTimer !== null) {
            speechSynth.stop()
            pendingSpeechQueue.length = 0
            activeSpeechSegment = null
            pet.setSpeaking(false)
            stopAccompanimentRhythm()
            return
          }
          const action = serverState?.auto?.running ? 'stop' : 'start'
          void (async () => {
            try {
              const res = await apiRequest('/auto', {
                method: 'POST',
                body: JSON.stringify({ action })
              })
              applyState(res.state, { animate: false })
            } catch {
              pet.triggerKnockEffect('服务端未响应')
            }
          })()
        },
        onToggleVoice: (enabled: boolean) => {
          prefs.voiceEnabled = enabled
          speechSynth.enabled = enabled
          savePrefs()
          if (!enabled) {
            speechSynth.stop()
            activeSpeechSegment = null
            pet.setSpeaking(false)
            stopAccompanimentRhythm()
          }
        },
        onToggleSound: (enabled: boolean) => {
          prefs.soundEnabled = enabled
          audioPlayer.muted = !enabled
          savePrefs()
        },
        getSoundPresets: () => audioPlayer.getSoundPresets(),
        getCurrentSoundId: () => audioPlayer.getSoundType(),
        onSelectSound: (soundId: MuyuSoundType) => {
          audioPlayer.setSoundType(soundId)
          prefs.soundId = soundId
          savePrefs()
          audioPlayer.playWoodenSound(soundId)
        },
        getVoiceList: () => speechSynth.getAvailableVoiceOptions(),
        getCurrentVoiceId: () => speechSynth.getSelectedVoiceId(),
        getPersonas: () => speechSynth.getPersonas(),
        getCurrentPersonaId: () => speechSynth.getCurrentPersonaId(),
        onSelectPersona: (personaId: string) => {
          speechSynth.setPersona(personaId)
          prefs.personaId = personaId
          prefs.voiceId = speechSynth.getSelectedVoiceId()
          savePrefs()
        },
        onSelectVoice: (voiceId: string) => {
          speechSynth.setVoice(voiceId)
          prefs.voiceId = voiceId
          savePrefs()
        },
        onOpenMerit: () => {
          void refreshHistory()
        }
      }

      const pet = createWhaleFloatingPet(widgetOptions)

      async function poll(): Promise<void> {
        if (!alive || pollInFlight) return
        pollInFlight = true
        try {
          const next = await apiRequest(`/state?afterSeq=${lastSeenSpeechSeq}`)
          applyState(next, { animate: true, consumeSpeech: true })
        } catch {
        } finally {
          pollInFlight = false
        }
      }

      function startPolling(): void {
        if (pollTimer !== null || !alive) return
        pollTimer = setInterval(() => {
          void poll()
        }, POLL_INTERVAL_MS)
        void poll()
      }

      async function boot(): Promise<void> {
        try {
          const next = await apiRequest('/state?history=1')
          lastSeenSpeechSeq = next.ackedSpeechSeq ?? 0
          applyState(next, { animate: false, mergeHistory: true, consumeSpeech: true })
        } catch (error) {
          console.warn('[dsh-plugin-whale:client] 服务端暂不可用，稍后自动重试', error)
        }
        startPolling()
      }

      const mount = () => {
        pet.mount(document.body)
        updatePetView()
        void boot()
      }

      if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', mount, { once: true })
      } else {
        mount()
      }

      const cleanup = () => {
        alive = false
        if (pollTimer !== null) {
          clearInterval(pollTimer)
          pollTimer = null
        }
        stopAccompanimentRhythm()
        for (const timer of burstTimers) {
          clearTimeout(timer)
        }
        burstTimers.clear()
        speechSynth.dispose()
        audioPlayer.dispose()
        pet.unmount()
      }

      if (ctx && typeof ctx.effect === 'function') {
        ctx.effect(() => cleanup)
      }

      console.log('[dsh-plugin-whale:client] 3D 鲸鱼娘挂件已加载：LLM 即时回复播报与木鱼自动伴奏已启用')
    }
  }
}

export const name = 'whale-client'
export const inject = ['slots']
export function apply(ctx: any) {
  return buildExports().apply(ctx)
}

if (typeof window !== 'undefined' && (window as any).__ModuleLoader__) {
  ;(window as any).__ModuleLoader__.load({
    id: 'dsh-plugin-whale',
    factory: (require: any) => buildExports(require)
  })
}
