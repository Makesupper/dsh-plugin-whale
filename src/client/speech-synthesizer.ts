/**
 * Cross-platform LLM Response Speech Synthesizer (Web Speech API)
 * Features:
 * - Reads real-time LLM response sentences using browser Web Speech API.
 * - Supports curated female voice personas (萌系鲸鱼娘、元气甜心、知性御姐、空灵海妖、温柔大姐姐、粤语少女等).
 * - Emits speaking state & boundary callbacks to drive 3D Whale lip-sync and wooden-fish accompaniment.
 * - Clean listener lifecycle and fallback timeout safety.
 */

export interface FemaleVoicePreset {
  id: string
  name: string
  persona: string
  tag: string
  description: string
  rate: number
  pitch: number
  volume: number
  matchKeywords: string[]
}

export const FEMALE_VOICE_PERSONAS: FemaleVoicePreset[] = [
  {
    id: 'persona_kawaii',
    name: '萌系鲸鱼娘 (小沫)',
    persona: '萌妹萝莉',
    tag: '治愈软萌',
    description: '奶萌软润，声线清脆甜度满分，撒娇治愈感十足',
    rate: 1.05,
    pitch: 1.35,
    volume: 1.0,
    matchKeywords: ['xiaoxiao', '晓晓', 'tingting', '婷婷', 'huihui', 'female', 'zh-cn']
  },
  {
    id: 'persona_sweet',
    name: '元气甜心 (桃桃)',
    persona: '活力少女',
    tag: '元气满满',
    description: '灵动欢快，朝气蓬勃，如破晓海面上跃起的初阳',
    rate: 1.0,
    pitch: 1.18,
    volume: 1.0,
    matchKeywords: ['tingting', '婷婷', 'xiaoxiao', 'female', 'zh-cn']
  },
  {
    id: 'persona_gentle',
    name: '温柔大姐姐 (芷晴)',
    persona: '温婉治愈',
    tag: '轻柔抚慰',
    description: '语调温润细腻，柔声细语，静心安神平复浮躁',
    rate: 0.88,
    pitch: 0.98,
    volume: 1.0,
    matchKeywords: ['shelley', 'meijia', '美佳', 'female', 'zh-cn']
  },
  {
    id: 'persona_mature',
    name: '知性御姐 (洛宁)',
    persona: '沉着从容',
    tag: '深沉优雅',
    description: '从容端庄，逻辑清晰富有质感，掌控感拉满',
    rate: 0.92,
    pitch: 0.92,
    volume: 1.0,
    matchKeywords: ['yaoyao', '瑶瑶', 'kangkang', 'female', 'zh-cn']
  },
  {
    id: 'persona_siren',
    name: '空灵海妖 (塞壬)',
    persona: '幽远神秘',
    tag: '深海空灵',
    description: '音色飘渺悠远，微带吟唱感，仿佛穿透深海重洋的呼唤',
    rate: 0.84,
    pitch: 1.15,
    volume: 1.0,
    matchKeywords: ['xiaoxiao', 'sinji', 'female', 'zh-cn']
  },
  {
    id: 'persona_cantonese_girl',
    name: '粤语灵动少女 (阿雅)',
    persona: '港风粤韵',
    tag: '清甜粤语',
    description: '地道粤语声线，灵动俏皮，地道好听有韵味',
    rate: 0.95,
    pitch: 1.16,
    volume: 1.0,
    matchKeywords: ['sinji', '善怡', 'cantonese', 'hong kong', 'zh-hk', 'yue']
  }
]

export interface VoiceOption {
  id: string
  name: string
  lang: string
  description: string
  isCantonese: boolean
  isFemale: boolean
  personaId?: string
}

export interface SpeechPreferences {
  rate?: number
  pitch?: number
  volume?: number
  voiceId?: string
  personaId?: string
}

function clamp(val: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback
  return Math.min(max, Math.max(min, val))
}

export class WhaleSpeechSynthesizer {
  private synth: SpeechSynthesis | null = null
  private voice: SpeechSynthesisVoice | null = null
  private selectedVoiceId: string = ''
  private currentPersonaId: string = 'persona_kawaii'
  private voicesChangedHandler: (() => void) | null = null
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null
  private activeSpeaking: boolean = false

  public enabled: boolean = true
  public rate: number = 1.0
  public pitch: number = 1.2
  public volume: number = 1.0

