import Schema from './shims.js';
import type { MuyuSoundType } from './types.js';
export interface WhaleConfig {
    defaultSound?: MuyuSoundType;
    accompanimentIntervalMs?: number;
    autoKnockIntervalMs?: number;
    autoKnockMaxDurationMs?: number;
    voiceEnabled?: boolean;
    voiceRate?: number;
    voicePitch?: number;
    volume?: number;
    storagePath?: string;
    tokenKnockEnabled?: boolean;
    tokensPerMerit?: number;
    modelUrl?: string;
    resetRuntimeState?: boolean;
}
export declare const Config: Schema<WhaleConfig>;
//# sourceMappingURL=config.d.ts.map