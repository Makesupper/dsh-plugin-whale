/**
 * In-browser Web Audio synthesized & preset player for Whale Companion.
 * Supports whale song acoustics and traditional temple resonance:
 * - whale_deep (蓝鲸深鸣): deep low-frequency ocean resonance and vocal glides
 * - whale_song (座头长歌): soaring ethereal melodic whale arch with shimmer
 * - whale_echo (虎鲸清越): crisp high-frequency chirp and underwater sonar echo
 * - whale_52hz (52Hz 低语): organic 52Hz sine hum and rhythmic ocean pulse
 * - sandalwood (紫檀沉音): deep temple wood resonance
 * - whitewood  (清脆白木): bright crisp wooden block
 * - bell       (古刹清磬): bronze singing bowl harmonics
 */

import type { MuyuSoundType } from '../types.js'

export interface SoundPresetOption {
  id: MuyuSoundType
  name: string
  description: string
}

export const CLIENT_SOUND_PRESETS: SoundPresetOption[] = [
  {
    id: 'whale_deep',
    name: '蓝鲸深鸣',
    description: '深沉悠远，低频潜游，宛若深海古老巨灵的召唤'
  },
  {
    id: 'whale_song',
    name: '座头长歌',
    description: '空灵宛转，旋律起伏，如穿透透光海层的优美圣歌'
  },
  {
    id: 'whale_echo',
    name: '虎鲸清越',
    description: '轻快清亮，声呐脉冲，水晶般晶莹透亮的回响'
  },
  {
    id: 'whale_52hz',
    name: '52Hz 低语',
    description: '纯净共鸣，孤独疗愈，直抵心灵深处的温柔频率'
  },
  {
    id: 'sandalwood',
    name: '紫檀沉音',
    description: '浑厚沉稳，声如古庙老木，定心凝神'
  },
  {
    id: 'whitewood',
    name: '清脆白木',
    description: '轻盈通透，高频脆爽，提神醒脑'
  },
  {
    id: 'bell',
    name: '古刹清磬',
    description: '悠扬致远，余音绕梁，震荡心扉'
  }
]

export class MuyuWebAudioPlayer {
  private ctx: AudioContext | null = null
  private currentSound: MuyuSoundType = 'whale_deep'
  public volume: number = 1.0
  /** Independent from the speech voice toggle: mute only the percussion/whale sound. */
  public muted: boolean = false

