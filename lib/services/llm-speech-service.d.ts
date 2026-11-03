import type { SpeechSegment } from '../types.js';
/**
 * Clean Markdown formatting, fenced code blocks, URLs, and noisy symbols so
 * Web Speech API reads natural spoken sentences instead of raw syntax.
 */
export declare function sanitizeLlmTextForSpeech(raw: string): string;
/**
 * Split cleaned LLM response text into natural sentence segments for smooth TTS playback
 * and rhythmic wooden-fish accompaniment.
 */
export declare function splitTextIntoSpeechSentences(raw: string): string[];
/**
 * Determine whether an `assistant/message` event is merely an intermediate tool-calling step
 * rather than the final response to the user.
 */
export declare function isIntermediateToolCallEvent(event: any): boolean;
/**
 * Extract only the final conclusion/summary paragraph from the full LLM answer so
 * intermediate analysis steps or multi-paragraph walkthroughs are skipped.
 */
export declare function extractFinalConclusionText(rawText: string): string;
/**
 * Extract assistant text from diverse DSH `session/event` payload shapes:
 * - event.data.text / event.data.content (string)
 * - event.data.content (array of { type: 'text', text: '...' } blocks)
 * - event.data.message.content (string or array of blocks)
 * - event.content / event.text
 *
 * Returns empty string if the message is an intermediate tool-calling step.
 */
export declare function extractAssistantTextFromEvent(event: any): string;
/**
 * Manages the real-time queue of LLM speech segments for the Whale companion widget.
 * Only keeps the latest final response so intermediate/stale messages are never queued up.
 */
export declare class LlmSpeechQueueService {
    private segments;
    private seq;
    private ackedSeq;
    private lastEnqueuedFullText;
    private currentSegment;
    constructor(initialGreeting?: string);
    enqueueText(rawText: string, source?: 'llm' | 'tool' | 'greeting'): SpeechSegment[];
    getCurrentSegment(): SpeechSegment;
    getLatestSeq(): number;
    getAckedSeq(): number;
    acknowledgeUpTo(seq: number): number;
    getPendingSegments(afterSeq?: number): SpeechSegment[];
    clearQueue(): void;
}
//# sourceMappingURL=llm-speech-service.d.ts.map