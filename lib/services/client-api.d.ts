import type { WhaleService } from './whale-service.js';
import type { AutoKnockStatus, DailyMeritRecord, SpeechSegment } from '../types.js';
export declare const WHALE_API_PREFIX = "/dsh-whale";
export declare const WHALE_API_VERSION = 2;
export interface WhaleClientState {
    apiVersion: number;
    todayMerit: number;
    totalMerit: number;
    todayTokens: number;
    totalTokens: number;
    pendingTokens: number;
    tokensPerMerit: number;
    accompanimentIntervalMs: number;
    modelUrl: string;
    todayKey: string;
    currentSpeech: SpeechSegment;
    speechSeq: number;
    ackedSpeechSeq: number;
    speechQueue: SpeechSegment[];
    knockSeq: number;
    auto: AutoKnockStatus;
    records?: DailyMeritRecord[];
}
type JsonRequest = {
    method?: string;
    url?: string;
    headers?: Record<string, string | string[] | undefined>;
    on(event: string, listener: (...args: any[]) => void): unknown;
};
type JsonResponse = {
    statusCode?: number;
    headersSent?: boolean;
    writeHead(status: number, headers: Record<string, string>): unknown;
    end(body?: string): unknown;
};
export declare function buildWhaleState(whale: WhaleService, includeHistory?: boolean, afterSpeechSeq?: number): WhaleClientState;
export declare function createWhaleRouteHandlers(whale: WhaleService, webServer?: any): {
    state: (req: JsonRequest, res: JsonResponse) => void;
    knock: (req: JsonRequest, res: JsonResponse) => void;
    auto: (req: JsonRequest, res: JsonResponse) => void;
    speechAck: (req: JsonRequest, res: JsonResponse) => void;
    tokensPerMerit: (req: JsonRequest, res: JsonResponse) => void;
};
export declare function registerWhaleClientApi(webServer: any, whale: WhaleService): () => void;
export {};
//# sourceMappingURL=client-api.d.ts.map