  constructor(initialSound: MuyuSoundType = 'whale_deep') {
    this.currentSound = initialSound
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  public setSoundType(type: MuyuSoundType) {
    if (CLIENT_SOUND_PRESETS.some(p => p.id === type)) {
      this.currentSound = type
    }
  }

  public getSoundType(): MuyuSoundType {
    return this.currentSound
  }

  public getSoundPresets(): SoundPresetOption[] {
    return CLIENT_SOUND_PRESETS
  }

  /**
   * Synthesize real physical whale calls, wooden fish or temple bell percussion using Web Audio oscillators & filters
   */
  public playWoodenSound(overrideType?: MuyuSoundType) {
    if (this.muted) return
    this.initContext()
    if (!this.ctx) return

    const soundType = overrideType || this.currentSound
    const now = this.ctx.currentTime
    const vol = Math.min(1.0, Math.max(0.0, this.volume))
    if (vol <= 0) return

    // 1. 蓝鲸深鸣 (Blue Whale deep resonant vocal dive)
    if (soundType === 'whale_deep') {
      const osc1 = this.ctx.createOscillator()
      const oscSub = this.ctx.createOscillator()
      const gain1 = this.ctx.createGain()
      const gainSub = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()

      osc1.type = 'sine'
      oscSub.type = 'sine'

      // Pitch glide: 155Hz down to 105Hz with gentle swell
      osc1.frequency.setValueAtTime(155, now)
      osc1.frequency.exponentialRampToValueAtTime(105, now + 1.2)
      oscSub.frequency.setValueAtTime(77.5, now)
      oscSub.frequency.exponentialRampToValueAtTime(52.5, now + 1.2)

      // Low-pass filter simulating oceanic acoustic absorption
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(380, now)
      filter.frequency.linearRampToValueAtTime(260, now + 1.2)

      gain1.gain.setValueAtTime(0.001, now)
      gain1.gain.linearRampToValueAtTime(0.75 * vol, now + 0.25)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.6)

      gainSub.gain.setValueAtTime(0.001, now)
      gainSub.gain.linearRampToValueAtTime(0.45 * vol, now + 0.3)
      gainSub.gain.exponentialRampToValueAtTime(0.001, now + 1.7)

      osc1.connect(filter)
      oscSub.connect(filter)
      filter.connect(gain1)
      gain1.connect(this.ctx.destination)

      osc1.start(now)
      oscSub.start(now)
      osc1.stop(now + 1.7)
      oscSub.stop(now + 1.7)
      return
    }

    // 2. 座头长歌 (Humpback whale soaring melodic arch)
    if (soundType === 'whale_song') {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'triangle'
      // Swoop from 280Hz up to 480Hz, then gracefully glide down to 260Hz
      osc.frequency.setValueAtTime(280, now)
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.5)
      osc.frequency.exponentialRampToValueAtTime(260, now + 1.4)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.68 * vol, now + 0.2)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 1.55)
      return
    }

    // 3. 虎鲸清越 (Orca echolocating chirp and sonar pulse)
    if (soundType === 'whale_echo') {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      // Fast high sweep down
      osc.frequency.setValueAtTime(780, now)
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.25)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.85 * vol, now + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

      osc.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      osc.stop(now + 0.5)

      // Echo tail
      const echoOsc = this.ctx.createOscillator()
      const echoGain = this.ctx.createGain()
      echoOsc.type = 'sine'
      echoOsc.frequency.setValueAtTime(680, now + 0.12)
      echoOsc.frequency.exponentialRampToValueAtTime(390, now + 0.35)

      echoGain.gain.setValueAtTime(0.001, now)
      echoGain.gain.setValueAtTime(0.001, now + 0.12)
      echoGain.gain.linearRampToValueAtTime(0.35 * vol, now + 0.16)
      echoGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65)

      echoOsc.connect(echoGain)
      echoGain.connect(this.ctx.destination)

      echoOsc.start(now + 0.12)
      echoOsc.stop(now + 0.7)
      return
    }

    // 4. 52Hz 低语 (Pure 52Hz mysterious low-frequency pulse)
    if (soundType === 'whale_52hz') {
      const osc = this.ctx.createOscillator()
      const oscHar = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(52, now)
      osc.frequency.linearRampToValueAtTime(54, now + 0.8)
      osc.frequency.linearRampToValueAtTime(51.5, now + 1.8)

      oscHar.type = 'sine'
      oscHar.frequency.setValueAtTime(104, now)
      oscHar.frequency.linearRampToValueAtTime(103, now + 1.8)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.85 * vol, now + 0.35)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.9)

      osc.connect(gain)
      oscHar.connect(gain)
      gain.connect(this.ctx.destination)

      osc.start(now)
      oscHar.start(now)
      osc.stop(now + 1.95)
      oscHar.stop(now + 1.95)
      return
    }

    // 5. 古刹清磬 (Bronze singing bowl)
    if (soundType === 'bell') {
      const fundamental = 528
      const partials = [1.0, 2.756, 5.404]
      const gains = [0.65, 0.25, 0.12]
      const decays = [1.45, 0.85, 0.45]

      partials.forEach((ratio, idx) => {
        if (!this.ctx) return
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(fundamental * ratio, now)

        const peak = gains[idx] * vol
        const decay = decays[idx]
        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(peak, now + 0.008)
        gain.gain.exponentialRampToValueAtTime(0.0008, now + decay)

        osc.connect(gain)
        gain.connect(this.ctx.destination)
        osc.start(now)
        osc.stop(now + decay + 0.05)
      })
      return
    }

    // 6. 木鱼腔体共鸣 (sandalwood vs whitewood)
    const isWhitewood = soundType === 'whitewood'
    const baseFreq = isWhitewood ? 340 : 210
    const decayTime = isWhitewood ? 0.24 : 0.36
    const qFactor = isWhitewood ? 6.5 : 4.2

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const filter = this.ctx.createBiquadFilter()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(baseFreq * 2.15, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.035)

    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(baseFreq * (isWhitewood ? 1.8 : 1.45), now)
    filter.Q.setValueAtTime(qFactor, now)

    gain.gain.setValueAtTime(0.85 * vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + decayTime + 0.03)
  }

  public dispose() {
    if (this.ctx) {
      const ctxToClose = this.ctx
      this.ctx = null
      try {
        ctxToClose.close().catch(() => {})
      } catch {}
    }
  }
}
