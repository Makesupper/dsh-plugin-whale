import type { Context } from '../shims.js';
import type { MuyuSoundType, KnockResult, AutoKnockStatus, MeritStats, SpeechSegment, TokenConsumeResult } from '../types.js';
import type { WhaleConfig } from '../config.js';
export declare class WhaleService {
    ctx: Context;
    config: WhaleConfig;
    private storage;
    private speechQueue;
    private stateStorage;
    private tokensPerMeritOverride;
    private accompanimentIntervalOverride;
    private modelUrlOverride;
    private currentSound;
    private autoKnockTimer;
    private autoStatus;
    private assetsDir;
    private knockSeq;
    constructor(ctx: Context, config?: WhaleConfig);
    getSoundType(): MuyuSoundType;
    setSoundType(type: MuyuSoundType): boolean;
    getSoundFile(type?: MuyuSoundType): string;
    getAccompanimentIntervalMs(): number;
    setAccompanimentIntervalMs(intervalMs: number): boolean;
    getModelUrl(): string;
    setModelUrl(url: string): boolean;
    private getVoiceSettings;
    /**
     * Enqueue real-time LLM response text or manual tool speech into the speech queue.
     */
    enqueueLlmSpeech(text: string, source?: 'llm' | 'tool'): SpeechSegment[];
    getCurrentSpeech(): SpeechSegment;
    getLatestSpeechSeq(): number;
    getAckedSpeechSeq(): number;
    getPendingSpeechSegments(afterSeq?: number): SpeechSegment[];
    acknowledgeSpeech(seq: number): number;
    knock(amount?: number, tokens?: number): KnockResult;
    knockBatch(count: number, tokens?: number, pendingTokens?: number): KnockResult[];
    private buildKnockResults;
    consumeTokens(tokens: number): TokenConsumeResult;
    feedTokens(tokens: number): TokenConsumeResult;
    private consumeTokenAmount;
    getPendingTokens(): number;
    getTokensPerMerit(): number;
    setTokensPerMerit(value: number): boolean;
    startAutoKnock(targetCount?: number, intervalMs?: number, cycleTitle?: string, maxDurationMs?: number): AutoKnockStatus;
    stopAutoKnock(): AutoKnockStatus;
    getAutoKnockStatus(): AutoKnockStatus;
    getMeritStats(): MeritStats;
    getKnockSeq(): number;
    private persistState;
}
//# sourceMappingURL=whale-service.d.ts.map