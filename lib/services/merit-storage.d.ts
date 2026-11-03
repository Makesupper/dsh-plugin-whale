import type { MeritStats } from '../types.js';
export declare class MeritStorageBusyError extends Error {
    readonly storageFile: string;
    constructor(storageFile: string);
}
export declare function resolveDefaultStorageFile(customPath?: string): string;
export declare class MeritStorage {
    private storageFile;
    private lockFile;
    private days;
    private _pendingTokens;
    constructor(customPath?: string);
    get todayKey(): string;
    private ensureBucket;
    get todayMerit(): number;
    get totalMerit(): number;
    get todayTokens(): number;
    get totalTokens(): number;
    get pendingTokens(): number;
    setPendingTokens(pending: number): void;
    addMerit(amount?: number, tokens?: number, pendingTokens?: number): {
        todayMerit: number;
        totalMerit: number;
        todayTokens: number;
        totalTokens: number;
        pendingTokens: number;
    };
    addMeritDelta(delta: number, tokens?: number, pendingTokens?: number): {
        todayMerit: number;
        totalMerit: number;
        todayTokens: number;
        totalTokens: number;
        pendingTokens: number;
    };
    addTokens(tokens: number, pendingTokens?: number): {
        todayTokens: number;
        totalTokens: number;
        pendingTokens: number;
    };
    consumeTokensAndKnock(tokens: number, step: number, maxKnocks: number, capTokens?: boolean): {
        knocks: number;
        meritDelta: number;
        pendingTokens: number;
        tokensAccepted: number;
        stats: MeritStats;
    };
    getStats(): MeritStats;
    private buildStats;
    private prune;
    private quarantineCorruptFile;
    private load;
    private refresh;
    private readLedger;
    private writeLedger;
    private acquireLock;
    private isPidAlive;
    private removeStaleLock;
    private releaseLock;
    private sleep;
    private withLock;
}
//# sourceMappingURL=merit-storage.d.ts.map