/**
 * In-browser Web Audio synthesized & preset player for Whale Companion.
 * Supports whale song acoustics and traditional temple resonance:
 * - whale_deep (蓝鲸深鸣): deep low-frequency ocean resonance and vocal glides
 * - whale_song (座头长歌): soaring ethereal melodic whale arch with shimmer
 * - whale_echo (虎鲸清越): crisp high-frequency chirp and underwater sonar echo
 * - whale_52hz (52Hz 低语): organic 52Hz sine hum and rhythmic ocean pulse
 * - sandalwood (紫檀沉音): deep temple wood resonance
 * - whitewood  (清脆白木): bright crisp wooden block
 * - bell       (古刹清磬): bronze singing bowl harmonics
 */
import type { MuyuSoundType } from '../types.js';
export interface SoundPresetOption {
    id: MuyuSoundType;
    name: string;
    description: string;
}
export declare const CLIENT_SOUND_PRESETS: SoundPresetOption[];
export declare class MuyuWebAudioPlayer {
    private ctx;
    private currentSound;
    volume: number;
    /** Independent from the speech voice toggle: mute only the percussion/whale sound. */
    muted: boolean;
    constructor(initialSound?: MuyuSoundType);
    private initContext;
    setSoundType(type: MuyuSoundType): void;
    getSoundType(): MuyuSoundType;
    getSoundPresets(): SoundPresetOption[];
    /**
     * Synthesize real physical whale calls, wooden fish or temple bell percussion using Web Audio oscillators & filters
     */
    playWoodenSound(overrideType?: MuyuSoundType): void;
    dispose(): void;
}
//# sourceMappingURL=sound-player.d.ts.map