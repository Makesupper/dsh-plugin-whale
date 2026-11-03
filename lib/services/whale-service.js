import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeritStorage } from './merit-storage.js';
import { LlmSpeechQueueService } from './llm-speech-service.js';
import { RuntimeStateStorage } from './state-storage.js';
import { soundLibrary } from '../data/sounds.js';
const MAX_KNOCK_BATCH = 108;
const MIN_INTERVAL_MS = 200;
const MAX_INTERVAL_MS = 60000;
const DEFAULT_MAX_DURATION_MS = 30 * 60 * 1000; // 30 minutes
function clampNumber(val, fallback, min, max) {
    const num = Number(val);
    if (!Number.isFinite(num))
        return fallback;
    return Math.min(max, Math.max(min, num));
}
function clampCount(val, fallback = 1, max = MAX_KNOCK_BATCH) {
    const num = Number(val);
    if (!Number.isFinite(num) || num <= 0)
        return fallback;
    return Math.min(max, Math.max(1, Math.floor(num)));
}
function clampSignedStep(val, fallback = 10000) {
    const num = Number(val);
    if (!Number.isFinite(num) || num === 0)
        return fallback;
    const sign = num < 0 ? -1 : 1;
    return sign * Math.min(10000000, Math.max(1, Math.floor(Math.abs(num))));
}
export class WhaleService {
    ctx;
    config;
    storage;
    speechQueue;
    stateStorage;
    tokensPerMeritOverride = null;
    accompanimentIntervalOverride = null;
    modelUrlOverride = null;
    currentSound = 'whale_deep';
    autoKnockTimer = null;
    autoStatus = {
        running: false,
        targetCount: 0,
        currentCount: 0,
        intervalMs: 1200,
        maxDurationMs: DEFAULT_MAX_DURATION_MS,
        cycleTitle: '深海伴奏'
    };
    assetsDir;
    knockSeq = 0;
    constructor(ctx, config = {}) {
        this.ctx = ctx;
        this.config = config;
        this.storage = new MeritStorage(config.storagePath);
        this.stateStorage = new RuntimeStateStorage(config.storagePath);
        if (config.resetRuntimeState) {
            this.stateStorage.clear();
            this.tokensPerMeritOverride = null;
            this.accompanimentIntervalOverride = null;
            this.modelUrlOverride = null;
        }
        const persisted = config.resetRuntimeState ? {} : this.stateStorage.load();
        if (persisted.tokensPerMerit) {
            this.tokensPerMeritOverride = clampSignedStep(persisted.tokensPerMerit, 10000);
        }
        if (persisted.accompanimentIntervalMs) {
            this.accompanimentIntervalOverride = clampNumber(persisted.accompanimentIntervalMs, 1200, MIN_INTERVAL_MS, MAX_INTERVAL_MS);
        }
        if (typeof persisted.modelUrl === 'string' && persisted.modelUrl.trim().length > 0) {
            this.modelUrlOverride = persisted.modelUrl.trim();
        }
        this.speechQueue = new LlmSpeechQueueService();
        if (config.defaultSound && soundLibrary[config.defaultSound]) {
            this.currentSound = config.defaultSound;
        }
        if (persisted.soundType && soundLibrary[persisted.soundType]) {
            this.currentSound = persisted.soundType;
        }
        // Materialize a legacy/step-change pending pool instead of dropping it
        const persistedStep = this.getTokensPerMerit();
        const absStep = Math.abs(persistedStep);
        const direction = persistedStep < 0 ? -1 : 1;
        const persistedPending = this.storage.pendingTokens;
        if (this.config.tokenKnockEnabled !== false && persistedPending >= absStep) {
            const fullSteps = Math.floor(persistedPending / absStep);
            const knocks = Math.min(MAX_KNOCK_BATCH, fullSteps);
            const nextPending = persistedPending % absStep;
            const meritDelta = direction * fullSteps;
            try {
                this.storage.addMeritDelta(meritDelta, 0, nextPending);
                if (meritDelta > 0) {
                    this.knockSeq += knocks;
                }
                this.persistState();
            }
            catch (error) {
                console.warn('[dsh-plugin-whale] failed to materialize pending tokens:', error);
            }
        }
        if (config.resetRuntimeState) {
            this.persistState();
        }
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        this.assetsDir = path.resolve(__dirname, '../../assets/sounds');
        this.ctx.effect(() => {
            return () => {
                this.stopAutoKnock();
            };
        });
    }
    getSoundType() {
        return this.currentSound;
    }
    setSoundType(type) {
        if (soundLibrary[type]) {
            this.currentSound = type;
            this.persistState();
            return true;
        }
        return false;
    }
    getSoundFile(type) {
        const targetType = type || this.currentSound;
        const def = soundLibrary[targetType] || soundLibrary.whale_deep;
        return path.join(this.assetsDir, def.fileName);
    }
    getAccompanimentIntervalMs() {
        return (this.accompanimentIntervalOverride ??
            clampNumber(this.config.accompanimentIntervalMs ?? this.config.autoKnockIntervalMs, 1200, MIN_INTERVAL_MS, MAX_INTERVAL_MS));
    }
    setAccompanimentIntervalMs(intervalMs) {
        const num = Number(intervalMs);
        if (!Number.isFinite(num))
            return false;
        this.accompanimentIntervalOverride = clampNumber(Math.floor(num), 1200, MIN_INTERVAL_MS, MAX_INTERVAL_MS);
        this.persistState();
        return true;
    }
    getModelUrl() {
        return this.modelUrlOverride ?? (typeof this.config.modelUrl === 'string' ? this.config.modelUrl.trim() : '');
    }
    setModelUrl(url) {
        const clean = typeof url === 'string' ? url.trim().slice(0, 512) : '';
        this.modelUrlOverride = clean || null;
        this.persistState();
        return true;
    }
    getVoiceSettings() {
        return {
            rate: clampNumber(this.config.voiceRate, 0.92, 0.1, 2.0),
            pitch: clampNumber(this.config.voicePitch, 1.05, 0.1, 2.0),
            volume: clampNumber(this.config.volume, 1.0, 0.0, 1.0)
        };
    }
    /**
     * Enqueue real-time LLM response text or manual tool speech into the speech queue.
     */
    enqueueLlmSpeech(text, source = 'llm') {
        return this.speechQueue.enqueueText(text, source);
    }
    getCurrentSpeech() {
        return this.speechQueue.getCurrentSegment();
    }
    getLatestSpeechSeq() {
        return this.speechQueue.getLatestSeq();
    }
    getAckedSpeechSeq() {
        return this.speechQueue.getAckedSeq();
    }
    getPendingSpeechSegments(afterSeq) {
        return this.speechQueue.getPendingSegments(afterSeq);
    }
    acknowledgeSpeech(seq) {
        return this.speechQueue.acknowledgeUpTo(seq);
    }
    knock(amount = 1, tokens = 0) {
        const safeAmount = clampCount(amount, 1, MAX_KNOCK_BATCH);
        const safeTokens = Number.isFinite(Number(tokens)) && Number(tokens) > 0 ? Math.floor(Number(tokens)) : 0;
        const { todayMerit, totalMerit, todayTokens, totalTokens, pendingTokens } = this.storage.addMerit(safeAmount, safeTokens);
        this.knockSeq += 1;
        this.persistState();
        const soundFile = this.getSoundFile();
        const voice = this.getVoiceSettings();
        const currentSpeech = this.speechQueue.getCurrentSegment();
        return {
            amount: safeAmount,
            todayMerit,
            totalMerit,
            todayTokens,
            totalTokens,
            currentSpeech,
            soundType: this.currentSound,
            soundFile,
            tokensConsumed: safeTokens,
            pendingTokens,
            voicePrompt: {
                text: currentSpeech.text,
                lang: 'zh-CN',
                rate: voice.rate,
                pitch: voice.pitch,
                volume: voice.volume
            }
        };
    }
    knockBatch(count, tokens = 0, pendingTokens) {
        const safeCount = clampCount(count, 1, MAX_KNOCK_BATCH);
        const safeTokens = Number.isFinite(Number(tokens)) && Number(tokens) > 0 ? Math.floor(Number(tokens)) : 0;
        const stats = this.storage.addMerit(safeCount, safeTokens, pendingTokens);
        return this.buildKnockResults(safeCount, stats, safeTokens);
    }
    buildKnockResults(count, stats, tokensConsumed) {
        const safeCount = Math.max(1, count);
        const soundFile = this.getSoundFile();
        const voice = this.getVoiceSettings();
        const todayBase = stats.todayMerit - safeCount;
        const totalBase = stats.totalMerit - safeCount;
        const currentSpeech = this.speechQueue.getCurrentSegment();
        const results = [];
        for (let i = 0; i < safeCount; i++) {
            results.push({
                amount: 1,
                todayMerit: todayBase + i + 1,
                totalMerit: totalBase + i + 1,
                todayTokens: stats.todayTokens,
                totalTokens: stats.totalTokens,
                currentSpeech,
                soundType: this.currentSound,
                soundFile,
                tokensConsumed: i === safeCount - 1 ? tokensConsumed : 0,
                pendingTokens: stats.pendingTokens,
                voicePrompt: {
                    text: currentSpeech.text,
                    lang: 'zh-CN',
                    rate: voice.rate,
                    pitch: voice.pitch,
                    volume: voice.volume
                }
            });
        }
        this.knockSeq += safeCount;
        this.persistState();
        return results;
    }
    consumeTokens(tokens) {
        return this.consumeTokenAmount(tokens, false);
    }
    feedTokens(tokens) {
        return this.consumeTokenAmount(tokens, true);
    }
    consumeTokenAmount(tokens, capInput) {
        const numTokens = Number(tokens);
        const safeTokens = Number.isFinite(numTokens) && numTokens > 0 ? Math.round(numTokens) : 0;
        const step = this.getTokensPerMerit();
        const absStep = Math.abs(step);
        const maxTokensPerCall = MAX_KNOCK_BATCH * absStep;
        if (safeTokens === 0) {
            const stats = this.storage.getStats();
            return {
                tokensConsumed: 0,
                truncatedTokens: 0,
                pendingTokens: stats.pendingTokens,
                knocksTriggered: 0,
                meritGained: 0,
                todayMerit: stats.todayMerit,
                totalMerit: stats.totalMerit,
                todayTokens: stats.todayTokens,
                totalTokens: stats.totalTokens,
                knockResults: []
            };
        }
        const acceptedTokens = capInput ? Math.min(safeTokens, maxTokensPerCall) : safeTokens;
        const truncatedTokens = safeTokens - acceptedTokens;
        if (this.config.tokenKnockEnabled === false) {
            this.storage.addTokens(acceptedTokens);
            const stats = this.storage.getStats();
            return {
                tokensConsumed: acceptedTokens,
                truncatedTokens,
                pendingTokens: stats.pendingTokens,
                knocksTriggered: 0,
                meritGained: 0,
                todayMerit: stats.todayMerit,
                totalMerit: stats.totalMerit,
                todayTokens: stats.todayTokens,
                totalTokens: stats.totalTokens,
                knockResults: []
            };
        }
        const result = this.storage.consumeTokensAndKnock(acceptedTokens, step, MAX_KNOCK_BATCH, capInput);
        let knockResults = [];
        if (result.meritDelta > 0) {
            knockResults = this.buildKnockResults(result.knocks, result.stats, result.tokensAccepted);
        }
        return {
            tokensConsumed: result.tokensAccepted,
            truncatedTokens: safeTokens - result.tokensAccepted,
            pendingTokens: result.pendingTokens,
            knocksTriggered: result.meritDelta > 0 ? result.knocks : 0,
            meritGained: result.meritDelta,
            todayMerit: result.stats.todayMerit,
            totalMerit: result.stats.totalMerit,
            todayTokens: result.stats.todayTokens,
            totalTokens: result.stats.totalTokens,
            knockResults
        };
    }
    getPendingTokens() {
        return this.storage.getStats().pendingTokens;
    }
    getTokensPerMerit() {
        return this.tokensPerMeritOverride ?? clampSignedStep(this.config.tokensPerMerit, 10000);
    }
    setTokensPerMerit(value) {
        const num = Number(value);
        if (!Number.isFinite(num) || num === 0 || Math.abs(num) > 10000000) {
            return false;
        }
        const step = Math.trunc(num);
        if (step === 0)
            return false;
        this.tokensPerMeritOverride = step;
        this.persistState();
        return true;
    }
    startAutoKnock(targetCount = 0, intervalMs, cycleTitle, maxDurationMs) {
        this.stopAutoKnock();
        const safeTarget = Number.isFinite(Number(targetCount)) && Number(targetCount) >= 0
            ? Math.floor(Number(targetCount))
            : 108;
        const interval = clampNumber(intervalMs ?? this.getAccompanimentIntervalMs(), 1200, MIN_INTERVAL_MS, MAX_INTERVAL_MS);
        const maxDuration = clampNumber(maxDurationMs ?? this.config.autoKnockMaxDurationMs, DEFAULT_MAX_DURATION_MS, 1000, 86400000);
        const startTime = Date.now();
        const trimmedTitle = typeof cycleTitle === 'string' ? cycleTitle.trim().slice(0, 80) : '';
        this.autoStatus = {
            running: true,
            targetCount: safeTarget,
            currentCount: 0,
            intervalMs: interval,
            maxDurationMs: maxDuration,
            cycleTitle: trimmedTitle || (safeTarget === 0 ? '深海常驻伴奏' : `${safeTarget} 次圆满`),
            startTime
        };
        this.autoKnockTimer = setInterval(() => {
            if (Date.now() - startTime >= maxDuration) {
                this.stopAutoKnock();
                return;
            }
            try {
                this.knock(1);
            }
            catch (error) {
                console.warn('[dsh-plugin-whale] auto knock skipped (ledger busy):', error);
                return;
            }
            this.autoStatus.currentCount += 1;
            if (this.autoStatus.targetCount > 0 && this.autoStatus.currentCount >= this.autoStatus.targetCount) {
                this.stopAutoKnock();
            }
        }, interval);
        return { ...this.autoStatus };
    }
    stopAutoKnock() {
        if (this.autoKnockTimer) {
            clearInterval(this.autoKnockTimer);
            this.autoKnockTimer = null;
        }
        this.autoStatus.running = false;
        return { ...this.autoStatus };
    }
    getAutoKnockStatus() {
        return { ...this.autoStatus };
    }
    getMeritStats() {
        return this.storage.getStats();
    }
    getKnockSeq() {
        return this.knockSeq;
    }
    persistState() {
        this.stateStorage.save({
            soundType: this.currentSound,
            tokensPerMerit: this.tokensPerMeritOverride ?? undefined,
            accompanimentIntervalMs: this.accompanimentIntervalOverride ?? undefined,
            modelUrl: this.modelUrlOverride ?? undefined
        });
    }
}
//# sourceMappingURL=whale-service.js.map