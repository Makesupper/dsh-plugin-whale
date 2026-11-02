import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { MeritStorage, resolveDefaultStorageFile } from '../lib/services/merit-storage.js'
import {
  LlmSpeechQueueService,
  sanitizeLlmTextForSpeech,
  splitTextIntoSpeechSentences,
  extractFinalConclusionText,
  isIntermediateToolCallEvent,
  extractAssistantTextFromEvent
} from '../lib/services/llm-speech-service.js'
import { WhaleService } from '../lib/services/whale-service.js'
import { createWhaleTools } from '../lib/tools/index.js'
import { apply, Config } from '../lib/index.js'
import { buildWhaleState, createWhaleRouteHandlers, registerWhaleClientApi } from '../lib/services/client-api.js'
import { WhaleStage3D } from '../lib/client/whale-stage-3d.js'
import { WhaleSpeechSynthesizer } from '../lib/client/speech-synthesizer.js'
import { soundLibrary } from '../lib/data/sounds.js'
import { formatWhaleWeight, formatWeightDelta } from '../lib/format.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let testCounter = 0

function makeUniqueTmpFile(prefix = 'whale_test') {
  testCounter += 1
  return path.join(
    os.tmpdir(),
    `${prefix}_${process.pid}_${Date.now()}_${testCounter}_${Math.random().toString(36).slice(2, 8)}.json`
  )
}

function cleanupTmpFiles(baseFile) {
  const dir = path.dirname(baseFile)
  const baseName = path.basename(baseFile)
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir)) {
    if (
      entry === baseName ||
      entry === `${baseName}.lock` ||
      entry === `${baseName}.state.json` ||
      entry.startsWith(`${baseName}.corrupt-`) ||
      entry.startsWith(`${baseName}.tmp-`) ||
      entry.startsWith(`${baseName}.state.json.tmp-`)
    ) {
      try {
        fs.unlinkSync(path.join(dir, entry))
      } catch {}
    }
  }
}

function makeMockResponse() {
  let resolveDone
  const done = new Promise(resolve => {
    resolveDone = resolve
  })
  return {
    statusCode: 0,
    headers: {},
    body: '',
    done,
    writeHead(status, headers) {
      this.statusCode = status
      this.headers = headers || {}
    },
    end(body) {
      this.body = body || ''
      resolveDone()
    }
  }
}

function makeMockRequest(method, url, body, extraHeaders = {}) {
  const listeners = { data: [], end: [], error: [] }
  const req = {
    method,
    url,
    headers: { host: '127.0.0.1:12345', ...extraHeaders },
    on(event, callback) {
      ;(listeners[event] ||= []).push(callback)
      return req
    },
    destroy() {}
  }
  setTimeout(() => {
    if (body !== undefined) {
      const buf = Buffer.from(body)
      for (const callback of listeners.data) callback(buf)
    }
    for (const callback of listeners.end) callback()
  }, 0)
  return req
}

async function invokeRoute(handler, method, url, body, extraHeaders = {}) {
  const headers = body !== undefined ? { 'content-type': 'application/json', ...extraHeaders } : { ...extraHeaders }
  const req = makeMockRequest(method, url, body, headers)
  const res = makeMockResponse()
  await handler(req, res)
  await res.done
  return {
    status: res.statusCode,
    headers: res.headers,
    json: res.body ? JSON.parse(res.body) : null
  }
}

test('LlmSpeechQueueService - Markdown 清洗、代码块过滤与自然句切分', () => {
  const raw = [
    '### 深度求索报告',
    '<think>这里是中间推理思考过程，不应该被朗读。</think>',
    '你好！这是第一句回复。',
    '```ts',
    'const secret = 42;',
    '```',
    '查看 [官方文档](https://deepseek.com/docs) 获取更多说明！最后一句圆满结束。'
  ].join('\n')

  const cleaned = sanitizeLlmTextForSpeech(raw)
  assert.equal(cleaned.includes('const secret'), false)
  assert.equal(cleaned.includes('中间推理思考过程'), false)
  assert.equal(cleaned.includes('https://'), false)
  assert.equal(cleaned.includes('官方文档'), true)

  const finalConclusion = extractFinalConclusionText(raw)
  assert.equal(finalConclusion, '查看 官方文档 获取更多说明！最后一句圆满结束。')

  const queue = new LlmSpeechQueueService()
  const added = queue.enqueueText(raw, 'llm')
  assert.equal(added.length, 2)
  assert.equal(added[0].text, '查看 官方文档 获取更多说明！')
  assert.equal(added[1].text, '最后一句圆满结束。')

  // 当新的最终回复到来时，自动覆盖未播报的旧句子，只读最新最终结果
  const added2 = queue.enqueueText('中间分析段落。\n\n这是最新的最终结论！', 'llm')
  assert.equal(added2.length, 1)
  const pendingNow = queue.getPendingSegments()
  assert.equal(pendingNow.length, 1)
  assert.equal(pendingNow[0].text, '这是最新的最终结论！')

  // 超过 140 字且无逗号的长句必须按 140 字分片完整保留，不丢失后半段
  const longUnpunctuated = '鲸'.repeat(200)
  const longChunks = splitTextIntoSpeechSentences(longUnpunctuated)
  assert.equal(longChunks.length, 2)
  assert.equal(longChunks[0].length, 140)
  assert.equal(longChunks[1].length, 60)
  assert.equal(longChunks.join(''), longUnpunctuated)
})

