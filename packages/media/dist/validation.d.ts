import { type MediaOwnerType, type MediaPurpose } from "./index.js";
export type ValidatedMediaFile = {
    contentType: string;
    canonicalExtension: string;
    width: number | null;
    height: number | null;
    sha256: string;
};
export declare class MediaValidationError extends Error {
    readonly code: string;
    constructor(message: string, code?: string);
}
export declare function canonicalDeclaredMediaExtension(fileName: string): string;
export declare function sha256Hex(bytes: Uint8Array): Promise<string>;
export declare function validateMediaBytes(input: {
    bytes: Uint8Array;
    purpose: MediaPurpose;
    fileName: string;
    declaredContentType: string;
}): Promise<ValidatedMediaFile>;
export declare function buildMediaObjectKey(input: {
    environment: "dev" | "test" | "prod";
    ownerType: MediaOwnerType;
    ownerId: string;
    purpose: MediaPurpose;
    intentId: string;
    issuedAt: number | Date;
    canonicalExtension: string;
}): string;
export declare function buildQuarantineObjectKey(environment: "dev" | "test" | "prod", intentId: string): string;

