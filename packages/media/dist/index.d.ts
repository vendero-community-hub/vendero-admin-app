export declare const MEDIA_CONTRACT_VERSION: 1;
export declare const mediaPurposes: readonly ["registration.selfie", "registration.kyc", "profile.avatar", "profile.business-logo-source", "profile.business-logo", "profile.business-logo-svg", "driver.photo", "driver.document", "cab.image", "cab.document", "chat.image", "chat.document", "chat.audio", "chat.video", "support.attachment", "support.image", "crm.expense-image", "crm.expense-document", "crm.signature", "marketing.banner", "marketing.banner-video", "marketing.banner-detail-image", "marketing.vendor-post", "marketing.instagram-post", "white-label.branding", "marketplace.profile-logo", "marketplace.banner", "marketplace.gallery", "marketplace.cab-image", "marketplace.service-image", "site.logo", "site.hero", "site.catalog-image", "site.route-image", "site.package-image", "site.blog-cover", "site.theme-asset", "store.service-image", "platform.store-service-image", "platform.store-service-document", "platform.store-request-receipt", "platform.store-request-receipt-image", "platform.site-theme-asset", "platform.feature-card-image", "platform.feature-card-video", "platform.support-image", "platform.support-document", "ai.reference", "ai.generated", "ai.provider-artifact", "whatsapp.profile-photo", "whatsapp.catalog-image", "whatsapp.carousel-image", "whatsapp.template-image", "whatsapp.template-video", "whatsapp.template-document", "whatsapp.knowledge", "whatsapp.inbound", "whatsapp.outbound", "platform.whatsapp-inbound", "platform.whatsapp-outbound", "admin.image-library", "platform.banner", "platform.banner-video", "platform.banner-detail-image"];
export type MediaPurpose = (typeof mediaPurposes)[number];
export type MediaVisibility = "public" | "private";
export type MediaOwnerType = "vendor" | "platform";
export type MediaActorType = "user" | "service" | "registration";
export type MediaAssetStatus = "pending_scan" | "ready" | "rejected" | "pending_delete" | "deleted";
export type MediaScanKind = "none" | "malware" | "media-probe";
export type MediaKind = "image" | "document" | "audio" | "video";
export interface MediaPurposePolicy {
    purpose: MediaPurpose;
    path: string;
    kind: MediaKind;
    visibility: MediaVisibility;
    maxSizeBytes: number;
    acceptedContentTypes: readonly string[];
    acceptedExtensions: readonly string[];
    scan: MediaScanKind;
    actor: "user" | "service" | "both";
    maxImagePixels?: number;
    requiredWidth?: number;
    requiredHeight?: number;
    maxDurationSeconds?: number;
}
export declare const mediaPurposePolicies: Readonly<Record<MediaPurpose, Readonly<MediaPurposePolicy>>>;
export declare const mediaPublishTargets: Readonly<Partial<Record<MediaPurpose, readonly MediaPurpose[]>>>;
export declare function canPublishMediaPurpose(source: MediaPurpose, target: MediaPurpose): boolean;
export declare function isMediaPurpose(value: unknown): value is MediaPurpose;
export declare function getMediaPurposePolicy(value: unknown): Readonly<MediaPurposePolicy>;
export interface UploadIntentFileInput {
    clientId: string;
    fileName: string;
    declaredContentType: string;
    sizeBytes: number;
}
export interface UploadIntentRequest {
    purpose: MediaPurpose;
    files: UploadIntentFileInput[];
}
export interface UploadIntentPolicyView {
    purpose: MediaPurpose;
    kind: MediaKind;
    visibility: MediaVisibility;
    maxSizeBytes: number;
    acceptedContentTypes: readonly string[];
    acceptedExtensions: readonly string[];
    scanRequired: boolean;
    requiredWidth?: number;
    requiredHeight?: number;
    maxDurationSeconds?: number;
}
export interface UploadIntentItem {
    clientId: string;
    intentId: string;
    objectKey: string;
    uploadUrl: string;
    uploadHeaders: Readonly<Record<string, string>>;
    uploadReceipt: string;
    expiresAt: string;
    policy: UploadIntentPolicyView;
}
export interface UploadIntentResponse {
    intents: UploadIntentItem[];
}
export interface UploadCommitInput {
    objectKey: string;
    uploadReceipt: string;
}
export interface MediaPointer {
    objectKey: string;
}
export interface MediaAssetView {
    id: string;
    objectKey: string;
    url: string | null;
    visibility: MediaVisibility;
    purpose: MediaPurpose;
    contentType: string;
    sizeBytes: number;
    status: MediaAssetStatus;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
    createdAt: string;
    readyAt: string | null;
}
export interface UploadReceiptClaims {
    v: typeof MEDIA_CONTRACT_VERSION;
    typ: "upload-receipt";
    jti: string;
    intentId: string;
    env: "dev" | "test" | "prod";
    actorType: MediaActorType;
    actorId: string;
    ownerType: MediaOwnerType;
    ownerId: string;
    purpose: MediaPurpose;
    objectKey: string;
    quarantineKey: string;
    visibility: MediaVisibility;
    declaredContentType: string;
    canonicalExtension: string;
    sizeBytes: number;
    issuedAt: number;
    expiresAt: number;
}
export type MediaSignedClaims = UploadReceiptClaims;
export declare function encodeMediaTokenPayload(value: MediaSignedClaims): string;
export declare function decodeMediaTokenPayload(value: string): MediaSignedClaims;
export declare function signMediaToken(claims: MediaSignedClaims, kid: string, secret: string): Promise<string>;
export declare function verifyMediaToken<TClaims extends MediaSignedClaims>(token: string, secrets: Readonly<Record<string, string>>, expectedType: TClaims["typ"], nowSeconds?: number): Promise<TClaims>;
export declare function mediaPolicyView(policy: Readonly<MediaPurposePolicy>): UploadIntentPolicyView;
export declare function normalizePublicMediaBaseUrl(value: string): string;
export declare function publicMediaUrl(baseUrl: string, objectKey: string): string;
export declare function assertMediaObjectKey(value: string): string;
export declare function extensionFromFileName(value: string): string | null;