test('extractAssistantTextFromEvent - 忽略中间工具调用过程，只提取最终回复结论', () => {
  assert.equal(
    extractAssistantTextFromEvent({
      type: 'assistant/message',
      data: { content: '直接字符串回复。' }
    }),
    '直接字符串回复。'
  )

  // 包含 tool_use 或 stopReason=tool_calls 的中间过程消息应直接忽略，不朗读
  assert.equal(
    isIntermediateToolCallEvent({
      type: 'assistant/message',
      data: {
        stopReason: 'tool_use',
        content: [{ type: 'text', text: '我先查一下文件...' }, { type: 'tool_use', name: 'read_file' }]
      }
    }),
    true
  )
  assert.equal(
    extractAssistantTextFromEvent({
      type: 'assistant/message',
      data: {
        stopReason: 'tool_use',
        content: [{ type: 'text', text: '我先查一下文件...' }, { type: 'tool_use', name: 'read_file' }]
      }
    }),
    ''
  )

  // 多段落最终消息只提取最后一段结论
  assert.equal(
    extractAssistantTextFromEvent({
      type: 'assistant/message',
      data: {
        message: {
          content: [
            { type: 'thinking', text: '内部思考不朗读' },
            { type: 'text', text: '第一段中间推导过程。' },
            { type: 'text', text: '最终结论已经生成完毕！' }
          ]
        }
      }
    }),
    '最终结论已经生成完毕！'
  )
})

test('WhaleService & DSH Tools - session/event 自动提取 LLM 文本与 Token 功德记账', async () => {
  const tmpFile = makeUniqueTmpFile('whale_service')
  try {
    const registeredTools = []
    const eventListeners = {}
    const routes = []
    const cordisCtx = {
      services: {},
      provide(k, v) {
        this.services[k] = v
      },
      on(evt, cb) {
        eventListeners[evt] = cb
        return () => { delete eventListeners[evt] }
      },
      effect(fn) {
        return fn()
      },
      inject(_names, callback) {
        callback({
          ...this,
          webServer: {
            getOrigin: () => 'http://127.0.0.1:12345',
            register(route) {
              routes.push(route)
              return () => {}
            }
          }
        })
      },
      tools: {
        register(tool) {
          registeredTools.push(tool)
          return () => {}
        }
      }
    }

    apply(cordisCtx, { storagePath: tmpFile, tokensPerMerit: 10000 })
    const whale = cordisCtx.services.whale
    assert.ok(whale)
    assert.equal(registeredTools.length, 6)
    assert.deepEqual(
      routes.map(r => r.path),
      ['/dsh-whale/state', '/dsh-whale/knock', '/dsh-whale/auto', '/dsh-whale/speech-ack', '/dsh-whale/tokens-per-merit']
    )

    // 触发 assistant/message：既有 LLM 回复文本，又有 Token 用量
    eventListeners['session/event']({}, {
      type: 'assistant/message',
      data: {
        content: '深海鲸鱼娘收到指令！开始为你播报第一条即时消息。',
        usage: {
          inputTokens: 15000,
          outputTokens: 6000
        }
      }
    })

    assert.equal(whale.getLatestSpeechSeq(), 2)
    const pending = whale.getPendingSpeechSegments(0)
    assert.equal(pending.length, 2)
    assert.equal(pending[0].text, '深海鲸鱼娘收到指令！')
    assert.equal(pending[1].text, '开始为你播报第一条即时消息。')
    assert.equal(whale.getMeritStats().todayMerit, 2)
    assert.equal(whale.getMeritStats().todayTokens, 21000)

    // 测试 whale_speak 工具主动播报
    const speakTool = registeredTools.find(t => t.name === 'whale_speak')
    const speakRes = await speakTool.execute({ text: '这是工具主动触发的语音播报。', knockCount: 3 })
    assert.equal(speakRes.enqueuedCount, 1)
    assert.equal(speakRes.todayMerit, 5)

    // 验证单次 Token 超过 108 次功德时完整计入功德且不漏记（例如 step=1, tokens=109 -> +109 功德）
    whale.setTokensPerMerit(1)
    const freshTmp = makeUniqueTmpFile('whale_step1')
    try {
      const step1Whale = new WhaleService(cordisCtx, { storagePath: freshTmp, tokensPerMerit: 1 })
      const burst = step1Whale.consumeTokens(109)
      assert.equal(burst.tokensConsumed, 109)
      assert.equal(burst.meritGained, 109)
      assert.equal(burst.knocksTriggered, 108) // 动画/单次敲击结果封顶 108，但功德完整 +109
      assert.equal(burst.pendingTokens, 0)
      assert.equal(step1Whale.getMeritStats().todayMerit, 109)
    } finally {
      cleanupTmpFiles(freshTmp)
    }
  } finally {
    cleanupTmpFiles(tmpFile)
  }
})

