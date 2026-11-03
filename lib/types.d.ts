export type MuyuSoundType = 'whale_deep' | 'whale_song' | 'whale_echo' | 'whale_52hz' | 'sandalwood' | 'whitewood' | 'bell';
export interface SoundDefinition {
    id: MuyuSoundType;
    displayName: string;
    description: string;
    fileName: string;
}
export interface SpeechSegment {
    seq: number;
    text: string;
    createdAt: number;
    source: 'llm' | 'tool' | 'greeting';
}
export interface DailyMeritRecord {
    dateKey: string;
    count: number;
    displayDate: string;
    tokens?: number;
}
export interface MeritStats {
    todayMerit: number;
    totalMerit: number;
    todayTokens: number;
    totalTokens: number;
    pendingTokens: number;
    todayKey: string;
    records: DailyMeritRecord[];
}
export interface KnockResult {
    amount: number;
    todayMerit: number;
    totalMerit: number;
    todayTokens: number;
    totalTokens: number;
    currentSpeech: SpeechSegment;
    soundType: MuyuSoundType;
    soundFile: string;
    tokensConsumed?: number;
    pendingTokens?: number;
    voicePrompt: {
        text: string;
        lang: string;
        rate: number;
        pitch: number;
        volume: number;
    };
}
export interface AutoKnockStatus {
    running: boolean;
    targetCount: number;
    currentCount: number;
    intervalMs: number;
    maxDurationMs: number;
    cycleTitle: string;
    startTime?: number;
}
export interface TokenConsumeResult {
    tokensConsumed: number;
    truncatedTokens?: number;
    pendingTokens: number;
    knocksTriggered: number;
    meritGained: number;
    todayMerit: number;
    totalMerit: number;
    todayTokens: number;
    totalTokens: number;
    knockResults: KnockResult[];
}
//# sourceMappingURL=types.d.ts.map