/**
 * DeepSeek 3D Whale Companion Floating Widget UI
 * Features:
 * - Deep-ocean sapphire & cyan glassmorphism palette
 * - Real-time LLM speech bubble with live speaking indicator
 * - 3D Whale Girl stage (Canvas 3D + external GLTF/GLB model slot)
 * - Rhythmic wooden-fish accompaniment controls & unified settings modal
 */
import type { MuyuSoundType, SpeechSegment } from '../types.js';
import type { SoundPresetOption } from './sound-player.js';
export interface MeritHistoryItem {
    dateKey: string;
    displayDate: string;
    count: number;
    tokens?: number;
}
export interface FemalePersonaOption {
    id: string;
    name: string;
    persona: string;
    tag: string;
    description: string;
    rate: number;
    pitch: number;
    volume: number;
}
export interface VoiceItem {
    id: string;
    name: string;
    lang: string;
    description: string;
    isCantonese: boolean;
    isFemale?: boolean;
    personaId?: string;
}
export interface WhaleWidgetOptions {
    onKnock?: () => void;
    onToggleAuto?: () => void;
    onToggleVoice?: (enabled: boolean) => void;
    onToggleSound?: (enabled: boolean) => void;
    onTestSpeak?: (text: string) => void;
    getAccompanimentIntervalMs?: () => number;
    onSetAccompanimentIntervalMs?: (intervalMs: number) => Promise<boolean> | boolean | void;
    getModelUrl?: () => string;
    onSetModelUrl?: (url: string) => Promise<boolean> | boolean | void;
    getRecentSpeeches?: () => SpeechSegment[];
    getTokensPerMerit?: () => number;
    onSetTokensPerMerit?: (value: number) => Promise<boolean> | boolean | void;
    isTokensPerMeritSupported?: () => boolean;
    onSelectVoice?: (voiceId: string) => void;
    onSelectPersona?: (personaId: string) => void;
    getPersonas?: () => FemalePersonaOption[];
    getCurrentPersonaId?: () => string;
    onSelectSound?: (soundId: MuyuSoundType) => void;
    onOpenMerit?: () => void;
    getVoiceList?: () => VoiceItem[];
    getCurrentVoiceId?: () => string;
    getSoundPresets?: () => SoundPresetOption[];
    getCurrentSoundId?: () => MuyuSoundType;
    initialVoiceEnabled?: boolean;
    initialSoundEnabled?: boolean;
    initialModelUrl?: string;
    getMeritRecords: () => {
        todayMerit: number;
        totalMerit: number;
        todayTokens?: number;
        totalTokens?: number;
        pendingTokens?: number;
        records: MeritHistoryItem[];
    };
}
export declare function createWhaleFloatingPet(options: WhaleWidgetOptions): {
    mount(target?: HTMLElement): void;
    unmount: () => void;
    update(merit: number, speechText: string, isAutoRunning?: boolean, tokenStats?: {
        todayTokens: number;
        totalTokens: number;
    }, isSpeaking?: boolean): void;
    setSpeaking(active: boolean, level?: number): void;
    pulseSpeechSyllable(): void;
    loadExternalModel(url: string): void;
    triggerKnockEffect: (text?: string) => void;
    animateKnock: () => void;
};
//# sourceMappingURL=widget-ui.d.ts.map