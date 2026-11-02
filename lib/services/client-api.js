                                                      
                                                                                   

export const WHALE_API_PREFIX = '/dsh-whale'
export const WHALE_API_VERSION = 2

                                   
                    
                    
                    
                     
                     
                       
                        
                                 
                  
                  
                              
                   
                        
                              
                  
                       
                              
 

                    
                 
              
                                                         
                                                                
 

                     
                     
                       
                                                                     
                             
 

const MAX_BODY_CHARS = 16 * 1024
const MAX_CYCLE_TITLE = 80
const MAX_ACTION_CHARS = 16

export function buildWhaleState(
  whale              ,
  includeHistory          = false,
  afterSpeechSeq         
)                   {
  const stats = whale.getMeritStats()
  return {
    apiVersion: WHALE_API_VERSION,
    todayMerit: stats.todayMerit,
    totalMerit: stats.totalMerit,
    todayTokens: stats.todayTokens,
    totalTokens: stats.totalTokens,
    pendingTokens: stats.pendingTokens,
    tokensPerMerit: whale.getTokensPerMerit(),
    accompanimentIntervalMs: whale.getAccompanimentIntervalMs(),
    modelUrl: whale.getModelUrl(),
    todayKey: stats.todayKey,
    currentSpeech: whale.getCurrentSpeech(),
    speechSeq: whale.getLatestSpeechSeq(),
    ackedSpeechSeq: whale.getAckedSpeechSeq(),
    speechQueue: whale.getPendingSpeechSegments(afterSpeechSeq),
    knockSeq: whale.getKnockSeq(),
    auto: whale.getAutoKnockStatus(),
    ...(includeHistory ? { records: stats.records } : {})
  }
}

function sendJson(res              , status        , payload         )       {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  })
  res.end(body)
}

function readJsonBody(req             )               {
  return new Promise((resolve, reject) => {
    let text = ''
    let settled = false
    const fail = (error       ) => {
      if (settled) return
      settled = true
      reject(error)
    }
    const decoder = new TextDecoder('utf-8')
    req.on('data', (chunk     ) => {
      if (settled) return
      text += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true })
      if (text.length > MAX_BODY_CHARS) {
        fail(new Error('request body too large'))
      }
    })
    req.on('end', () => {
      if (settled) return
      text += decoder.decode()
      settled = true
      if (text.trim() === '') {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(text))
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', (error     ) => fail(error instanceof Error ? error : new Error(String(error))))
  })
}

function clampInteger(value         , fallback        , min        , max        )         {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Math.floor(num)))
}

function headerValue(req             , name        )                     {
  const value = req.headers?.[name]
  return Array.isArray(value) ? value[0] : value
}

function expectedOrigin(webServer     )             {
  try {
    if (typeof webServer?.getOrigin === 'function') {
      const origin = webServer.getOrigin()
      if (origin) return new URL(String(origin))
    }
  } catch {}
  try {
    const protocol = typeof webServer?.protocol === 'string' ? webServer.protocol : 'http:'
    const host = webServer?.host
    const port = webServer?.port
    if (host && port !== undefined) {
      return new URL(`${protocol}//${host}:${port}`)
    }
  } catch {}
  return null
}

let warnedMissingOrigin = false

function warnMissingOrigin()       {
  if (warnedMissingOrigin) return
  warnedMissingOrigin = true
  console.warn(
    '[dsh-plugin-whale] webserver origin is unavailable; falling back to loopback-only Host/Origin checks'
  )
}

function isLoopbackHostname(hostname        )          {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return host === '127.0.0.1' || host === 'localhost' || host === '::1'
}

function defaultPort(url     )         {
  return url.port || (url.protocol === 'https:' ? '443' : '80')
}