test('Client API & 3D Stage - /dsh-whale 路由与 WhaleStage3D 生命周期校验', async () => {
  const tmpFile = makeUniqueTmpFile('whale_api')
  try {
    const fakeCtx = {
      provide: () => {},
      effect: fn => fn(),
      tools: { register: () => () => {} }
    }
    const whale = new WhaleService(fakeCtx, { storagePath: tmpFile, tokensPerMerit: 10000 })
    whale.enqueueLlmSpeech('第一句测试。第二句测试！', 'llm')

    const webServer = {
      getOrigin: () => 'http://127.0.0.1:12345',
      register: () => () => {}
    }
    const handlers = createWhaleRouteHandlers(whale, webServer)

    const state1 = await invokeRoute(handlers.state, 'GET', '/dsh-whale/state?afterSeq=0')
    assert.equal(state1.status, 200)
    assert.equal(state1.json.speechSeq, 2)
    assert.equal(state1.json.speechQueue.length, 2)

    const ackRes = await invokeRoute(
      handlers.speechAck,
      'POST',
      '/dsh-whale/speech-ack',
      JSON.stringify({ seq: 1, accompanimentIntervalMs: 900, modelUrl: '/models/whale.glb' })
    )
    assert.equal(ackRes.status, 200)
    assert.equal(ackRes.json.state.ackedSpeechSeq, 1)
    assert.equal(ackRes.json.state.accompanimentIntervalMs, 900)
    assert.equal(ackRes.json.state.modelUrl, '/models/whale.glb')

    const state2 = await invokeRoute(handlers.state, 'GET', '/dsh-whale/state?afterSeq=1')
    assert.equal(state2.json.speechQueue.length, 1)
    assert.equal(state2.json.speechQueue[0].seq, 2)
  } finally {
    cleanupTmpFiles(tmpFile)
  }
})

