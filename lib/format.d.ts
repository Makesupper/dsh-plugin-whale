export declare function formatTokenCount(value: unknown): string;
/** Unit-bearing token label; "圆满" already reads as a unit, so it gets no "Tokens" suffix. */
export declare function formatTokenLabel(value: unknown): string;
/** Merit counts use thousands separators, including negative deduction-mode values. */
export declare function formatMeritCount(value: unknown): string;
/**
 * Format whale weight in kg or tonnes (t).
 * When >= 1000 kg (or <= -1000 kg), format as tonnes 't' (e.g. 1000 kg -> 1t, 1250 kg -> 1.25t, 25000 kg -> 25t).
 * Otherwise, format as kg (e.g. 50 kg -> 50kg, 0 kg -> 0kg).
 */
export declare function formatWhaleWeight(value: unknown): string;
/**
 * Format daily weight gain/loss delta (e.g. "+50kg", "+1.2t", "-5kg").
 */
export declare function formatWeightDelta(value: unknown): string;
//# sourceMappingURL=format.d.ts.map