function allowedHost(req             , webServer     )          {
  const host = (headerValue(req, 'host') || '').trim().toLowerCase()
  if (!host) return false
  const expected = expectedOrigin(webServer)
  if (!expected) {
    warnMissingOrigin()
    if (host === 'dsh-app') return true
    try {
      return isLoopbackHostname(new URL(`http://${host}`).hostname)
    } catch {
      return false
    }
  }
  if (host === expected.host.toLowerCase()) return true
  const port = defaultPort(expected)
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`].includes(host)
}

function allowedOrigin(req             , webServer     )          {
  const origin = headerValue(req, 'origin')
  if (!origin) return true
  if (origin === 'dsh-app://app') return true
  const expected = expectedOrigin(webServer)
  if (!expected) {
    warnMissingOrigin()
    try {
      const parsed = new URL(origin)
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && isLoopbackHostname(parsed.hostname)
    } catch {
      return false
    }
  }
  if (origin === expected.origin) return true
  try {
    const parsed = new URL(origin)
    if (parsed.protocol !== expected.protocol) return false
    return defaultPort(parsed) === defaultPort(expected) && isLoopbackHostname(parsed.hostname)
  } catch {
    return false
  }
}

function requireJsonContentType(req             , res              )          {
  const contentType = (headerValue(req, 'content-type') || '').split(';')[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    sendJson(res, 415, { error: 'content-type must be application/json' })
    return false
  }
  return true
}

function checkRequestOrigin(req             , res              , webServer     )          {
  if (!allowedHost(req, webServer)) {
    sendJson(res, 403, { error: 'forbidden host' })
    return false
  }
  if (!allowedOrigin(req, webServer)) {
    sendJson(res, 403, { error: 'forbidden origin' })
    return false
  }
  return true
}

function methodNotAllowed(res              , allowed        )       {
  sendJson(res, 405, { error: `method not allowed; use ${allowed}` })
}

function guard(handler                                                               ) {
  return (req             , res              )       => {
    Promise.resolve()
      .then(() => handler(req, res))
      .catch((error     ) => {
        const message = error instanceof Error ? error.message : String(error)
        if (!res.headersSent) {
          sendJson(res, 400, { error: message })
        } else {
          res.end()
        }
      })
  }
}

export function createWhaleRouteHandlers(whale              , webServer      ) {
  const state = guard(async (req, res) => {
    if (!checkRequestOrigin(req, res, webServer)) return
    if ((req.method || 'GET').toUpperCase() !== 'GET') {
      methodNotAllowed(res, 'GET')
      return
    }
    const url = new URL(req.url || `${WHALE_API_PREFIX}/state`, 'http://localhost')
    const includeHistory = url.searchParams.get('history') === '1'
    const afterSeqParam = url.searchParams.get('afterSeq')
    const afterSeq =
      afterSeqParam !== null && Number.isFinite(Number(afterSeqParam))
        ? Math.max(0, Math.floor(Number(afterSeqParam)))
        : undefined
    sendJson(res, 200, buildWhaleState(whale, includeHistory, afterSeq))
  })

  const knock = guard(async (req, res) => {
    if (!checkRequestOrigin(req, res, webServer)) return
    if ((req.method || '').toUpperCase() !== 'POST') {
      methodNotAllowed(res, 'POST')
      return
    }
    if (!requireJsonContentType(req, res)) return
    const body = await readJsonBody(req)
    const count = clampInteger(body?.count, 1, 1, 108)
    const result = whale.knock(count)
    sendJson(res, 200, {
      state: buildWhaleState(whale),
      knock: {
        amount: result.amount,
        currentSpeech: result.currentSpeech
      }
    })
  })

  const auto = guard(async (req, res) => {
    if (!checkRequestOrigin(req, res, webServer)) return
    if ((req.method || '').toUpperCase() !== 'POST') {
      methodNotAllowed(res, 'POST')
      return
    }
    if (!requireJsonContentType(req, res)) return
    const body = await readJsonBody(req)
    const action = String(body?.action || 'status')
    if (action.length > MAX_ACTION_CHARS) {
      sendJson(res, 400, { error: 'action is too long' })
      return
    }
    if (action === 'start') {
      const targetCount = clampInteger(body?.targetCount, 0, 0, 1080)
      const intervalMs = body?.intervalMs === undefined ? undefined : clampInteger(body.intervalMs, 1200, 200, 60000)
      const title = typeof body?.cycleTitle === 'string' ? body.cycleTitle.slice(0, MAX_CYCLE_TITLE) : undefined
      whale.startAutoKnock(targetCount, intervalMs, title)
    } else if (action === 'stop') {
      whale.stopAutoKnock()
    } else if (action !== 'status') {
      sendJson(res, 400, { error: 'action must be start, stop, or status' })
      return
    }
    sendJson(res, 200, { state: buildWhaleState(whale) })
  })

  const speechAck = guard(async (req, res) => {
    if (!checkRequestOrigin(req, res, webServer)) return
    if ((req.method || '').toUpperCase() !== 'POST') {
      methodNotAllowed(res, 'POST')
      return
    }
    if (!requireJsonContentType(req, res)) return
    const body = await readJsonBody(req)
    if (typeof body?.text === 'string' && body.text.trim().length > 0) {
      whale.enqueueLlmSpeech(body.text, 'tool')
    }
    if (body?.seq !== undefined) {
      const seq = clampInteger(body.seq, 0, 0, 1000000000)
      whale.acknowledgeSpeech(seq)
    }
    if (body?.accompanimentIntervalMs !== undefined) {
      const interval = clampInteger(body.accompanimentIntervalMs, 1200, 200, 60000)
      whale.setAccompanimentIntervalMs(interval)
    }
    if (typeof body?.modelUrl === 'string') {
      whale.setModelUrl(body.modelUrl)
    }
    sendJson(res, 200, { state: buildWhaleState(whale) })
  })

  const tokensPerMerit = guard(async (req, res) => {
    if (!checkRequestOrigin(req, res, webServer)) return
    if ((req.method || '').toUpperCase() !== 'POST') {
      methodNotAllowed(res, 'POST')
      return
    }
    if (!requireJsonContentType(req, res)) return
    const body = await readJsonBody(req)
    const value = Number(body?.value)
    if (!Number.isFinite(value) || value === 0 || Math.abs(value) > 10000000) {
      sendJson(res, 400, { error: 'value must be a non-zero integer within +/-10,000,000' })
      return
    }
    const step = Math.trunc(value)
    if (step === 0 || !whale.setTokensPerMerit(step)) {
      sendJson(res, 400, { error: 'invalid tokensPerMerit' })
      return
    }
    sendJson(res, 200, { state: buildWhaleState(whale) })
  })

  return { state, knock, auto, speechAck, tokensPerMerit }
}

export function registerWhaleClientApi(webServer     , whale              )             {
  if (!webServer || typeof webServer.register !== 'function') {
    return () => {}
  }
  const handlers = createWhaleRouteHandlers(whale, webServer)
  const routes                                                       = [
    { kind: 'exact', path: `${WHALE_API_PREFIX}/state`, handler: handlers.state },
    { kind: 'exact', path: `${WHALE_API_PREFIX}/knock`, handler: handlers.knock },
    { kind: 'exact', path: `${WHALE_API_PREFIX}/auto`, handler: handlers.auto },
    { kind: 'exact', path: `${WHALE_API_PREFIX}/speech-ack`, handler: handlers.speechAck },
    { kind: 'exact', path: `${WHALE_API_PREFIX}/tokens-per-merit`, handler: handlers.tokensPerMerit }
  ]
  const disposers = routes.map(route => {
    try {
      return webServer.register(route)
    } catch (error) {
      console.warn('[dsh-plugin-whale] failed to register client API route', route.path, error)
      return () => {}
    }
  })
  return () => {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {}
    }
  }
}
