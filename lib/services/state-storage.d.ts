import type { MuyuSoundType } from '../types.js';
export interface RuntimeState {
    soundType?: MuyuSoundType;
    tokensPerMerit?: number;
    accompanimentIntervalMs?: number;
    modelUrl?: string;
}
export declare function resolveRuntimeStateFile(storagePath?: string): string;
export declare class RuntimeStateStorage {
    private file;
    constructor(storagePath?: string);
    get path(): string;
    clear(): void;
    load(): RuntimeState;
    save(state: RuntimeState): void;
}
//# sourceMappingURL=state-storage.d.ts.map