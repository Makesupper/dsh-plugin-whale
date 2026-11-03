/**
 * Zero-dependency Canvas whale-maid companion with depth/parallax and a GLTF hook.
 * The layered quadratic contours follow the reference's chibi proportions,
 * muted blue curls, ivory lace, navy dress, and whale-tail silhouette.
 * Pointer look, breathing, blinking, speech, knock ripples, and the floating
 * plate share the existing stage lifecycle. This is a stylized 2.5D drawing;
 * loadExternalModel() can hand off to a registered <model-viewer> for a 3D mesh.
 */
export interface WhaleStage3DOptions {
    modelUrl?: string;
}
export declare class WhaleStage3D {
    private container;
    private canvas;
    private externalSlot;
    private rafId;
    private viewCanvases;
    private startTime;
    private lastFrameTime;
    private speaking;
    private mouthLevel;
    private targetMouthLevel;
    private knockBounce;
    private static readonly MAX_LOOK_YAW;
    private static readonly MAX_LOOK_PITCH;
    private lookYaw;
    private lookPitch;
    private modelUrl;
    private ripples;
    private bubbles;
    private customEventHandler;
    constructor(options?: WhaleStage3DOptions);
    mount(container: HTMLElement): void;
    setPointerLook(normX: number, normY: number): void;
    setSpeaking(active: boolean, level?: number): void;
    pulseSpeechSyllable(): void;
    triggerKnockWave(): void;
    /**
     * Load an external .glb / .gltf 3D model if provided. If modelUrl is empty, reverts to procedural 3D whale girl.
     */
    loadExternalModel(url: string): void;
    getModelUrl(): string;
    private rotate3D;
    private project;
    private renderFrame;
    private drawPlate;
    private drawTurningCharacter;
    /** Cached quadratic contours, in the character's 300-unit design space. */
    private readonly contours;
    private shape;
    private oval;
    private gradient;
    private drawRibbon;
    private drawBackHair;
    private drawTail;
    private drawDress;
    private drawHeadband;
    private drawFin;
    private drawEyes;
    private drawHead;
    private drawProfile;
    private drawCharacter;
    private startLoop;
    dispose(): void;
}
//# sourceMappingURL=whale-stage-3d.d.ts.map