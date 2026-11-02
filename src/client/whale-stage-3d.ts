/**
 * Zero-dependency Canvas whale-maid companion with depth/parallax and a GLTF hook.
 * The layered quadratic contours follow the reference's chibi proportions,
 * muted blue curls, ivory lace, navy dress, and whale-tail silhouette.
 * Pointer look, breathing, blinking, speech, knock ripples, and the floating
 * plate share the existing stage lifecycle. This is a stylized 2.5D drawing;
 * loadExternalModel() can hand off to a registered <model-viewer> for a 3D mesh.
 */

export interface WhaleStage3DOptions {
  modelUrl?: string
}

interface Vec3 {
  x: number
  y: number
  z: number
}

interface ProjectedPoint {
  x: number
  y: number
  z: number
  scale: number
}

interface RippleWave {
  radius: number
  maxRadius: number
  alpha: number
  color: string
}

interface BubbleParticle {
  x: number
  y: number
  z: number
  r: number
  speed: number
  wobbleOffset: number
}

export class WhaleStage3D {
  private container: HTMLElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private externalSlot: HTMLElement | null = null
  private rafId: number | null = null
  private startTime: number = Date.now()
  private speaking: boolean = false
  private mouthLevel: number = 0
  private targetMouthLevel: number = 0
  private knockBounce: number = 0
  private lookYaw: number = 0
  private lookPitch: number = 0
  private modelUrl: string = ''
  private ripples: RippleWave[] = []
  private bubbles: BubbleParticle[] = []
  private customEventHandler: ((e: Event) => void) | null = null

  constructor(options: WhaleStage3DOptions = {}) {
    if (options.modelUrl) {
      this.modelUrl = options.modelUrl
    }
    for (let i = 0; i < 10; i++) {
      this.bubbles.push({
        x: (Math.random() - 0.5) * 1.8,
        y: (Math.random() - 0.5) * 1.4,
        z: (Math.random() - 0.5) * 1.2,
        r: 1.5 + Math.random() * 2.5,
        speed: 0.008 + Math.random() * 0.012,
        wobbleOffset: Math.random() * Math.PI * 2
      })
    }
  }

  public mount(container: HTMLElement): void {
    this.container = container
    const canvas = document.createElement('canvas')
    canvas.className = 'dsh-whale-3d-canvas'
    // Supersample the small widget so the lace and eye contours stay crisp.
    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const resolution = Math.min(3, Math.max(2, pixelRatio))
    canvas.width = Math.round(240 * resolution)
    canvas.height = Math.round(180 * resolution)
    canvas.style.cssText = 'width: 100%; height: 100%; display: block; pointer-events: none;'
    container.appendChild(canvas)
    this.canvas = canvas

    const extSlot = document.createElement('div')
    extSlot.className = 'dsh-whale-external-model-slot'
    extSlot.style.cssText = 'position: absolute; inset: 0; pointer-events: none; display: none; align-items: center; justify-content: center;'
    container.appendChild(extSlot)
    this.externalSlot = extSlot

    if (this.modelUrl) {
      this.loadExternalModel(this.modelUrl)
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this.customEventHandler = (e: Event) => {
        const detail = (e as CustomEvent)?.detail
        if (detail && typeof detail.url === 'string') {
          this.loadExternalModel(detail.url)
        }
      }
      window.addEventListener('dsh-whale:load-model', this.customEventHandler)
    }

    this.startLoop()
  }

  public setPointerLook(normX: number, normY: number): void {
    this.lookYaw = Math.max(-0.45, Math.min(0.45, normX * 0.4))
    this.lookPitch = Math.max(-0.24, Math.min(0.24, normY * 0.22))
  }

  public setSpeaking(active: boolean, level: number = 0.65): void {
    this.speaking = active
    this.targetMouthLevel = active ? Math.max(0.2, Math.min(1.0, level)) : 0
    if (active && this.ripples.length < 4) {
      this.ripples.push({
        radius: 0.35,
        maxRadius: 1.35,
        alpha: 0.72,
        color: 'rgba(104, 210, 255, '
      })
    }
  }

  public pulseSpeechSyllable(): void {
    if (!this.speaking) return
    this.targetMouthLevel = 0.45 + Math.random() * 0.55
  }

  public triggerKnockWave(): void {
    this.knockBounce = 1.0
    this.ripples.push({
      radius: 0.25,
      maxRadius: 1.55,
      alpha: 0.9,
      color: 'rgba(125, 226, 255, '
    })
  }

  /**
   * Load an external .glb / .gltf 3D model if provided. If modelUrl is empty, reverts to procedural 3D whale girl.
   */
  public loadExternalModel(url: string): void {
    this.modelUrl = (url || '').trim()
    if (!this.externalSlot || !this.canvas) return
    this.externalSlot.replaceChildren()

    if (!this.modelUrl) {
      this.externalSlot.style.display = 'none'
      this.canvas.style.opacity = '1'
      return
    }

    this.externalSlot.dataset.modelUrl = this.modelUrl
    // If <model-viewer> or custom Three.js loader is present in host page, mount it seamlessly
    if (typeof customElements !== 'undefined' && customElements.get?.('model-viewer')) {
      const viewer = document.createElement('model-viewer')
      viewer.setAttribute('src', this.modelUrl)
      viewer.setAttribute('autoplay', 'true')
      viewer.setAttribute('camera-controls', 'false')
      viewer.setAttribute('interaction-prompt', 'none')
      viewer.style.cssText = 'width: 100%; height: 100%; background: transparent;'
      this.externalSlot.appendChild(viewer)
      this.externalSlot.style.display = 'flex'
      this.canvas.style.opacity = '0.18'
    } else {
      // Keep procedural 3D stage visible and attach metadata badge so external GLTF loader scripts can hook in
      this.externalSlot.style.display = 'none'
      this.canvas.style.opacity = '1'
    }
  }

  public getModelUrl(): string {
    return this.modelUrl
  }

