/**
 * Cross-platform LLM Response Speech Synthesizer (Web Speech API)
 * Features:
 * - Reads real-time LLM response sentences using browser Web Speech API.
 * - Supports curated female voice personas (萌系鲸鱼娘、元气甜心、知性御姐、空灵海妖、温柔大姐姐、粤语少女等).
 * - Emits speaking state & boundary callbacks to drive 3D Whale lip-sync and wooden-fish accompaniment.
 * - Clean listener lifecycle and fallback timeout safety.
 */
export interface FemaleVoicePreset {
    id: string;
    name: string;
    persona: string;
    tag: string;
    description: string;
    rate: number;
    pitch: number;
    volume: number;
    matchKeywords: string[];
}
export declare const FEMALE_VOICE_PERSONAS: FemaleVoicePreset[];
export interface VoiceOption {
    id: string;
    name: string;
    lang: string;
    description: string;
    isCantonese: boolean;
    isFemale: boolean;
    personaId?: string;
}
export interface SpeechPreferences {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceId?: string;
    personaId?: string;
}
export declare class WhaleSpeechSynthesizer {
    private synth;
    private voice;
    private selectedVoiceId;
    private currentPersonaId;
    private voicesChangedHandler;
    private fallbackTimer;
    private activeSpeaking;
    enabled: boolean;
    rate: number;
    pitch: number;
    volume: number;
    onSpeakStart?: (text: string) => void;
    onSpeakBoundary?: (charIndex: number) => void;
    onSentenceEnd?: () => void;
    onVoicesLoaded?: (voices: VoiceOption[], currentId: string) => void;
    constructor(prefs?: SpeechPreferences);
    getPersonas(): FemaleVoicePreset[];
    getCurrentPersonaId(): string;
    setPersona(personaId: string): boolean;
    private pickBestVoiceForPersona;
    private initVoice;
    checkIsCantonese(v: SpeechSynthesisVoice): boolean;
    checkIsFemale(v: SpeechSynthesisVoice): boolean;
    private notifyVoicesLoaded;
    getAvailableVoiceOptions(): VoiceOption[];
    setVoice(voiceId: string): boolean;
    getSelectedVoiceId(): string;
    isSpeaking(): boolean;
    speakSentence(text: string, onEnd?: () => void): void;
    stop(): void;
    dispose(): void;
}
//# sourceMappingURL=speech-synthesizer.d.ts.map