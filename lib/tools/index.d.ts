import type { WhaleService } from '../services/whale-service.js';
import type { MuyuSoundType } from '../types.js';
export declare function createWhaleTools(whale: WhaleService): ({
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            text: {
                type: string;
                description: string;
            };
            knockCount: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    output: {
        schema: {
            type: string;
        };
        render: (_args: any, res: any) => {
            type: string;
            text: string;
        }[];
    };
    execute(args: any): Promise<{
        enqueuedCount: number;
        enqueuedSegments: import("../types.js").SpeechSegment[];
        amount: number;
        todayMerit: number;
        totalMerit: number;
        todayTokens: number;
        totalTokens: number;
        currentSpeech: import("../types.js").SpeechSegment;
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
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            count: {
                type: string;
                description: string;
            };
            sound: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: never[];
    };
    output: {
        schema: {
            type: string;
        };
        render: (_args: any, res: any) => {
            type: string;
            text: string;
        }[];
    };
    execute(args: any): Promise<{
        soundDisplayName: string;
        amount: number;
        todayMerit: number;
        totalMerit: number;
        todayTokens: number;
        totalTokens: number;
        currentSpeech: import("../types.js").SpeechSegment;
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
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            action: {
                type: string;
                enum: string[];
                description: string;
            };
            cycle: {
                type: string;
                description: string;
            };
            intervalMs: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    output: {
        schema: {
            type: string;
        };
        render: (_args: any, res: any) => {
            type: string;
            text: string;
        }[];
    };
    execute(args: any): Promise<{
        running: boolean;
        targetCount: number;
        currentCount: number;
        intervalMs: number;
        maxDurationMs: number;
        cycleTitle: string;
        startTime?: number;
        action: string;
    } | {
        running: boolean;
        targetCount: number;
        currentCount: number;
        intervalMs: number;
        maxDurationMs: number;
        cycleTitle: string;
        startTime?: number;
        action: string;
        cycleFallbackNote: string | undefined;
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {};
        required: never[];
    };
    output: {
        schema: {
            type: string;
        };
        render: (_args: any, res: any) => {
            type: string;
            text: string;
        }[];
    };
    execute(): Promise<import("../types.js").MeritStats>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            type: {
                type: string;
                enum: string[];
                description: string;
            };
        };
        required: never[];
    };
    output: {
        schema: {
            type: string;
        };
        render: (_args: any, res: any) => {
            type: string;
            text: string;
        }[];
    };
    execute(args: any): Promise<{
        currentSound: import("../types.js").SoundDefinition;
        soundFilePath: string;
    }>;
} | {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            tokens: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    output: {
        schema: {
            type: string;
        };
        render: (_args: any, res: any) => {
            type: string;
            text: string;
        }[];
    };
    execute(args: any): Promise<{
        tokensPerMerit: number;
        tokensConsumed: number;
        truncatedTokens?: number;
        pendingTokens: number;
        knocksTriggered: number;
        meritGained: number;
        todayMerit: number;
        totalMerit: number;
        todayTokens: number;
        totalTokens: number;
        knockResults: import("../types.js").KnockResult[];
    }>;
})[];
//# sourceMappingURL=index.d.ts.map