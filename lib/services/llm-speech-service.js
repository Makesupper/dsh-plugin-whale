                                                

const MAX_QUEUE_SIZE = 64
const MAX_SENTENCE_LENGTH = 140
const DEFAULT_GREETING = '你好呀，我是深度求索鲸鱼娘！随时准备为你播报 LLM 回复并敲木鱼伴奏~'

/**
 * Clean Markdown formatting, fenced code blocks, URLs, and noisy symbols so
 * Web Speech API reads natural spoken sentences instead of raw syntax.
 */
export function sanitizeLlmTextForSpeech(raw        )         {
  if (!raw || typeof raw !== 'string') return ''
  let text = raw
  // Strip reasoning/thinking blocks (<think>...</think> or <thinking>...</thinking>)
  text = text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, ' ')
  // If an unclosed <think> tag is present, strip from <think> to end
  text = text.replace(/<think(?:ing)?>[\s\S]*$/gi, ' ')
  // Remove fenced code blocks completely
  text = text.replace(/```[\s\S]*?```/g, ' ')
  // Replace inline code with its inner text
  text = text.replace(/`([^`]+)`/g, '$1')
  // Replace markdown images ![alt](url) -> alt
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  // Replace markdown links [label](url) -> label
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // Strip raw http/https URLs
  text = text.replace(/https?:\/\/[^\s)]+/g, ' ')
  // Strip HTML tags
  text = text.replace(/<[^>]+>/g, ' ')
  // Remove heading hashes, blockquote markers, list bullets, bold/italic stars
  text = text.replace(/^\s*#{1,6}\s+/gm, '')
  text = text.replace(/^\s*>\s+/gm, '')
  text = text.replace(/^\s*[-*+]\s+/gm, '')
  text = text.replace(/[*_~]+/g, '')
  // Collapse horizontal whitespace
  text = text.replace(/[ \t\r]+/g, ' ')
  return text.trim()
}

/**
 * Split cleaned LLM response text into natural sentence segments for smooth TTS playback
 * and rhythmic wooden-fish accompaniment.
 */
export function splitTextIntoSpeechSentences(raw        )           {
  const cleaned = sanitizeLlmTextForSpeech(raw)
  if (!cleaned) return []

  const parts = cleaned
    .split(/(?<=[。！？；!?;。\n])\s*/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const result           = []
  const pushChunked = (chunk        ) => {
    let rest = chunk.trim()
    while (rest.length > MAX_SENTENCE_LENGTH) {
      result.push(rest.slice(0, MAX_SENTENCE_LENGTH))
      rest = rest.slice(MAX_SENTENCE_LENGTH).trim()
    }
    if (rest.length > 0) {
      result.push(rest)
    }
  }

  for (const part of parts) {
    if (part.length <= MAX_SENTENCE_LENGTH) {
      result.push(part)
      continue
    }
    // Further split overly long clauses by commas
    const subParts = part
      .split(/(?<=[，,、：:])\s*/)
      .map(s => s.trim())
      .filter(Boolean)
    let buffer = ''
    for (const sub of subParts) {
      if (sub.length > MAX_SENTENCE_LENGTH) {
        if (buffer) {
          pushChunked(buffer)
          buffer = ''
        }
        pushChunked(sub)
        continue
      }
      if (!buffer) {
        buffer = sub
      } else if (buffer.length + sub.length <= MAX_SENTENCE_LENGTH) {
        buffer += sub
      } else {
        result.push(buffer)
        buffer = sub
      }
    }
    if (buffer) {
      pushChunked(buffer)
    }
  }

  return result.filter(s => s.length > 0)
}

/**
 * Determine whether an `assistant/message` event is merely an intermediate tool-calling step
 * rather than the final response to the user.
 */
export function isIntermediateToolCallEvent(event     )          {
  if (!event || typeof event !== 'object') return false
  const data = event.data
  if (!data || typeof data !== 'object') return false

  const stopReason = String(
    data.stopReason || data.finishReason || data.stop_reason || data.finish_reason || ''
  ).toLowerCase()
  if (stopReason === 'tool_use' || stopReason === 'tool_calls' || stopReason === 'function_call') {
    return true
  }

  if (Array.isArray(data.toolCalls) && data.toolCalls.length > 0) return true
  if (Array.isArray(data.tool_calls) && data.tool_calls.length > 0) return true
  if (Array.isArray(data.message?.toolCalls) && data.message.toolCalls.length > 0) return true
  if (Array.isArray(data.message?.tool_calls) && data.message.tool_calls.length > 0) return true

  const contentNodes = Array.isArray(data.content)
    ? data.content
    : Array.isArray(data.message?.content)
      ? data.message.content
      : null

  if (contentNodes) {
    const hasToolUseBlock = contentNodes.some(
      (item     ) =>
        item &&
        typeof item === 'object' &&
        (item.type === 'tool_use' || item.type === 'tool_call' || item.type === 'function_call')
    )
    if (hasToolUseBlock) return true
  }

  return false
}

/**
 * Extract only the final conclusion/summary paragraph from the full LLM answer so
 * intermediate analysis steps or multi-paragraph walkthroughs are skipped.
 */
export function extractFinalConclusionText(rawText        )         {
  const cleaned = sanitizeLlmTextForSpeech(rawText)
  if (!cleaned) return ''

  const paragraphs = cleaned
    .split(/\n{2,}|\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  if (paragraphs.length === 0) return ''
  return paragraphs[paragraphs.length - 1]
}

/**
 * Extract assistant text from diverse DSH `session/event` payload shapes:
 * - event.data.text / event.data.content (string)
 * - event.data.content (array of { type: 'text', text: '...' } blocks)
 * - event.data.message.content (string or array of blocks)
 * - event.content / event.text
 *
 * Returns empty string if the message is an intermediate tool-calling step.
 */
export function extractAssistantTextFromEvent(event     )         {
  if (!event || typeof event !== 'object') return ''
  if (isIntermediateToolCallEvent(event)) return ''

  const extractFromContentNode = (node     )         => {
    if (!node) return ''
    if (typeof node === 'string') return node
    if (Array.isArray(node)) {
      return node
        .map(item => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object') {
            if (
              item.type === 'thinking' ||
              item.type === 'reasoning' ||
              item.type === 'tool_use' ||
              item.type === 'tool_result'
            ) {
              return ''
            }
            if (typeof item.text === 'string') return item.text
            if (typeof item.content === 'string') return item.content
          }
          return ''
        })
        .filter(Boolean)
        .join('\n')
    }
    if (typeof node === 'object') {
      if (typeof node.text === 'string') return node.text
      if (typeof node.content === 'string' || Array.isArray(node.content)) {
        return extractFromContentNode(node.content)
      }
    }
    return ''
  }

  const data = event.data
  if (data && typeof data === 'object') {
    const fromDirect =
      extractFromContentNode(data.content) ||
      extractFromContentNode(data.text) ||
      extractFromContentNode(data.message?.content) ||
      extractFromContentNode(data.message?.text) ||
      extractFromContentNode(data.output)
    if (fromDirect) return extractFinalConclusionText(fromDirect)
  }

  const fallback = extractFromContentNode(event.content) || extractFromContentNode(event.text)
  return extractFinalConclusionText(fallback)
}

/**
 * Manages the real-time queue of LLM speech segments for the Whale companion widget.
 * Only keeps the latest final response so intermediate/stale messages are never queued up.
 */
export class LlmSpeechQueueService {
          segments                  = []
          seq         = 0
          ackedSeq         = 0
          lastEnqueuedFullText         = ''
          currentSegment               

  constructor(initialGreeting         = DEFAULT_GREETING) {
    this.currentSegment = {
      seq: 0,
      text: initialGreeting,
      createdAt: Date.now(),
      source: 'greeting'
    }
  }

         enqueueText(rawText        , source                              = 'llm')                  {
    const targetText = source === 'llm' ? extractFinalConclusionText(rawText) : rawText
    const sentences = splitTextIntoSpeechSentences(targetText)
    if (sentences.length === 0) return []

    const joined = sentences.join(' ')
    if (source === 'llm' && joined === this.lastEnqueuedFullText) {
      return []
    }
    if (source === 'llm') {
      this.lastEnqueuedFullText = joined
    }

    // Mark any older unplayed segments as superseded so the client only reads the latest final result
    if (this.seq > this.ackedSeq) {
      this.ackedSeq = this.seq
    }

    const now = Date.now()
    const added                  = []
    for (const sentence of sentences) {
      this.seq += 1
      const seg                = {
        seq: this.seq,
        text: sentence,
        createdAt: now,
        source
      }
      this.segments.push(seg)
      this.currentSegment = seg
      added.push(seg)
    }

    if (this.segments.length > MAX_QUEUE_SIZE) {
      this.segments.splice(0, this.segments.length - MAX_QUEUE_SIZE)
    }

    return added
  }

         getCurrentSegment()                {
    return this.currentSegment
  }

         getLatestSeq()         {
    return this.seq
  }

         getAckedSeq()         {
    return this.ackedSeq
  }

         acknowledgeUpTo(seq        )         {
    const num = Number(seq)
    if (Number.isFinite(num) && num > this.ackedSeq) {
      this.ackedSeq = Math.min(this.seq, Math.floor(num))
    }
    return this.ackedSeq
  }

         getPendingSegments(afterSeq         )                  {
    const threshold =
      typeof afterSeq === 'number' && Number.isFinite(afterSeq)
        ? Math.max(0, Math.floor(afterSeq))
        : this.ackedSeq
    return this.segments.filter(seg => seg.seq > threshold)
  }

         clearQueue()       {
    this.ackedSeq = this.seq
  }
}
