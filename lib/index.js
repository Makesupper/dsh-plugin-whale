                                         
import { Config,                  } from './config.js'
import { WhaleService } from './services/whale-service.js'
import { extractAssistantTextFromEvent } from './services/llm-speech-service.js'
import { registerWhaleClientApi } from './services/client-api.js'
import { createWhaleTools } from './tools/index.js'

export const name = 'whale'
export const inject = ['tools']
export { Config }

export function apply(ctx         , config              = {}) {
  // 1. 初始化深度求索 3D 鲸鱼娘领域服务并注册到 Cordis
  const whale = new WhaleService(ctx, config)
  ctx.provide('whale', whale)

  // 2. 监听 DSH 会话事件：
  //    - 提取 assistant/message 中的 LLM 即时回复文本送入语音播报队列
  //    - 提取 usage 统计 Token 并自动折算木鱼伴奏功德
  if (typeof ctx.on === 'function') {
    ctx.effect(() => {
      return ctx.on('session/event', (_session     , event     ) => {
        if (event?.type !== 'assistant/message') return

        // 2a. 提取 LLM 返回的即时文本，分句入队供前端 Web Speech 朗读与木鱼伴奏
        const assistantText = extractAssistantTextFromEvent(event)
        if (assistantText && assistantText.trim().length > 0) {
          try {
            whale.enqueueLlmSpeech(assistantText, 'llm')
          } catch (error) {
            console.warn('[dsh-plugin-whale] failed to enqueue LLM speech text:', error)
          }
        }

        // 2b. 提取真实 Token 用量并折算功德
        const u = event.data?.usage
        if (!u) return
        const tokens =
          (Number(u.inputTokens) || 0) +
          (Number(u.outputTokens) || 0) +
          (Number(u.cacheReadTokens) || 0) +
          (Number(u.cacheWriteTokens) || 0)
        if (tokens > 0) {
          try {
            whale.consumeTokens(tokens)
          } catch (error) {
            console.warn('[dsh-plugin-whale] failed to record session token usage:', error)
          }
        }
      })
    })
  }

  // 3. 挂载客户端 API 路由 (/dsh-whale/*)
  if (typeof (ctx       ).inject === 'function') {
    ;(ctx       ).inject(['webServer'], (webCtx         ) => {
      webCtx.effect(() => registerWhaleClientApi(webCtx.webServer, whale))
    })
  }

  // 4. 注册 DSH Tools
  const tools = createWhaleTools(whale)
  for (const tool of tools) {
    ctx.effect(() => {
      return ctx.tools.register(tool)
    })
  }

  console.log('[dsh-plugin-whale] 深度求索 3D 鲸鱼娘插件加载成功！LLM 即时语音播报与木鱼伴奏已就绪。')
}