  public onSpeakStart?: (text: string) => void
  public onSpeakBoundary?: (charIndex: number) => void
  public onSentenceEnd?: () => void
  public onVoicesLoaded?: (voices: VoiceOption[], currentId: string) => void

  constructor(prefs?: SpeechPreferences) {
    if (prefs) {
      if (prefs.personaId) {
        this.setPersona(prefs.personaId)
      } else {
        this.rate = clamp(prefs.rate, 1.0, 0.1, 2.0)
        this.pitch = clamp(prefs.pitch, 1.2, 0.1, 2.0)
        this.volume = clamp(prefs.volume, 1.0, 0.0, 1.0)
      }
      if (prefs.voiceId) {
        this.selectedVoiceId = prefs.voiceId
      }
    } else {
      this.setPersona('persona_kawaii')
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis
      this.initVoice()
      this.voicesChangedHandler = () => this.initVoice()
      if (typeof this.synth.addEventListener === 'function') {
        this.synth.addEventListener('voiceschanged', this.voicesChangedHandler)
      }
    }
  }

  public getPersonas(): FemaleVoicePreset[] {
    return FEMALE_VOICE_PERSONAS
  }

  public getCurrentPersonaId(): string {
    return this.currentPersonaId
  }

  public setPersona(personaId: string): boolean {
    const found = FEMALE_VOICE_PERSONAS.find(p => p.id === personaId)
    if (found) {
      this.currentPersonaId = personaId
      this.rate = found.rate
      this.pitch = found.pitch
      this.volume = found.volume
      this.pickBestVoiceForPersona(found)
      return true
    }
    return false
  }

  private pickBestVoiceForPersona(persona: FemaleVoicePreset) {
    if (!this.synth) return
    const voices = this.synth.getVoices()
    if (!voices || voices.length === 0) return

    for (const kw of persona.matchKeywords) {
      const match = voices.find(v => {
        const full = (v.name + " " + v.lang).toLowerCase()
        return full.includes(kw.toLowerCase())
      })
      if (match) {
        this.voice = match
        this.selectedVoiceId = match.name + "__" + match.lang;
        return;
      }
    }
  }

  private initVoice() {
    if (!this.synth) return
    const voices = this.synth.getVoices()
    if (!voices || voices.length === 0) return

    if (this.selectedVoiceId) {
      const found = voices.find(v =>  (v.name + "__" + v.lang) === this.selectedVoiceId)
      if (found) {
        this.voice = found
        this.notifyVoicesLoaded()
        return
      }
    }

    const currentPersona = FEMALE_VOICE_PERSONAS.find(p => p.id === this.currentPersonaId)
    if (currentPersona) {
      this.pickBestVoiceForPersona(currentPersona)
      if (this.voice) {
        this.notifyVoicesLoaded()
        return
      }
    }

    // Prefer Mandarin female -> Cantonese female -> any Chinese -> fallback
    const mandarinFemale = voices.find(v => (v.lang.includes('zh') || v.lang.includes('CN')) && !this.checkIsCantonese(v) && this.checkIsFemale(v))
    const cantoneseFemale = voices.find(v => this.checkIsCantonese(v) && this.checkIsFemale(v))
    const anyChinese = voices.find(v => v.lang.includes('zh'))

    this.voice = mandarinFemale || cantoneseFemale || anyChinese || voices[0] || null
    if (this.voice) {
      this.selectedVoiceId = this.voice.name + "__" + this.voice.lang;
    }
    this.notifyVoicesLoaded()
  }

  public checkIsCantonese(v: SpeechSynthesisVoice): boolean {
    const lang = (v.lang || '').toLowerCase()
    const name = (v.name || '').toLowerCase()
    return (
      lang === 'zh-hk' ||
      lang.startsWith('zh-hk') ||
      lang === 'yue' ||
      lang.startsWith('yue') ||
      lang === 'zh-mo' ||
      name.includes('sinji') ||
      name.includes('cantonese') ||
      name.includes('hong kong') ||
      name.includes('香港') ||
      name.includes('粤语') ||
      name.includes('廣東')
    )
  }

