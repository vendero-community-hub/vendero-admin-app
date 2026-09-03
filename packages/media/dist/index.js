export const MEDIA_CONTRACT_VERSION = 1;
export const mediaPurposes = [
    "registration.selfie",
    "registration.kyc",
    "profile.avatar",
    "profile.business-logo-source",
    "profile.business-logo",
    "profile.business-logo-svg",
    "driver.photo",
    "driver.document",
    "cab.image",
    "cab.document",
    "chat.image",
    "chat.document",
    "chat.audio",
    "chat.video",
    "support.attachment",
    "support.image",
    "crm.expense-image",
    "crm.expense-document",
    "crm.signature",
    "marketing.banner",
    "marketing.banner-video",
    "marketing.banner-detail-image",
    "marketing.vendor-post",
    "marketing.instagram-post",
    "white-label.branding",
    "marketplace.profile-logo",
    "marketplace.banner",
    "marketplace.gallery",
    "marketplace.cab-image",
    "marketplace.service-image",
    "site.logo",
    "site.hero",
    "site.catalog-image",
    "site.route-image",
    "site.package-image",
    "site.blog-cover",
    "site.theme-asset",
    "store.service-image",
    "platform.store-service-image",
    "platform.store-service-document",
    "platform.store-request-receipt",
    "platform.store-request-receipt-image",
    "platform.site-theme-asset",
    "platform.feature-card-image",
    "platform.feature-card-video",
    "platform.support-image",
    "platform.support-document",
    "ai.reference",
    "ai.generated",
    "ai.provider-artifact",
    "whatsapp.profile-photo",
    "whatsapp.catalog-image",
    "whatsapp.carousel-image",
    "whatsapp.template-image",
    "whatsapp.template-video",
    "whatsapp.template-document",
    "whatsapp.knowledge",
    "whatsapp.inbound",
    "whatsapp.outbound",
    "platform.whatsapp-inbound",
    "platform.whatsapp-outbound",
    "admin.image-library",
    "platform.banner",
    "platform.banner-video",
    "platform.banner-detail-image",
];
const MB = 1024 * 1024;
const FIVE_MB = 5 * MB;
const TEN_MB = 10 * MB;
const FIFTEEN_MB = 15 * MB;
const TWENTY_FIVE_MB = 25 * MB;
const FIFTY_MB = 50 * MB;
const standardImages = ["image/jpeg", "image/png", "image/webp"];
const standardImageExtensions = ["jpg", "jpeg", "png", "webp"];
const postImages = [...standardImages, "image/gif"];
const postImageExtensions = [...standardImageExtensions, "gif"];
const documents = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
    "text/markdown",
];
const documentExtensions = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "csv",
    "txt",
    "md",
];
const kycDocuments = [...standardImages, "application/pdf"];
const kycExtensions = [...standardImageExtensions, "pdf"];
const audioTypes = [
    "audio/aac",
    "audio/amr",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/opus",
    "audio/wav",
    "audio/webm",
];
const audioExtensions = [
    "aac",
    "amr",
    "m4a",
    "mp3",
    "ogg",
    "opus",
    "wav",
    "webm",
];
const videoTypes = ["video/mp4", "video/quicktime"];
const videoExtensions = ["mp4", "mov"];
function imagePolicy(purpose, path, visibility, options = {}) {
    return {
        purpose,
        path,
        kind: "image",
        visibility,
        maxSizeBytes: FIVE_MB,
        acceptedContentTypes: standardImages,
        acceptedExtensions: standardImageExtensions,
        scan: "none",
        actor: "user",
        maxImagePixels: 25_000_000,
        ...options,
    };
}
function documentPolicy(purpose, path, options = {}) {
    return {
        purpose,
        path,
        kind: "document",
        visibility: "private",
        maxSizeBytes: FIVE_MB,
        acceptedContentTypes: documents,
        acceptedExtensions: documentExtensions,
        scan: "malware",
        actor: "user",
        ...options,
    };
}
const policyList = [
    imagePolicy("registration.selfie", "registration/selfie", "private"),
    documentPolicy("registration.kyc", "registration/kyc", {
        acceptedContentTypes: kycDocuments,
        acceptedExtensions: kycExtensions,
    }),
    imagePolicy("profile.avatar", "profile/avatar", "public"),
    imagePolicy("profile.business-logo-source", "profile/business-logo/source", "private", {
        maxImagePixels: 20_000_000,
    }),
    imagePolicy("profile.business-logo", "profile/business-logo/output", "public", {
        actor: "service",
        maxSizeBytes: TEN_MB,
        maxImagePixels: 20_000_000,
    }),
    {
        purpose: "profile.business-logo-svg",
        path: "profile/business-logo/svg",
        kind: "image",
        visibility: "public",
        maxSizeBytes: FIVE_MB,
        acceptedContentTypes: ["image/svg+xml"],
        acceptedExtensions: ["svg"],
        scan: "none",
        actor: "service",
        maxImagePixels: 20_000_000,
    },
    imagePolicy("driver.photo", "drivers/photo", "private"),
    documentPolicy("driver.document", "drivers/documents"),
    imagePolicy("cab.image", "cabs/images", "public"),
    documentPolicy("cab.document", "cabs/documents"),
    imagePolicy("chat.image", "chat/images", "private", {
        acceptedContentTypes: postImages,
        acceptedExtensions: postImageExtensions,
    }),
    documentPolicy("chat.document", "chat/documents"),
    {
        purpose: "chat.audio",
        path: "chat/audio",
        kind: "audio",
        visibility: "private",
        maxSizeBytes: FIFTEEN_MB,
        acceptedContentTypes: audioTypes,
        acceptedExtensions: audioExtensions,
        scan: "media-probe",
        actor: "user",
        maxDurationSeconds: 5 * 60,
    },
    {
        purpose: "chat.video",
        path: "chat/video",
        kind: "video",
        visibility: "private",
        maxSizeBytes: FIVE_MB,
        acceptedContentTypes: videoTypes,
        acceptedExtensions: videoExtensions,
        scan: "media-probe",
        actor: "user",
    },
    documentPolicy("support.attachment", "support/attachments"),
    imagePolicy("support.image", "support/images", "private"),
    imagePolicy("crm.expense-image", "crm/expenses/images", "private"),
    documentPolicy("crm.expense-document", "crm/expenses/documents"),
    imagePolicy("crm.signature", "crm/signatures", "private"),
    imagePolicy("marketing.banner", "marketing/banners", "public", {
        maxSizeBytes: TEN_MB,
        requiredWidth: 1200,
        requiredHeight: 500,
    }),
    {
        purpose: "marketing.banner-video",
        path: "marketing/banner-videos",
        kind: "video",
        visibility: "public",
        maxSizeBytes: FIVE_MB,
        acceptedContentTypes: videoTypes,
        acceptedExtensions: videoExtensions,
        scan: "media-probe",
        actor: "user",
    },
    imagePolicy("marketing.banner-detail-image", "marketing/banner-details", "public", {
        maxSizeBytes: TEN_MB,
    }),
    imagePolicy("marketing.vendor-post", "marketing/vendor-posts", "public", {
        actor: "both",
        acceptedContentTypes: postImages,
        acceptedExtensions: postImageExtensions,
    }),
    imagePolicy("marketing.instagram-post", "marketing/instagram-posts", "public", {
        actor: "both",
    }),
    imagePolicy("white-label.branding", "white-label/branding", "public"),
    imagePolicy("marketplace.profile-logo", "marketplace/profile/logo", "public"),
    imagePolicy("marketplace.banner", "marketplace/profile/banner", "public"),
    imagePolicy("marketplace.gallery", "marketplace/gallery", "public"),
    imagePolicy("marketplace.cab-image", "marketplace/cabs", "public"),
    imagePolicy("marketplace.service-image", "marketplace/services", "public"),
    imagePolicy("site.logo", "site/logo", "public", { actor: "both" }),
    imagePolicy("site.hero", "site/hero", "public", { actor: "both" }),
    imagePolicy("site.catalog-image", "site/catalog", "public", {
        actor: "both",
    }),
    imagePolicy("site.route-image", "site/routes", "public", { actor: "both" }),
    imagePolicy("site.package-image", "site/packages", "public", {
        actor: "both",
    }),
    imagePolicy("site.blog-cover", "site/blog", "public", { actor: "both" }),
    imagePolicy("site.theme-asset", "site/themes", "public", { actor: "both" }),
    imagePolicy("store.service-image", "store/services", "public"),
    imagePolicy("platform.store-service-image", "store/services/images", "public"),
    documentPolicy("platform.store-service-document", "store/services/documents", {
        visibility: "public",
    }),
    documentPolicy("platform.store-request-receipt", "store/requests/receipts"),
    imagePolicy("platform.store-request-receipt-image", "store/requests/receipt-images", "private"),
    imagePolicy("platform.site-theme-asset", "sites/theme-assets", "public"),
    imagePolicy("platform.feature-card-image", "platform/features/images", "public"),
    {
        purpose: "platform.feature-card-video",
        path: "platform/features/videos",
        kind: "video",
        visibility: "public",
        maxSizeBytes: FIVE_MB,
        acceptedContentTypes: videoTypes,
        acceptedExtensions: videoExtensions,
        scan: "media-probe",
        actor: "user",
    },
    imagePolicy("platform.support-image", "support/images", "private"),
    documentPolicy("platform.support-document", "support/documents"),
    imagePolicy("ai.reference", "ai/references", "private", { actor: "both" }),
    imagePolicy("ai.generated", "ai/generated", "private", {
        actor: "service",
        maxSizeBytes: FIFTY_MB,
        maxImagePixels: 40_000_000,
    }),
    {
        purpose: "ai.provider-artifact",
        path: "ai/provider-artifacts",
        kind: "document",
        visibility: "private",
        maxSizeBytes: FIFTY_MB,
        acceptedContentTypes: ["application/vnd.vendero.logo-batch"],
        acceptedExtensions: ["vlogob"],
        scan: "none",
        actor: "service",
    },
    imagePolicy("whatsapp.profile-photo", "whatsapp/profile", "private"),
    imagePolicy("whatsapp.catalog-image", "whatsapp/catalog", "private"),
    imagePolicy("whatsapp.carousel-image", "whatsapp/carousel", "private"),
    imagePolicy("whatsapp.template-image", "whatsapp/templates/images", "private"),
    {
        purpose: "whatsapp.template-video",
        path: "whatsapp/templates/videos",
        kind: "video",
        visibility: "private",
        maxSizeBytes: FIVE_MB,
        acceptedContentTypes: ["video/mp4"],
        acceptedExtensions: ["mp4"],
        scan: "media-probe",
        actor: "user",
    },
    documentPolicy("whatsapp.template-document", "whatsapp/templates/documents"),
    documentPolicy("whatsapp.knowledge", "whatsapp/knowledge", {
        maxSizeBytes: TEN_MB,
    }),
    {
        purpose: "whatsapp.inbound",
        path: "whatsapp/inbound",
        kind: "document",
        visibility: "private",
        maxSizeBytes: TWENTY_FIVE_MB,
        acceptedContentTypes: [
            ...documents,
            ...postImages,
            ...audioTypes,
            ...videoTypes,
        ],
        acceptedExtensions: [
            ...documentExtensions,
            ...postImageExtensions,
            ...audioExtensions,
            ...videoExtensions,
        ],
        scan: "malware",
        actor: "service",
    },
    {
        purpose: "whatsapp.outbound",
        path: "whatsapp/outbound",
        kind: "document",
        visibility: "private",
        maxSizeBytes: TWENTY_FIVE_MB,
        acceptedContentTypes: [
            ...documents,
            ...postImages,
            ...audioTypes,
            ...videoTypes,
        ],
        acceptedExtensions: [
            ...documentExtensions,
            ...postImageExtensions,
            ...audioExtensions,
            ...videoExtensions,
        ],
        scan: "malware",
        actor: "both",
    },
    {
        purpose: "platform.whatsapp-inbound",
        path: "whatsapp/inbound",
        kind: "document",
        visibility: "private",
        maxSizeBytes: TWENTY_FIVE_MB,
        acceptedContentTypes: [
            ...documents,
            ...postImages,
            ...audioTypes,
            ...videoTypes,
        ],
        acceptedExtensions: [
            ...documentExtensions,
            ...postImageExtensions,
            ...audioExtensions,
            ...videoExtensions,
        ],
        scan: "malware",
        actor: "service",
    },
    {
        purpose: "platform.whatsapp-outbound",
        path: "whatsapp/outbound",
        kind: "document",
        visibility: "private",
        maxSizeBytes: TWENTY_FIVE_MB,
        acceptedContentTypes: [
            ...documents,
            ...postImages,
            ...audioTypes,
            ...videoTypes,
        ],
        acceptedExtensions: [
            ...documentExtensions,
            ...postImageExtensions,
            ...audioExtensions,
            ...videoExtensions,
        ],
        scan: "malware",
        actor: "both",
    },
    imagePolicy("admin.image-library", "admin/image-library", "private"),
    imagePolicy("platform.banner", "platform/banners", "public", {
        maxSizeBytes: TEN_MB,
        requiredWidth: 1200,
        requiredHeight: 500,
    }),
    {
        purpose: "platform.banner-video",
        path: "platform/banner-videos",
        kind: "video",
        visibility: "public",
        maxSizeBytes: FIVE_MB,
        acceptedContentTypes: videoTypes,
        acceptedExtensions: videoExtensions,
        scan: "media-probe",
        actor: "user",
    },
    imagePolicy("platform.banner-detail-image", "platform/banner-details", "public", {
        maxSizeBytes: TEN_MB,
    }),
];
export const mediaPurposePolicies = Object.freeze(Object.fromEntries(policyList.map((policy) => [policy.purpose, Object.freeze(policy)])));
export const mediaPublishTargets = Object.freeze({
    "profile.business-logo-source": ["profile.business-logo"],
    "chat.image": ["marketing.vendor-post", "marketing.instagram-post"],
    "ai.generated": [
        "profile.business-logo",
        "site.logo",
        "site.hero",
        "site.catalog-image",
        "site.route-image",
        "site.package-image",
        "site.blog-cover",
        "site.theme-asset",
        "marketing.vendor-post",
        "marketing.instagram-post",
    ],
    "admin.image-library": [
        "platform.site-theme-asset",
        "platform.feature-card-image",
        "platform.banner",
        "platform.banner-detail-image",
    ],
});
export function canPublishMediaPurpose(source, target) {
    return mediaPublishTargets[source]?.includes(target) ?? false;
}
export function isMediaPurpose(value) {
    return (typeof value === "string" && Object.hasOwn(mediaPurposePolicies, value));
}
export function getMediaPurposePolicy(value) {
    if (!isMediaPurpose(value))
        throw new Error("Unknown media purpose");
    return mediaPurposePolicies[value];
}
function runtimeTextEncoder() {
    const Constructor = globalThis.TextEncoder;
    if (!Constructor)
        throw new Error("TextEncoder is not available in this runtime");
    return new Constructor();
}
function runtimeTextDecoder() {
    const Constructor = globalThis.TextDecoder;
    if (!Constructor)
        throw new Error("TextDecoder is not available in this runtime");
    return new Constructor();
}
function runtimeCrypto() {
    const value = globalThis.crypto;
    if (!value?.subtle)
        throw new Error("Web Crypto is not available in this runtime");
    return value;
}
function runtimeBase64(method, value) {
    const codec = globalThis[method];
    if (!codec)
        throw new Error(`${method} is not available in this runtime`);
    return codec(value);
}
function bytesToBase64Url(bytes) {
    let binary = "";
    for (const byte of bytes)
        binary += String.fromCharCode(byte);
    return runtimeBase64("btoa", binary)
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/u, "");
}
function base64UrlToBytes(value) {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/") +
        "=".repeat((4 - (value.length % 4)) % 4);
    const binary = runtimeBase64("atob", padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1)
        bytes[index] = binary.charCodeAt(index);
    return bytes;
}
export function encodeMediaTokenPayload(value) {
    return bytesToBase64Url(runtimeTextEncoder().encode(JSON.stringify(value)));
}
export function decodeMediaTokenPayload(value) {
    const parsed = JSON.parse(runtimeTextDecoder().decode(base64UrlToBytes(value)));
    if (!parsed ||
        parsed.v !== MEDIA_CONTRACT_VERSION ||
        typeof parsed.typ !== "string") {
        throw new Error("Invalid media token payload");
    }
    return parsed;
}
async function hmacKey(secret, usage) {
    if (runtimeTextEncoder().encode(secret).byteLength < 32) {
        throw new Error("Media signing secrets must be at least 32 bytes");
    }
    return runtimeCrypto().subtle.importKey("raw", runtimeTextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}
export async function signMediaToken(claims, kid, secret) {
    if (!/^[a-zA-Z0-9_-]{1,40}$/u.test(kid))
        throw new Error("Invalid media signing key id");
    const payload = encodeMediaTokenPayload(claims);
    const signingInput = `v${MEDIA_CONTRACT_VERSION}.${kid}.${payload}`;
    const signature = await runtimeCrypto().subtle.sign("HMAC", await hmacKey(secret, "sign"), runtimeTextEncoder().encode(signingInput));
    return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
}
export async function verifyMediaToken(token, secrets, expectedType, nowSeconds = Math.floor(Date.now() / 1000)) {
    const [version, kid, payload, signature, ...rest] = token.split(".");
    if (rest.length ||
        version !== `v${MEDIA_CONTRACT_VERSION}` ||
        !kid ||
        !payload ||
        !signature) {
        throw new Error("Invalid media token");
    }
    const secret = secrets[kid];
    if (!secret)
        throw new Error("Unknown media signing key");
    const signingInput = `${version}.${kid}.${payload}`;
    const valid = await runtimeCrypto().subtle.verify("HMAC", await hmacKey(secret, "verify"), base64UrlToBytes(signature), runtimeTextEncoder().encode(signingInput));
    if (!valid)
        throw new Error("Invalid media token signature");
    const claims = decodeMediaTokenPayload(payload);
    if (claims.typ !== expectedType)
        throw new Error("Unexpected media token type");
    if (!Number.isInteger(claims.expiresAt) || claims.expiresAt <= nowSeconds) {
        throw new Error("Media token expired");
    }
    if (!Number.isInteger(claims.issuedAt) || claims.issuedAt > nowSeconds + 30) {
        throw new Error("Invalid media token issue time");
    }
    return claims;
}
export function mediaPolicyView(policy) {
    return {
        purpose: policy.purpose,
        kind: policy.kind,
        visibility: policy.visibility,
        maxSizeBytes: policy.maxSizeBytes,
        acceptedContentTypes: policy.acceptedContentTypes,
        acceptedExtensions: policy.acceptedExtensions,
        scanRequired: policy.scan !== "none",
        ...(policy.requiredWidth ? { requiredWidth: policy.requiredWidth } : {}),
        ...(policy.requiredHeight ? { requiredHeight: policy.requiredHeight } : {}),
        ...(policy.maxDurationSeconds
            ? { maxDurationSeconds: policy.maxDurationSeconds }
            : {}),
    };
}
export function normalizePublicMediaBaseUrl(value) {
    const UrlConstructor = globalThis.URL;
    if (!UrlConstructor)
        throw new Error("URL is not available in this runtime");
    const url = new UrlConstructor(value);
    if (url.protocol !== "https:" &&
        url.hostname !== "localhost" &&
        url.hostname !== "127.0.0.1") {
        throw new Error("Public media base URL must use HTTPS");
    }
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/+$/u, "");
}
export function publicMediaUrl(baseUrl, objectKey) {
    assertMediaObjectKey(objectKey);
    const encodedKey = objectKey.split("/").map(encodeURIComponent).join("/");
    return `${normalizePublicMediaBaseUrl(baseUrl)}/${encodedKey}`;
}
export function assertMediaObjectKey(value) {
    if (!/^v1\/(dev|test|prod)\/(vendors\/[1-9][0-9]*|platform)\/[a-z0-9][a-z0-9/-]*\/[0-9]{4}\/[0-9]{2}\/[a-zA-Z0-9_-]{8,80}\.[a-z0-9]{2,8}$/u.test(value) ||
        value.includes("..") ||
        value.includes("://")) {
        throw new Error("Invalid media object key");
    }
    return value;
}
export function extensionFromFileName(value) {
    return (value
        .trim()
        .toLowerCase()
        .match(/\.([a-z0-9]{1,12})$/u)?.[1] ?? null);
}