test('客户端打包产物 lib/client.js 驱动 LLM 语音播报与木鱼自动伴奏联动', async () => {
  const clientJsPath = path.resolve(__dirname, '../lib/client.js')
  const clientCode = fs.readFileSync(clientJsPath, 'utf-8')
  assert.equal(/(^|\n)\s*import\s+/.test(clientCode), false)
  assert.equal(/(^|\n)\s*export\s+/.test(clientCode), false)
  assert.equal(clientCode.includes("const API_BASE = '/dsh-whale'"), true)

  const created = []
  function makeCtx2d() {
    return {
      clearRect() {},
      save() {},
      restore() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      quadraticCurveTo() {},
      bezierCurveTo() {},
      arc() {},
      ellipse() {},
      fill() {},
      stroke() {},
      translate() {},
      rotate() {},
      scale() {},
      createLinearGradient() { return { addColorStop() {} } },
      createRadialGradient() { return { addColorStop() {} } }
    }
  }
  function makeEl(tag = 'div') {
    const el = {
      tagName: String(tag).toUpperCase(),
      id: '',
      className: '',
      type: '',
      title: '',
      textContent: '',
      width: 240,
      height: 180,
      children: [],
      style: {},
      dataset: {},
      _listeners: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false } },
      appendChild(child) { this.children.push(child); return child },
      replaceChildren() { this.children.length = 0 },
      addEventListener(type, callback) {
        ;(this._listeners[type] ||= []).push(callback)
      },
      removeEventListener() {},
      setAttribute() {},
      getAttribute() { return null },
      getBoundingClientRect() { return { left: 0, top: 0, width: 144, height: 108, right: 144, bottom: 108 } },
      getContext() { return makeCtx2d() },
      remove() {}
    }
    created.push(el)
    return el
  }

  const spokenUtterances = []
  class MockSpeechSynthesisUtterance {
    constructor(text) {
      this.text = text
      this.rate = 1
      this.pitch = 1
      this.volume = 1
      this.onend = null
      this.onerror = null
      this.onboundary = null
    }
  }
  const speechSynthesisStub = {
    speaking: false,
    pending: false,
    getVoices() {
      return [{ name: 'Xiaoxiao', lang: 'zh-CN' }]
    },
    addEventListener() {},
    removeEventListener() {},
    cancel() {
      this.speaking = false
    },
    speak(utterance) {
      this.speaking = true
      spokenUtterances.push(utterance.text)
      setTimeout(() => {
        if (utterance.onboundary) utterance.onboundary({ charIndex: 1 })
      }, 40)
      setTimeout(() => {
        this.speaking = false
        if (utterance.onend) utterance.onend()
      }, 360)
    }
  }

  let knockPostCount = 0
  let ackedSeq = 0
  const fetchStub = async (url, init = {}) => {
    const target = String(url)
    if (target.endsWith('/knock') && init.method === 'POST') {
      knockPostCount += 1
    }
    if (target.endsWith('/speech-ack') && init.method === 'POST') {
      const body = JSON.parse(init.body || '{}')
      if (body.seq) ackedSeq = body.seq
    }
    const statePayload = {
      apiVersion: 2,
      todayMerit: knockPostCount,
      totalMerit: knockPostCount,
      todayTokens: 10000,
      totalTokens: 10000,
      pendingTokens: 0,
      tokensPerMerit: 10000,
      accompanimentIntervalMs: 250,
      modelUrl: '',
      todayKey: '2026-11-02',
      currentSpeech: {
        seq: 1,
        text: '这是 LLM 返回的即时语音测试句子！',
        createdAt: Date.now(),
        source: 'llm'
      },
      speechSeq: 1,
      ackedSpeechSeq: ackedSeq,
      speechQueue:
        ackedSeq < 1
          ? [
              {
                seq: 1,
                text: '这是 LLM 返回的即时语音测试句子！',
                createdAt: Date.now(),
                source: 'llm'
              }
            ]
          : [],
      knockSeq: knockPostCount,
      auto: { running: false, targetCount: 0, currentCount: 0, intervalMs: 1200, cycleTitle: '深海伴奏' },
      records: []
    }
    if (target.includes('/state')) {
      return { ok: true, json: async () => statePayload }
    }
    return { ok: true, json: async () => ({ state: statePayload }) }
  }

  const windowStub = {
    speechSynthesis: speechSynthesisStub,
    SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame: cb => setTimeout(() => cb(Date.now()), 30),
    cancelAnimationFrame: id => clearTimeout(id),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  }
  const documentStub = {
    readyState: 'complete',
    body: makeEl('body'),
    createElement: tag => makeEl(tag),
    getElementById: () => null,
    addEventListener() {},
    removeEventListener() {}
  }
  const localStorageStub = {
    store: new Map(),
    getItem(k) { return this.store.get(k) ?? null },
    setItem(k, v) { this.store.set(k, String(v)) },
    removeItem(k) { this.store.delete(k) }
  }

  const sandbox = {
    window: windowStub,
    document: documentStub,
    localStorage: localStorageStub,
    SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
    fetch: fetchStub,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    Object,
    Array,
    Set,
    Map,
    JSON,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Error,
    RegExp
  }
  sandbox.globalThis = sandbox

  let entry = null
  sandbox.window.__ModuleLoader__ = { load(v) { entry = v } }
  vm.runInNewContext(clientCode, sandbox)
  assert.ok(entry)
  assert.equal(entry.id, 'dsh-plugin-whale')

  const cleanups = []
  entry.factory().apply({
    effect(fn) {
      const c = fn()
      if (typeof c === 'function') cleanups.push(c)
      return () => {}
    }
  })

  await new Promise(resolve => setTimeout(resolve, 650))

  // 验证 LLM 句子被 Web Speech 朗读，且在朗读期间自动触发了至少 2 次木鱼伴奏敲击
  assert.deepEqual(spokenUtterances, ['这是 LLM 返回的即时语音测试句子！'])
  assert.ok(knockPostCount >= 2, `Expected >= 2 accompaniment knocks during speech, got ${knockPostCount}`)
  assert.equal(ackedSeq, 1)

  const bubble = created.find(el => el.className === 'dsh-whale-bubble')
  assert.ok(bubble)
  assert.equal(bubble.textContent, '这是 LLM 返回的即时语音测试句子！')

  for (const cleanup of cleanups) cleanup()
})