  public checkIsFemale(v: SpeechSynthesisVoice): boolean {
    const name = (v.name || '').toLowerCase()
    return (
      name.includes('xiaoxiao') ||
      name.includes('tingting') ||
      name.includes('sinji') ||
      name.includes('meijia') ||
      name.includes('shelley') ||
      name.includes('sandy') ||
      name.includes('flo') ||
      name.includes('female') ||
      name.includes('女') ||
      name.includes('晓晓') ||
      name.includes('婷婷') ||
      name.includes('善怡') ||
      name.includes('美佳') ||
      name.includes('瑶瑶') ||
      name.includes('小沫') ||
      name.includes('桃桃') ||
      name.includes('芷晴') ||
      name.includes('洛宁')
    )
  }

  private notifyVoicesLoaded() {
    if (this.onVoicesLoaded) {
      this.onVoicesLoaded(this.getAvailableVoiceOptions(), this.selectedVoiceId)
    }
  }

  public getAvailableVoiceOptions(): VoiceOption[] {
    if (!this.synth) return []
    const voices = this.synth.getVoices()

    const chineseVoices = voices.filter(v => {
      const lang = (v.lang || '').toLowerCase()
      const name = (v.name || '').toLowerCase()
      return lang.includes('zh') || lang.includes('yue') || name.includes('cantonese') || name.includes('hong kong')
    })

    const list = chineseVoices.length > 0 ? chineseVoices : voices

    return list.map(v => {
      const isCantonese = this.checkIsCantonese(v)
      const isFemale = this.checkIsFemale(v)
      let desc = v.lang
      if (isCantonese) {
        desc = '粤语 / 广东话'
      } else if (v.lang.toLowerCase().includes('cn')) {
        desc = '普通话 (中国大陆)'
      } else if (v.lang.toLowerCase().includes('tw')) {
        desc = '国语 (中国台湾)'
      }

      return {
        id: (v.name + "__" + v.lang),
        name: v.name,
        lang: v.lang,
        description: desc + (isFemale ? " · 女声" : ""),
        isCantonese,
        isFemale
      }
    })
  }

  public setVoice(voiceId: string): boolean {
    if (!this.synth) return false
    const voices = this.synth.getVoices()
    const found = voices.find(v => (v.name + "__" + v.lang) === voiceId)
    if (found) {
      this.voice = found
      this.selectedVoiceId = voiceId
      return true
    }
    return false
  }

  public getSelectedVoiceId(): string {
    return this.selectedVoiceId
  }

  public isSpeaking(): boolean {
    if (this.activeSpeaking) return true
    return !!(this.synth && (this.synth.speaking || this.synth.pending))
  }

  public speakSentence(text: string, onEnd?: () => void) {
    if (!this.enabled || !this.synth || !text.trim()) {
      this.activeSpeaking = false
      if (onEnd) onEnd()
      return
    }

    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer)
      this.fallbackTimer = null
    }
    this.synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    if (this.voice) {
      utterance.voice = this.voice
      utterance.lang = this.voice.lang || 'zh-CN'
    } else {
      utterance.lang = 'zh-CN'
    }
    utterance.rate = clamp(this.rate, 1.0, 0.1, 2.0)
    utterance.pitch = clamp(this.pitch, 1.2, 0.1, 2.0)
    utterance.volume = clamp(this.volume, 1.0, 0.0, 1.0)

    this.activeSpeaking = true
    this.onSpeakStart?.(text)

    let finished = false
    const done = () => {
      if (finished) return
      finished = true
      this.activeSpeaking = false
      if (this.fallbackTimer) {
        clearTimeout(this.fallbackTimer)
        this.fallbackTimer = null
      }
      if (onEnd) onEnd()
      if (this.onSentenceEnd) this.onSentenceEnd()
    }

    utterance.onboundary = (event: any) => {
      this.onSpeakBoundary?.(Number(event?.charIndex) || 0)
    }
    utterance.onend = done
    utterance.onerror = done

    const expectedDurationMs = Math.max(1800, (text.length / 3.2) * 1000 + 1200)
    this.fallbackTimer = setTimeout(() => {
      if (!finished) {
        done()
      }
    }, expectedDurationMs)

    this.synth.speak(utterance)
  }

  public stop() {
    this.activeSpeaking = false
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer)
      this.fallbackTimer = null
    }
    if (this.synth) {
      this.synth.cancel()
    }
  }

  public dispose() {
    this.stop()
    if (this.synth && this.voicesChangedHandler && typeof this.synth.removeEventListener === 'function') {
      this.synth.removeEventListener('voiceschanged', this.voicesChangedHandler)
    }
    this.voicesChangedHandler = null
  }
}