  private rotate3D(p: Vec3, pitch: number, yaw: number, roll: number): Vec3 {
    // Rotate around Y (yaw)
    const cosY = Math.cos(yaw)
    const sinY = Math.sin(yaw)
    const x1 = p.x * cosY + p.z * sinY
    const z1 = -p.x * sinY + p.z * cosY

    // Rotate around X (pitch)
    const cosX = Math.cos(pitch)
    const sinX = Math.sin(pitch)
    const y2 = p.y * cosX - z1 * sinX
    const z2 = p.y * sinX + z1 * cosX

    // Rotate around Z (roll)
    const cosZ = Math.cos(roll)
    const sinZ = Math.sin(roll)
    const x3 = x1 * cosZ - y2 * sinZ
    const y3 = x1 * sinZ + y2 * cosZ

    return { x: x3, y: y3, z: z2 }
  }

  private project(p: Vec3, width: number, height: number): ProjectedPoint {
    const fov = 3.2
    const cameraZ = 3.6
    const depth = Math.max(0.5, cameraZ - p.z)
    const scale = fov / depth
    const halfMin = Math.min(width, height) * 0.46
    return {
      x: width * 0.5 + p.x * scale * halfMin,
      y: height * 0.52 - p.y * scale * halfMin,
      z: p.z,
      scale
    }
  }

