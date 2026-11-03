/**
 * DSH Whale Companion Client Bundle
 * Complies with DSH lazy CJS model: window.__ModuleLoader__.load({ id, factory })
 *
 * Real-Time LLM Speech + Rhythmic Wooden-Fish Accompaniment:
 * - Polls `/dsh-whale/state` for new LLM speech segments (`speechQueue`) and merit/token updates.
 * - Feeds each LLM sentence into `WhaleSpeechSynthesizer` (Web Speech API).
 * - Automatically triggers rhythmic wooden-fish accompaniment knocks while the Whale Girl is speaking,
 *   and stops the accompaniment timer automatically once the LLM speech queue finishes.
 */
export declare const name = "whale-client";
export declare const inject: string[];
export declare function apply(ctx: any): void;
//# sourceMappingURL=bundle.d.ts.map