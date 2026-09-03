import type { MediaAssetView, MediaPurpose } from "./index.js";
export type TrustedMediaFile = {
    clientId: string;
    name: string;
    type: string;
    size: number;
    body: Blob | ArrayBuffer | Uint8Array;
};
export type TrustedMediaProgress = {
    clientId: string;
    loadedBytes: number;
    totalBytes: number;
    percent: number;
};
export type TrustedMediaUploaderOptions = {
    purpose: MediaPurpose;
    files: TrustedMediaFile[];
    apiRequest: (path: string, init: RequestInit) => Promise<Response>;
    apiBasePath?: string;
    signal?: AbortSignal;
    onProgress?: (progress: TrustedMediaProgress) => void;
    maxUploadAttempts?: number;
    scanPollIntervalMs?: number;
    scanTimeoutMs?: number;
    registrationChallengeId?: string;
};
declare class TrustedMediaUploadError extends Error {
    readonly status: number | null;
    readonly code: string;
    constructor(message: string, status?: number | null, code?: string);
}
export declare function uploadTrustedMedia(options: TrustedMediaUploaderOptions): Promise<MediaAssetView[]>;
export { TrustedMediaUploadError };