test('Whale Sounds - 完整鲸鸣音色库与多音色切换', async () => {
  assert.ok(soundLibrary.whale_deep)
  assert.ok(soundLibrary.whale_song)
  assert.ok(soundLibrary.whale_echo)
  assert.ok(soundLibrary.whale_52hz)
  assert.equal(soundLibrary.whale_deep.fileName, 'whale_deep.wav')
  assert.equal(soundLibrary.whale_song.fileName, 'whale_song.wav')
  assert.equal(soundLibrary.whale_echo.fileName, 'whale_echo.wav')
  assert.equal(soundLibrary.whale_52hz.fileName, 'whale_52hz.wav')

  const tmpFile = makeUniqueTmpFile('whale_sound_test')
  try {
    const fakeCtx = {
      provide: () => {},
      effect: fn => fn(),
      tools: { register: () => () => {} }
    }
    const whale = new WhaleService(fakeCtx, { storagePath: tmpFile, defaultSound: 'whale_deep' })
    assert.equal(whale.getSoundType(), 'whale_deep')
    assert.ok(whale.getSoundFile().endsWith('whale_deep.wav'))

    assert.equal(whale.setSoundType('whale_song'), true)
    assert.equal(whale.getSoundType(), 'whale_song')
    assert.ok(whale.getSoundFile().endsWith('whale_song.wav'))

    assert.equal(whale.setSoundType('whale_52hz'), true)
    assert.ok(whale.getSoundFile().endsWith('whale_52hz.wav'))
  } finally {
    cleanupTmpFiles(tmpFile)
  }
})
test('formatWhaleWeight & formatWeightDelta - 体重单位换算（<1000kg 显示 kg，>=1000kg 显示 t）与每日增重格式化', () => {
  assert.equal(formatWhaleWeight(0), '0kg')
  assert.equal(formatWhaleWeight(50), '50kg')
  assert.equal(formatWhaleWeight(999), '999kg')
  assert.equal(formatWhaleWeight(1000), '1t')
  assert.equal(formatWhaleWeight(1250), '1.25t')
  assert.equal(formatWhaleWeight(25000), '25t')
  assert.equal(formatWhaleWeight(-50), '-50kg')
  assert.equal(formatWhaleWeight(-1200), '-1.2t')

  assert.equal(formatWeightDelta(0), '+0kg')
  assert.equal(formatWeightDelta(25), '+25kg')
  assert.equal(formatWeightDelta(1200), '+1.2t')
  assert.equal(formatWeightDelta(-5), '-5kg')
  assert.equal(formatWeightDelta(-1500), '-1.5t')
})

test('Female Voice Personas - 6款精选女生声线性格库完整性', () => {
  const synth = new WhaleSpeechSynthesizer()
  const personas = synth.getPersonas()
  assert.equal(personas.length, 6)

  const ids = personas.map(p => p.id)
  assert.ok(ids.includes('persona_kawaii'))
  assert.ok(ids.includes('persona_sweet'))
  assert.ok(ids.includes('persona_gentle'))
  assert.ok(ids.includes('persona_mature'))
  assert.ok(ids.includes('persona_siren'))
  assert.ok(ids.includes('persona_cantonese_girl'))

  assert.equal(synth.setPersona('persona_sweet'), true)
  assert.equal(synth.getCurrentPersonaId(), 'persona_sweet')
  assert.equal(synth.rate, 1.0)
  assert.equal(synth.pitch, 1.18)

  assert.equal(synth.setPersona('persona_gentle'), true)
  assert.equal(synth.rate, 0.88)
  assert.equal(synth.pitch, 0.98)
})