  private renderFrame(): void {
    if (!this.canvas) return
    const ctx = typeof this.canvas.getContext === 'function' ? this.canvas.getContext('2d') : null
    if (!ctx) return

    const w = 240
    const h = 180
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.save()
    ctx.scale(this.canvas.width / w, this.canvas.height / h)

    const elapsed = (Date.now() - this.startTime) * 0.001
    const breathY = Math.sin(elapsed * 2.4) * 0.038
    const idleYaw = Math.sin(elapsed * 1.25) * 0.08 + this.lookYaw
    const idlePitch = Math.cos(elapsed * 1.6) * 0.035 + this.lookPitch
    const idleRoll = Math.sin(elapsed * 1.05) * 0.032

    if (this.knockBounce > 0.001) {
      this.knockBounce *= 0.84
    } else {
      this.knockBounce = 0
    }

    if (this.speaking) {
      const wave = 0.35 + 0.65 * Math.abs(Math.sin(elapsed * 11.5))
      this.mouthLevel += (this.targetMouthLevel * wave - this.mouthLevel) * 0.35
    } else {
      this.mouthLevel *= 0.78
    }

    const centerY = 0.12 + breathY + this.knockBounce * 0.065

    // 1. Render 3D Horizontal Sonar Ripples beneath the Whale Girl
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]
      r.radius += 0.028
      r.alpha *= 0.93
      if (r.alpha <= 0.03 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1)
        continue
      }
      const ringCenter = this.project({ x: 0, y: -0.78, z: 0 }, w, h)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(
        ringCenter.x,
        ringCenter.y,
        r.radius * 58 * ringCenter.scale,
        r.radius * 19 * ringCenter.scale,
        0,
        0,
        Math.PI * 2
      )
      ctx.strokeStyle = `${r.color}${r.alpha.toFixed(3)})`
      ctx.lineWidth = 2.0
      ctx.stroke()
      ctx.restore()
    }

    // 2. Render Rising 3D Deep-Sea Bubbles
    for (const b of this.bubbles) {
      b.y += b.speed
      if (b.y > 0.95) {
        b.y = -0.85
      }
      const bx = b.x + Math.sin(elapsed * 2 + b.wobbleOffset) * 0.06
      const pt = this.project({ x: bx, y: b.y, z: b.z }, w, h)
      ctx.save()
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, Math.max(1, b.r * pt.scale), 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(148, 224, 255, 0.32)'
      ctx.fill()
      ctx.restore()
    }

    // Shared design coordinates keep the head, clothes, and hair in proportion.
    this.drawCharacter(ctx, w, h, elapsed, idleYaw, idlePitch, idleRoll)

    // 4. Floating 3D Brushed Stainless Steel Plate (不锈钢盘) beside the Whale Girl
    const platePulse = 1 + this.knockBounce * 0.32
    const plate3D = this.rotate3D(
      { x: -1.02, y: centerY - 0.26 + this.knockBounce * 0.12, z: 0.28 },
      idlePitch * 0.5,
      idleYaw * 0.5,
      -0.06
    )
    const rp = this.project(plate3D, w, h)
    const ps = rp.scale * 0.78
    ctx.save()
    ctx.translate(rp.x, rp.y)
    ctx.scale(platePulse, platePulse)

    // 4a. Stainless Steel Plate Under-base Shadow / Bevel Lip
    const baseMetalGrad = ctx.createLinearGradient(-15 * ps, 0, 15 * ps, 6 * ps)
    baseMetalGrad.addColorStop(0, '#475569')
    baseMetalGrad.addColorStop(0.45, '#CBD5E1')
    baseMetalGrad.addColorStop(0.75, '#64748B')
    baseMetalGrad.addColorStop(1, '#334155')
    ctx.fillStyle = baseMetalGrad
    ctx.beginPath()
    ctx.ellipse(0, 2.6 * ps, 14.5 * ps, 5.8 * ps, 0, 0, Math.PI * 2)
    ctx.fill()

    // 4b. Wide Flanged Brushed Stainless Steel Rim (银白金属拉丝宽折边盘沿)
    const rimGrad = ctx.createLinearGradient(-16 * ps, -5 * ps, 16 * ps, 5 * ps)
    rimGrad.addColorStop(0, '#94A3B8')
    rimGrad.addColorStop(0.25, '#F8FAFC')
    rimGrad.addColorStop(0.5, '#CBD5E1')
    rimGrad.addColorStop(0.78, '#FFFFFF')
    rimGrad.addColorStop(1, '#64748B')
    ctx.fillStyle = rimGrad
    ctx.beginPath()
    ctx.ellipse(0, 0, 15.8 * ps, 6.2 * ps, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 0.95 * ps
    ctx.stroke()

    // 4c. Recessed Inner Metallic Dish Well (内凹不锈钢盘底反光区)
    const wellGrad = ctx.createLinearGradient(-11 * ps, -3 * ps, 11 * ps, 4 * ps)
    wellGrad.addColorStop(0, '#64748B')
    wellGrad.addColorStop(0.38, '#E2E8F0')
    wellGrad.addColorStop(0.7, '#94A3B8')
    wellGrad.addColorStop(1, '#F1F5F9')
    ctx.fillStyle = wellGrad
    ctx.beginPath()
    ctx.ellipse(0, 0.4 * ps, 11.4 * ps, 4.1 * ps, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#64748B'
    ctx.lineWidth = 0.8 * ps
    ctx.stroke()

    // 4d. Specular Metallic Sheen Streak across the stainless steel plate
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = 1.2 * ps
    ctx.beginPath()
    ctx.moveTo(-8.5 * ps, -2.0 * ps)
    ctx.lineTo(-2.5 * ps, 1.8 * ps)
    ctx.moveTo(3.0 * ps, -1.8 * ps)
    ctx.lineTo(8.0 * ps, 1.4 * ps)
    ctx.stroke()
    ctx.restore()
    ctx.restore()
  }

  /** Cached quadratic contours, in the character's 300-unit design space. */
  private readonly contours = new Map<string, Array<string | number>>()

  private shape(
    ctx: CanvasRenderingContext2D,
    contour: string,
    fill: string | CanvasGradient = '',
    stroke: string = '#22283f',
    width: number = 1.05
  ): void {
    let commands = this.contours.get(contour)
    if (!commands) {
      commands = (contour.match(/[MLQZ]|-?\d*\.?\d+/g) || [])
        .map(token => /^[MLQZ]$/.test(token) ? token : Number(token))
      this.contours.set(contour, commands)
    }
    ctx.beginPath()
    for (let i = 0; i < commands.length;) {
      const command = commands[i++]
      if (command === 'Z') {
        ctx.closePath()
      } else {
        const x = commands[i++] as number
        const y = commands[i++] as number
        if (command === 'M') ctx.moveTo(x, y)
        if (command === 'L') ctx.lineTo(x, y)
        if (command === 'Q') {
          ctx.quadraticCurveTo(x, y, commands[i++] as number, commands[i++] as number)
        }
      }
    }
    if (fill) {
      ctx.fillStyle = fill
      ctx.fill()
    }
    if (stroke && width > 0) {
      ctx.strokeStyle = stroke
      ctx.lineWidth = width
      ctx.stroke()
    }
  }

  private oval(
    ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number,
    fill: string | CanvasGradient, stroke: string = '', angle: number = 0
  ): void {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
    if (stroke) {
      ctx.strokeStyle = stroke
      ctx.lineWidth = 0.85
      ctx.stroke()
    }
  }

  private gradient(ctx: CanvasRenderingContext2D, top: number, bottom: number, colors: string[]): CanvasGradient {
    const gradient = ctx.createLinearGradient(0, top, 0, bottom)
    colors.forEach((color, i) => gradient.addColorStop(i / (colors.length - 1), color))
    return gradient
  }

  private drawRibbon(ctx: CanvasRenderingContext2D, color: string, small: boolean = false): void {
    this.shape(ctx, 'M-1 0 Q-7-6-12-5 Q-14 0-11 6 Q-6 6-1 1 Z', color)
    this.shape(ctx, 'M1 0 Q7-6 12-5 Q14 0 11 6 Q6 6 1 1 Z', color)
    if (!small) {
      this.shape(ctx, 'M-3 3 L-9 13 L-3 11 L0 14 L3 3 Z', color)
      this.shape(ctx, 'M3 3 L9 13 L12 9 L14 10 L8 2 Z', color)
    }
    this.shape(ctx, 'M-8-2 L-2 0 L-8 3 M8-2 L2 0 L8 3', '', '#2e4771', 0.65)
    this.oval(ctx, 0, 0, 2.2, 3, '#e6bd76', '#856c59')
    this.oval(ctx, -0.5, -0.9, 0.7, 1, '#fff1c7')
  }

  private drawBackHair(ctx: CanvasRenderingContext2D, elapsed: number): void {
    const hair = this.gradient(ctx, -100, 116, ['#4d609f', '#536baa', '#78a0d8'])
    // The narrow looping strands are separate from the broad, scalloped hair mass.
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.scale(side, 1)
      ctx.translate(Math.sin(elapsed * 1.65 + side) * 1.2, 0)
      this.shape(ctx, 'M66-20 Q79 0 87 23 Q99 47 82 56 Q101 66 94 83 Q89 94 75 93 L76 88 Q93 83 88 71 Q85 64 76 59 L78 52 Q92 44 82 25 Q68 3 63-10 Z', hair)
      this.shape(ctx, 'M71 26 Q78 41 65 60 Q55 80 72 89 Q62 88 59 79 Q54 66 64 52 Q72 37 68 28 Z', '#688bc5', '#3c5186', 0.7)
      ctx.restore()
    }
    this.shape(ctx,
      'M0-101 Q-58-102-70-53 Q-76-30-73 6 Q-70 34-81 54 Q-91 70-81 81 Q-74 88-85 87 Q-90 86-92 81 Q-95 100-76 99 Q-83 110-68 111 Q-58 111-53 102 Q-49 121-34 113 Q-30 109-31 102 Q-17 122-3 114 Q5 122 17 114 Q27 107 24 98 Q35 121 49 111 Q55 106 53 99 Q66 116 80 107 Q89 103 91 94 Q77 104 77 90 Q96 83 86 65 Q75 48 76 18 Q79-20 70-56 Q58-101 0-101 Z', hair, '#232b47', 1.45)
    // Broad shaded locks and fine tapered partings, rather than uniform vertical stripes.
    this.shape(ctx, 'M-55-16 Q-63 34-53 55 Q-43 76-52 101 Q-37 91-43 69 Q-58 48-51 7 Z', '#455d99', '', 0)
    this.shape(ctx, 'M53-18 Q64 21 55 51 Q47 77 58 98 Q42 87 48 63 Q59 35 50 0 Z', '#4963a0', '', 0)
    this.shape(ctx, 'M-40-47 Q-49-3-40 35 Q-34 55-44 76 Q-49 93-37 107 M-16-62 Q-13-27-16 3 Q-22 32-10 51 M15-68 Q25-30 19 9 Q13 33 22 53 Q35 77 22 105 M49-43 Q57-8 48 32 Q42 51 51 69', '', '#3e558e', 0.95)
    this.shape(ctx, 'M-65 24 Q-61 43-68 57 Q-77 69-68 81 M64 28 Q65 45 72 59 Q80 74 72 82 M-8 55 Q-21 79-8 105', '', '#a2bce4', 0.65)
    for (const side of [-1, 1]) {
      this.oval(ctx, side * 44, -65, 4.1, 8.3, '#7d92c9', '', side * -0.5)
      this.oval(ctx, side * 50, -60, 2.6, 4.2, '#7d92c9', '', side * -0.5)
      this.oval(ctx, side * 35, -61, 1.3, 2.2, '#8ca0d2')
    }
  }

  private drawTail(ctx: CanvasRenderingContext2D, elapsed: number): void {
    ctx.save()
    ctx.translate(49, 105)
    ctx.scale(0.86, 0.95)
    ctx.rotate(Math.sin(elapsed * (this.speaking ? 3.8 : 1.8)) * 0.055)
    const tail = this.gradient(ctx, -35, 20, ['#4a69a5', '#72a9da', '#30457b'])
    this.shape(ctx, 'M-7 10 Q9 13 18-3 Q7-18 22-35 Q26-40 28-30 Q34-18 30-9 Q40-15 53-4 Q57-1 63-3 Q53 14 31 13 Q15 24-7 18 Z', tail, '#242e4c', 1.4)
    this.shape(ctx, 'M13 9 Q23 3 23-29 M19 3 Q13-12 23-31 M24 0 Q31-18 26-29 M20 9 Q39 9 55 0 M23 6 Q37-2 50-3 M25 11 Q45 13 56 4', '', '#35598d', 0.8)
    this.shape(ctx, 'M19 6 Q23-6 24-24 M28 6 Q42 3 49 0', '', '#a2c4e7', 0.6)
    ctx.restore()
  }

  private drawDress(ctx: CanvasRenderingContext2D, elapsed: number, front: boolean): void {
    const navy = this.gradient(ctx, 27, 122, ['#303d6c', '#344779', '#263458'])
    // Short legs and rounded Mary Janes below the petticoat.
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(side * 16, 0)
      this.shape(ctx, 'M-10 117 L10 117 L9 134 Q0 139-9 134 Z', '#ffe8de')
      this.shape(ctx, 'M-10 127 Q0 131 10 127 L9 136 L-9 136 Z', '#f5eff7', '#656487', 0.75)
      this.shape(ctx, 'M-10 132 Q0 136 10 132 L10 139 Q9 146-2 145 Q-12 146-12 140 Z', '#293762', '#20273e', 1.15)
      if (front) {
        this.oval(ctx, -1, 135.5, 6.5, 2, '#eeeefa')
        this.shape(ctx, 'M-10 134 Q0 139 10 134', '', '#b1bbda', 1.2)
        this.oval(ctx, side * 7, 136, 1.2, 1.6, '#e3c48b')
        this.oval(ctx, -3, 142, 2, 0.65, '#91a6d1')
      }
      ctx.restore()
    }
    // Each lace pleat has an ivory face, lavender fold, and a small gold stitch.
    for (let i = 0; i < 15; i++) {
      const x = (i - 7) * 8.25
      const y = 115 + 9 * (1 - Math.pow(x / 64, 2))
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(-x * 0.004)
      this.shape(ctx, 'M-4-8 L4-8 Q5-2 6 3 Q4 8 0 7 Q-5 8-6 3 Z', '#fbf3ec', '#716785', 0.8)
      this.shape(ctx, 'M-3-6 L-2 2 Q0 4 1 1 L2-6 Z', '#d4cbe1', '', 0)
      this.shape(ctx, 'M-4 4 Q-3 6-2 4 Q0 7 2 4 Q4 6 5 3', '', '#c5a576', 0.65)
      ctx.restore()
    }
    this.shape(ctx, 'M-24 60 Q-38 76-59 106 L-65 114 Q-39 125 0 124 Q39 125 65 114 L59 106 Q38 76 24 60 Z', navy, '#22283f', 1.4)
    this.shape(ctx, 'M-21 70 Q-35 91-44 113 L-30 116 Q-27 91-17 77 Z M21 70 Q35 91 44 113 L30 116 Q27 91 17 77 Z', '#27365f', '', 0)
    this.shape(ctx, 'M-61 112 Q0 132 61 112 M-58 108 Q0 127 58 108', '', '#bd9d6b', 0.7)
    // Fine curling gold vines follow the curved hem, with alternating leaf pairs.
    for (let i = -5; i <= 5; i++) {
      ctx.save()
      ctx.translate(i * 9.7, 111 - i * i * 0.3)
      ctx.rotate(-i * 0.052)
      this.shape(ctx, 'M-5 1 Q-2 4 1 1 Q5-3 2-5 Q-2-6-1-2 Q0 0 2-2 M-2 2 Q-5-2-6-3 M3 1 Q6-2 6-4', '', '#d6b57c', 0.68)
      this.shape(ctx, 'M-4-1 Q-8-2-7-5 Q-3-4-4-1 M4-1 Q3-5 6-6 Q8-3 4-1', '#cfac73', '', 0)
      ctx.restore()
    }
    if (!front) return

    // Bodice has visible height between the chin and waistband.
    this.shape(ctx, 'M-20 28 Q-32 33-29 45 L-25 64 L25 64 L29 45 Q32 33 20 28 Z', navy)
    this.shape(ctx, 'M-13 27 L13 27 L12 54 L-12 54 Z', '#f6f0f0', '#b0a2bd', 0.7)
    this.shape(ctx, 'M-7 32 L-7 50 M0 33 L0 52 M7 32 L7 50', '', '#c4b8d1', 0.65)
    for (const y of [41, 48]) this.oval(ctx, 0, y, 0.9, 1.1, '#3d4367')
    this.shape(ctx, 'M-14 52 L14 52 L15 64 L-15 64 Z', '#2b365f')
    for (const x of [-8, 8]) {
      for (const y of [56, 61]) this.oval(ctx, x, y, 0.85, 1, '#e3d5b9')
    }
    // Ruffled shoulder straps.
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.scale(side, 1)
      this.shape(ctx, 'M17 29 Q24 28 23 35 L20 61 L16 62 Z', '#fff8f1', '#aa9bb8', 0.7)
      for (let i = 0; i < 6; i++) {
        ctx.save()
        ctx.translate(22 - i * 0.5, 32 + i * 4.6)
        this.shape(ctx, 'M-1-3 Q5-4 4 0 Q6 3 0 4 L-2 1 Z', '#f9f3f0', '#b1a3bd', 0.55)
        this.shape(ctx, 'M1-1 L3 1', '', '#c8bbd1', 0.6)
        ctx.restore()
      }
      ctx.restore()
    }
    this.shape(ctx, 'M-24 62 Q0 65 24 62 L25 67 Q0 70-25 67 Z', '#fff8f2', '#b2a1b8', 0.8)
    // Apron ruffle follows a U, without a ring of circles across the chest.
    for (let i = 0; i < 15; i++) {
      const a = Math.PI * i / 14
      ctx.save()
      ctx.translate(27 * Math.cos(a), 76 + 27 * Math.sin(a))
      ctx.rotate(a - Math.PI / 2)
      this.shape(ctx, 'M-3-3 L3-3 Q6 0 4 3 Q2 6-1 4 Q-5 5-5 1 Z', '#fff7ee', '#bcacc1', 0.65)
      this.shape(ctx, 'M0-2 L1 3', '', '#d1c4d4', 0.6)
      ctx.restore()
    }
    this.shape(ctx, 'M-23 67 Q0 70 23 67 Q25 73 27 80 Q28 99 0 103 Q-28 99-27 80 Q-25 73-23 67 Z', '#fff8f1', '#b6a6bc', 0.85)
    this.shape(ctx, 'M-23 79 Q-27 96 0 100 Q27 96 23 79', '', '#d1b986', 0.65)
    this.shape(ctx, 'M-17 69 Q-21 74-18 78 M17 69 Q21 74 18 78', '', '#c3b7cc', 1)
    // Whale emblem: round nose at left, forked fluke at right, striped belly.
    ctx.save()
    ctx.translate(0, 88)
    this.shape(ctx, 'M-12 2 Q-15-5-7-8 Q2-11 7-4 Q11 3 15-5 Q18-5 19-8 Q20-3 17 0 Q14 0 13 4 Q6 12-6 9 Q-12 8-12 2 Z', '#508bc8', '#4b77ab', 0.6)
    this.shape(ctx, 'M-12 1 Q-5-1 1 9 Q-9 11-12 1 Z', '#c9e5ef', '', 0)
    this.shape(ctx, 'M-10 2 L-7 8 M-7 2 L-3 9 M-4 4 L0 9', '', '#6b9cc3', 0.55)
    this.shape(ctx, 'M3 3 Q4 8 9 7', '', '#3e6d9d', 0.8)
    this.oval(ctx, -7.5, -4.5, 1, 1, '#fbf8ee')
    this.oval(ctx, -1, -13, 1.2, 2.2, '#5e9bcf')
    this.oval(ctx, -4.4, -11, 1.2, 1.8, '#5e9bcf', '', -0.6)
    this.oval(ctx, 2.4, -11, 1.2, 1.8, '#5e9bcf', '', 0.6)
    ctx.restore()
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(side * 34, 111)
      ctx.scale(0.65, 0.65)
      this.shape(ctx, 'M-2 2 L-9 19 L-2 17 L3 20 L4 2 Z M3 2 L10 18 L14 13 L18 13 L7 0 Z', '#29385e', '#bd9e6d', 0.9)
      this.drawRibbon(ctx, '#dbbb86', true)
      ctx.restore()
    }
    // Relaxed long sleeves sit beside the apron and end in small hands.
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.scale(side, 1)
      ctx.translate(27, 32)
      ctx.rotate(-0.35 - Math.sin(elapsed * 2.1) * 0.018)
      this.shape(ctx, 'M-2 1 Q8-5 11 7 Q13 18 9 22 L12 40 Q2 44-8 39 L-5 25 Q-11 11-2 1 Z', navy)
      this.shape(ctx, 'M-4 19 Q1 24 5 21 M-4 30 Q3 34 9 31', '', '#202c51', 0.8)
      this.shape(ctx, 'M-7 35 Q2 39 11 35 L12 40 Q2 44-8 39 Z', '#29365e')
      this.shape(ctx, 'M-6 36 Q2 40 10 36', '', '#ddbf86', 0.8)
      this.shape(ctx, 'M-7 40 Q-11 45-5 46 Q-2 49 1 46 Q5 49 8 45 Q13 45 12 41 Z', '#fff4ec', '#b7a4bc', 0.75)
      this.shape(ctx, 'M-5 46 L8 46 Q10 52 4 54 Q-1 56-5 52 Q-11 49-7 46 Q-5 45-3 49', '#fff0e4', '#715569', 0.8)
      this.shape(ctx, 'M-1 49 L0 52 M3 49 L4 52', '', '#b48e94', 0.6)
      ctx.restore()
    }
    this.shape(ctx, 'M-8 25 L0 31 L8 25 L13 29 L7 36 L0 32 L-7 36 L-13 29 Z', '#fff7ef')
    ctx.save()
    ctx.translate(0, 32)
    this.drawRibbon(ctx, '#303b64')
    this.oval(ctx, 0, 0, 3.4, 4.2, '#dbb77f', '#77657a')
    this.oval(ctx, 0, -0.2, 2.1, 2.9, '#629fce', '#334c73')
    this.oval(ctx, -0.7, -1.2, 0.6, 0.9, '#d6f0fa')
    ctx.restore()
  }

  private drawHeadband(ctx: CanvasRenderingContext2D, turn: number): void {
    ctx.save()
    ctx.translate(turn * 3, 0)
    ctx.scale(1 - Math.abs(turn) * 0.25, 1)
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (0.04 + i * 0.92 / 12)
      ctx.save()
      ctx.translate(70 * Math.cos(a), -25 - 76 * Math.sin(a))
      ctx.rotate(Math.PI / 2 - a)
      this.shape(ctx, 'M-9 4 Q-12-1-8-5 Q-9-10-3-10 Q0-14 4-10 Q10-11 10-5 Q14-1 9 4 Z', '#fbf4f1', '#39334b', 0.95)
      this.shape(ctx, 'M-7 2 Q-9-2-6-4 Q-7-7-2-7 Q0-10 3-7 Q8-8 7-4 Q11-1 7 2', '', '#b9a9c4', 0.55)
      this.oval(ctx, 0, 0, 3, 3.5, '#c4b5d2')
      this.oval(ctx, 0.2, 0.8, 1.8, 2.1, '#fff9f1')
      this.shape(ctx, 'M-5-3 L-4-5 M4-4 L5-6', '', '#c1b4ca', 0.6)
      ctx.restore()
    }
    this.shape(ctx, 'M-70-29 Q-64-103 0-104 Q64-103 70-29 L67-28 Q60-98 0-99 Q-60-98-67-28 Z', '#303e70', '#22263e', 1.1)
    ctx.restore()
  }

  private drawFin(ctx: CanvasRenderingContext2D, side: number, elapsed: number): void {
    ctx.save()
    ctx.translate(side * 68, -30)
    ctx.scale(side, 1)
    ctx.rotate(Math.sin(elapsed * 1.6 + side) * 0.018)
    this.shape(ctx, 'M0 3 Q13 13 32 20 Q27 29 20 26 Q16 30 11 27 Q5 29 1 23 Q-5 20 0 3 Z', '#e5e8f5', '#252e4b', 1.05)
    this.shape(ctx, 'M4 17 Q8 25 13 25 M10 18 Q16 25 20 25 M16 19 Q23 24 27 23', '', '#a7b3d2', 0.75)
    this.shape(ctx, 'M-1-4 Q10 10 23 14 Q29 17 33 17 Q35 23 22 23 Q15 24 11 21 Q5 23 1 17 Q-3 13-1-4 Z', '#354879', '#242b43', 1.15)
    ctx.translate(0, -5)
    ctx.scale(0.85, 1)
    this.drawRibbon(ctx, '#69a4d5')
    ctx.restore()
  }

  private drawEyes(ctx: CanvasRenderingContext2D, elapsed: number, turn: number, profile: boolean): void {
    const blinkTime = elapsed % 4.7
    const blink = blinkTime > 4.52 ? Math.sin((blinkTime - 4.52) / 0.18 * Math.PI) : 0
    for (const side of [-1, 1]) {
      const farEye = side * turn < 0
      if (profile && farEye) continue
      ctx.save()
      ctx.translate(side * 25 + turn * 2, 0)
      ctx.scale(farEye ? 1 - Math.abs(turn) * 0.46 : profile ? 0.72 : 1, 1)
      this.oval(ctx, side * 3, 14.2, 6.4, 1.8, 'rgba(234,154,164,0.23)')
      this.shape(ctx, 'M-8-21 Q-1-25 7-21', '', '#5b4b65', 0.9)
      if (blink > 0.85) {
        this.shape(ctx, 'M-10-1 Q0 4 10-1', '', '#2c2535', 1.8)
      } else {
        ctx.save()
        ctx.translate(0, -11 * blink)
        ctx.scale(1, 1 - blink * 0.9)
        this.shape(ctx, 'M-10-9 Q0-15 10-9 Q12-2 9 9 Q6 14 0 14 Q-9 14-10 6 Z', '#fffaf5', '#8b697b', 0.65)
        const iris = this.gradient(ctx, -10, 14, ['#263869', '#3e71b1', '#87c5eb'])
        this.oval(ctx, 0, 1.4, 8, 12, iris, '#425b8c')
        this.oval(ctx, 0, -0.1, 2.4, 5, '#243659')
        this.oval(ctx, 0, 11.1, 4.1, 2.6, '#c3e5ef')
        this.oval(ctx, -3.2, -5.4, 2.3, 2.7, '#fffdf9')
        this.oval(ctx, 3.7, -3.8, 1, 1.3, '#cceaf8')
        this.shape(ctx, 'M-12-8 Q-6-15 2-13 Q8-13 11-9 L10-6 Q3-12-7-8 Z', '#292330', '', 0)
        this.shape(ctx, side < 0 ? 'M-9-9 L-14-13 L-12-7 L-8-6 Z' : 'M9-9 L14-13 L12-7 L8-6 Z', '#292330', '', 0)
        ctx.restore()
      }
      ctx.restore()
    }
  }

  private drawHead(ctx: CanvasRenderingContext2D, elapsed: number, turn: number, front: boolean): void {
    const hair = this.gradient(ctx, -100, 40, ['#4d5e9b', '#5266a7', '#6481bb'])
    if (front) this.oval(ctx, 0, -40, 72, 62, hair, '#252c45')
    this.drawHeadband(ctx, turn)
    // A single broad, open ahoge, slightly to the left of the crown.
    ctx.save()
    ctx.translate(turn * 5, 0)
    this.shape(ctx, 'M-1-109 Q7-140-13-137 Q-39-136-46-115 Q-49-109-45-108 Q-40-126-21-130 Q-4-135-1-109 Z', hair, '#242b43', 1.2)
    this.shape(ctx, 'M-42-120 Q-28-135-13-134', '', '#8ea2d7', 1)
    ctx.restore()
    if (!front) return
    // Broad cheeks stay beneath the pointed fringe and the separate cheek bobs.
    ctx.save()
    ctx.translate(turn * 11, 0)
    ctx.scale(1 - Math.abs(turn) * 0.29, 1)
    const skin = this.gradient(ctx, -40, 26, ['#fff6eb', '#fff1e7', '#ffe9df'])
    this.oval(ctx, -54, 6, 6.5, 9, skin, '#9a7781')
    this.oval(ctx, 54, 6, 6.5, 9, skin, '#9a7781')
    this.shape(ctx, 'M-52-43 Q0-60 52-43 Q62-15 54 9 Q48 26 0 27 Q-48 26-54 9 Q-62-15-52-43 Z', skin, '#745e72', 1.05)
    this.drawEyes(ctx, elapsed, turn, false)
    if (this.mouthLevel > 0.08) {
      const mouthX = turn * 2
      this.oval(ctx, mouthX, 18.5, 1.5 + this.mouthLevel * 1.2, 0.7 + this.mouthLevel * 2.5, '#92546a')
      this.oval(ctx, mouthX, 19.4, 1.1, 0.6, '#e79aa6')
    } else {
      this.shape(ctx, 'M-1.5 18.5 Q0 17 1.5 18.5', '', '#a17680', 0.8)
    }
    ctx.restore()
    // Short curled locks rest on the shoulders, separately from the cheek bobs.
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.scale(side, 1)
      this.shape(ctx, 'M45 12 Q59 18 55 34 Q48 46 57 47 Q49 54 41 47 Q34 41 40 31 Q43 24 38 19 Z', this.gradient(ctx, 11, 53, ['#465f9f', '#75addf']), '#293957', 1.05)
      this.shape(ctx, 'M48 21 Q52 31 44 38 Q40 44 47 47', '', '#a0c6ea', 0.65)
      ctx.restore()
    }
    ctx.save()
    ctx.translate(turn * 7, 0)
    ctx.scale(1 - Math.abs(turn) * 0.13, 1)
    this.shape(ctx,
      'M0-99 Q-57-101-69-49 Q-77-21-68 8 Q-64 24-44 24 L-39 17 Q-54 15-52-5 Q-47-34-25-59 Q-27-25-9-7 L-12-13 Q-2-3 10-2 Q26-26 23-58 Q39-37 43-14 Q53 0 48 13 L42 23 Q65 27 71 6 Q78-15 66-56 Q51-96 0-99 Z', hair, '#242b43', 1.25)
    this.shape(ctx, 'M-6-88 Q-25-91-43-69 Q-60-42-60-12 Q-62 8-52 17 M8-88 Q31-92 49-61 Q64-33 59 2 Q58 14 49 19 M-15-77 Q-24-53-21-30 M18-78 Q24-55 22-35', '', '#344475', 0.9)
    this.shape(ctx, 'M-8-90 Q-19-96-30-81 Q-17-90-8-90 M8-90 Q17-96 27-82 Q16-91 8-90', '#303d69', '', 0)
    // Broken, vertical anime glints describe the crown without a plastic shine.
    for (const [x, y, rx, ry, angle] of [
      [-48, -66, 3.7, 7.1, 0.55], [-43, -61, 3, 4.7, 0.45],
      [-29, -58, 1.5, 3.2, 0.25], [-9, -57, 3.7, 7.2, -0.1],
      [-3, -55, 2.4, 4.5, 0.1], [5, -56, 1.6, 3.2, 0],
      [28, -62, 2, 4, -0.25], [44, -66, 3.3, 6.5, -0.5], [49, -61, 2.1, 3.5, -0.4]
    ]) this.oval(ctx, x, y, rx, ry, '#8398cf', '', angle)
    ctx.restore()
  }

  private drawProfile(ctx: CanvasRenderingContext2D, elapsed: number, turn: number): void {
    ctx.save()
    ctx.scale(Math.sign(turn), 1)
    // The side silhouette has a forward cheek and apron, with the long hair behind.
    const hair = this.gradient(ctx, -101, 45, ['#4d5e9b', '#536aa9', '#76a0d3'])
    const skin = this.gradient(ctx, -40, 28, ['#fff6eb', '#ffede2'])
    this.shape(ctx, 'M10 116 L30 116 L28 136 L10 136 Z', '#fff1e8')
    this.shape(ctx, 'M9 128 Q19 132 29 128 L28 136 L9 136 Z', '#f4edf4', '#7d718e', 0.8)
    this.shape(ctx, 'M8 134 Q22 137 30 133 Q38 138 33 142 Q28 147 9 144 Q3 143 8 134 Z', '#2d3b66')
    this.oval(ctx, 27, 136.5, 4.5, 1.7, '#e8eafa')
    // Far edge of the petticoat and the deep side of the bell skirt.
    for (let i = 0; i < 10; i++) {
      ctx.save()
      ctx.translate(-23 + i * 7, 120 + Math.sin(i / 9 * Math.PI) * 5)
      this.shape(ctx, 'M-4-7 L4-7 L5 4 Q0 8-5 4 Z', '#faf2ed', '#7b6b86', 0.7)
      this.shape(ctx, 'M-3 3 Q0 7 3 3', '', '#c5a576', 0.7)
      ctx.restore()
    }
    this.shape(ctx, 'M-2 59 L25 60 Q36 85 48 113 Q13 130-32 116 Q-18 76-2 59 Z', '#324370', '#252c46', 1.3)
    this.shape(ctx, 'M-28 113 Q11 128 45 111 M-26 109 Q9 125 43 108', '', '#cfaf7b', 0.7)
    for (let i = 0; i < 7; i++) {
      ctx.save()
      ctx.translate(-22 + i * 9, 111 + Math.sin(i / 6 * Math.PI) * 5)
      this.shape(ctx, 'M-4 0 Q0 4 3 0 Q5-5 1-4 Q-2-4 0-1 M-1 1 Q-5-1-4-4', '', '#d2b17b', 0.7)
      ctx.restore()
    }
    this.shape(ctx, 'M7 26 Q28 26 34 37 L29 65 L-1 65 L-4 42 Z', '#303e6a')
    this.shape(ctx, 'M27 29 L35 30 L33 53 L26 51 Z', '#fff5ee', '#aa9fb9', 0.7)
    this.shape(ctx, 'M-1 61 L29 62 L31 67 L0 68 Z', '#fbf3ef')
    this.shape(ctx, 'M30 67 Q42 87 45 100 Q35 112 16 107 Q22 85 24 69 Z', '#f8f1ed', '#b7a7bf', 0.9)
    for (let i = 0; i < 8; i++) {
      this.oval(ctx, 18 + i * 3.5, 107 - i * 0.95, 2.6, 2.5, '#fff5ed', '#b7a7bf')
    }
    ctx.save()
    ctx.translate(34, 92)
    ctx.scale(0.6, 0.8)
    this.shape(ctx, 'M-12 2 Q-14-8-5-8 Q3-8 6-2 Q10 3 16-5 Q17 2 10 5 Q2 13-9 8 Z', '#508bc8', '', 0)
    this.shape(ctx, 'M-11 2 Q-5 1 1 9 Q-9 10-11 2 Z', '#c9e5ef', '', 0)
    this.oval(ctx, -2, -12, 1.4, 2.1, '#619bce')
    ctx.restore()
    this.shape(ctx, 'M6 31 Q22 28 24 43 L20 64 L24 77 Q15 81 4 77 L5 60 Q-2 41 6 31 Z', '#303f6c')
    this.shape(ctx, 'M5 73 Q15 76 23 73 M6 76 Q15 79 23 76', '', '#ceb280', 0.8)
    this.shape(ctx, 'M5 78 Q3 83 9 84 Q14 88 18 84 Q24 85 24 79 Z', '#fcf2eb', '#b7a7bf', 0.8)
    this.shape(ctx, 'M9 84 L21 84 Q23 91 15 92 Q7 90 9 84 Z', '#ffede3', '#9a7781', 0.7)
    // Only a narrow slice of the neck bow is visible in profile.
    this.shape(ctx, 'M29 30 L37 27 L36 39 L30 35 L27 42 L25 38 Z', '#2b365b')
    this.oval(ctx, 36, 31, 1.8, 3, '#d6b77c')
    this.oval(ctx, 36.3, 31, 1, 2, '#77add7')

    this.shape(ctx, 'M12-43 Q46-44 57-24 L59-1 Q68 5 64 8 L61 10 Q65 21 52 25 Q30 30 14 20 Q2 9 7-12 Z', skin, '#6d5870', 1.05)
    ctx.save()
    ctx.translate(21, 0)
    this.drawEyes(ctx, elapsed, 1, true)
    ctx.restore()
    if (this.mouthLevel > 0.08) {
      this.oval(ctx, 61, 17.5, 1.1, 0.7 + this.mouthLevel * 2, '#a06b7d')
    } else {
      this.shape(ctx, 'M59 17 Q61 16 62 18', '', '#9d7580', 0.8)
    }
    this.oval(ctx, 12, 9, 6, 8, skin, '#947082')
    // The forelock falls toward the eye; the longer cheek lock curls back to the collar.
    this.shape(ctx, 'M-25-97 Q20-106 45-80 Q54-59 54-29 Q58-11 65-8 L61-4 Q51-4 46-17 Q43-28 42-39 Q42-17 34-5 Q26 12 21 23 Q34 24 38 16 Q36 35 19 39 Q15 44 9 44 Q13 30 8 20 Q-3 4-1-15 Q-16-35-25-97 Z', hair, '#242b43', 1.25)
    this.shape(ctx, 'M4-89 Q29-79 35-49 Q39-21 24 7 Q13 23 19 30 M-10-83 Q8-71 10-43 Q7-9 15 12', '', '#344777', 0.9)
    this.oval(ctx, 25, -61, 3, 7, '#8398cf', '', -0.4)
    this.oval(ctx, 30, -57, 2, 4, '#8398cf', '', -0.4)
    this.oval(ctx, 4, -67, 2, 4, '#8398cf')
    for (let i = 0; i < 8; i++) {
      const t = i / 7
      ctx.save()
      ctx.translate(-9 - 13 * Math.sin(t * Math.PI), -102 + t * 75)
      ctx.rotate(-0.3)
      this.shape(ctx, 'M-4-5 Q-11-6-10 0 Q-14 5-8 8 Q-4 11 0 7 L3 0 Z', '#fbf3ef', '#6b597a', 0.85)
      this.oval(ctx, -6, 1, 2.4, 3, '#c6b8d3')
      this.oval(ctx, -5.6, 1.4, 1.4, 1.8, '#fff8f1')
      ctx.restore()
    }
    this.shape(ctx, 'M-8-103 Q-26-78-20-51 L-12-27 L-8-27 Q-21-67-4-100 Z', '#2f3c6c')
    ctx.save()
    ctx.translate(56, 3)
    this.drawFin(ctx, -1, elapsed)
    ctx.restore()
    this.shape(ctx, 'M-8-108 Q1-137-20-134 Q-43-130-46-110 Q-49-105-45-105 Q-39-124-23-128 Q-10-132-8-108 Z', hair, '#242b43', 1.2)
    ctx.restore()
  }

  private drawCharacter(
    ctx: CanvasRenderingContext2D, width: number, height: number,
    elapsed: number, yaw: number, pitch: number, roll: number
  ): void {
    const turn = Math.sin(yaw)
    const front = Math.cos(yaw) >= 0
    const profile = Math.abs(turn) > 0.72
    const unit = Math.min(width / 300, height / 300)
    const bounce = 1 + this.knockBounce * 0.025
    ctx.save()
    ctx.translate(width * 0.51, height * 0.49 + Math.sin(elapsed * 2.4) * 0.9 - this.knockBounce * 1.8)
    ctx.scale(unit * bounce, unit * (1 - this.knockBounce * 0.018))
    ctx.rotate(roll * 0.55)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const backHair = () => {
      ctx.save()
      ctx.translate(-turn * (profile ? 30 : 13), pitch * 8)
      ctx.scale(profile ? 0.63 : 1 - Math.abs(turn) * 0.14, 1)
      this.drawBackHair(ctx, elapsed)
      ctx.restore()
    }
    if (front) backHair()
    if (profile) {
      if (!front) backHair()
      this.drawTail(ctx, elapsed)
      this.drawProfile(ctx, elapsed, turn)
      ctx.restore()
      return
    }
    if (front) this.drawTail(ctx, elapsed)
    ctx.save()
    ctx.translate(turn * 4, 0)
    ctx.scale(1 - Math.abs(turn) * 0.28, 1)
    this.drawDress(ctx, elapsed, front)
    ctx.restore()
    if (!front) backHair()
    ctx.save()
    ctx.translate(turn * 3, pitch * 15)
    // Fins sit behind the cheek locks; their bows remain above the hairline.
    for (const side of [-1, 1]) {
      this.drawFin(ctx, side, elapsed)
    }
    this.drawHead(ctx, elapsed, turn, front)
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(side * 68, -35)
      ctx.scale(0.85, 1)
      this.drawRibbon(ctx, '#69a4d5')
      ctx.restore()
    }
    ctx.restore()
    if (!front) this.drawTail(ctx, elapsed)
    if (this.speaking || this.knockBounce > 0.15) {
      const lift = this.speaking ? Math.sin(elapsed * 8) * 2 : this.knockBounce * 3
      ctx.save()
      ctx.translate(turn * 6, -112 - lift)
      this.shape(ctx, 'M-2 0 Q-6-10-15-6 M2 0 Q6-10 15-6', '', 'rgba(147,211,238,0.75)', 1.1)
      ctx.restore()
    }
    ctx.restore()
  }

  private startLoop(): void {
    if (this.rafId !== null) return
    const raf =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 33) as unknown as number

    const step = () => {
      this.renderFrame()
      if (this.canvas) {
        this.rafId = raf(step)
      }
    }
    this.rafId = raf(step)
  }

  public dispose(): void {
    if (this.rafId !== null) {
      if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(this.rafId)
      } else {
        clearTimeout(this.rafId as unknown as ReturnType<typeof setTimeout>)
      }
      this.rafId = null
    }
    if (typeof window !== 'undefined' && this.customEventHandler && typeof window.removeEventListener === 'function') {
      window.removeEventListener('dsh-whale:load-model', this.customEventHandler)
      this.customEventHandler = null
    }
    if (this.externalSlot) {
      this.externalSlot.remove()
      this.externalSlot = null
    }
    if (this.canvas) {
      this.canvas.remove()
      this.canvas = null
    }
    this.container = null
  }
}
