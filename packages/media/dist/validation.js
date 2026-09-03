import { assertMediaObjectKey, extensionFromFileName, getMediaPurposePolicy, } from "./index.js";
export class MediaValidationError extends Error {
    code;
    constructor(message, code = "E_MEDIA_CONTENT_INVALID") {
        super(message);
        this.code = code;
    }
}
function normalizeContentType(value) {
    const normalized = value.split(";", 1)[0].trim().toLowerCase();
    if (normalized === "image/jpg")
        return "image/jpeg";
    if (normalized === "audio/mp3")
        return "audio/mpeg";
    if (normalized === "audio/m4a")
        return "audio/mp4";
    return normalized;
}
function startsWith(bytes, prefix) {
    return prefix.every((value, index) => bytes[index] === value);
}
function asciiAt(bytes, offset, length) {
    return String.fromCharCode(...bytes.subarray(offset, offset + length));
}
function containsAscii(bytes, needle) {
    const target = new TextEncoder().encode(needle);
    outer: for (let index = 0; index <= bytes.length - target.length; index += 1) {
        for (let part = 0; part < target.length; part += 1) {
            if (bytes[index + part] !== target[part])
                continue outer;
        }
        return true;
    }
    return false;
}
function readUint24Le(bytes, offset) {
    return ((bytes[offset] ?? 0) |
        ((bytes[offset + 1] ?? 0) << 8) |
        ((bytes[offset + 2] ?? 0) << 16));
}
function assertNoExecutableOrArchiveMagic(bytes) {
    const signatures = [
        { prefix: [0x4d, 0x5a], label: "Windows executable" },
        { prefix: [0x7f, 0x45, 0x4c, 0x46], label: "ELF executable" },
        { prefix: [0xca, 0xfe, 0xba, 0xbe], label: "executable" },
        { prefix: [0xfe, 0xed, 0xfa, 0xce], label: "Mach-O executable" },
        { prefix: [0xfe, 0xed, 0xfa, 0xcf], label: "Mach-O executable" },
        { prefix: [0xce, 0xfa, 0xed, 0xfe], label: "Mach-O executable" },
        { prefix: [0xcf, 0xfa, 0xed, 0xfe], label: "Mach-O executable" },
        { prefix: [0x00, 0x61, 0x73, 0x6d], label: "WebAssembly executable" },
        { prefix: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], label: "RAR archive" },
        { prefix: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], label: "7-Zip archive" },
        { prefix: [0x1f, 0x8b], label: "Gzip archive" },
        { prefix: [0x42, 0x5a, 0x68], label: "Bzip archive" },
        { prefix: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00], label: "XZ archive" },
    ];
    const match = signatures.find((signature) => startsWith(bytes, signature.prefix));
    if (match)
        throw new MediaValidationError(`${match.label} uploads are not allowed`);
    if (bytes.byteLength >= 262 && asciiAt(bytes, 257, 5) === "ustar") {
        throw new MediaValidationError("Tar archive uploads are not allowed");
    }
}
function assertSafeTextDocument(bytes) {
    if (bytes.includes(0))
        throw new MediaValidationError("Text documents cannot contain binary data");
    let source;
    try {
        source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    catch {
        throw new MediaValidationError("Text documents must use UTF-8 encoding");
    }
    const leading = source
        .replace(/^\uFEFF/u, "")
        .trimStart()
        .slice(0, 8_192);
    if (/^#![^\n]*(?:\b(?:ba|z|k)?sh\b|\bnode\b|\bpython[0-9.]*\b|\bperl\b|\bruby\b|\bphp\b|\bpwsh\b|powershell)/iu.test(leading) ||
        /<\s*script\b|<\?php\b|<%[@=#-]?|javascript\s*:/iu.test(leading)) {
        throw new MediaValidationError("Executable script content is not allowed");
    }
}
function jpegDimensions(bytes) {
    let offset = 2;
    while (offset + 8 < bytes.length) {
        if (bytes[offset] !== 0xff)
            break;
        const marker = bytes[offset + 1];
        offset += 2;
        if (marker === 0xd8 || marker === 0xd9)
            continue;
        const length = ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
        if (length < 2 || offset + length > bytes.length)
            break;
        if ([
            0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
            0xcf,
        ].includes(marker)) {
            return {
                height: ((bytes[offset + 3] ?? 0) << 8) | (bytes[offset + 4] ?? 0),
                width: ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0),
            };
        }
        offset += length;
    }
    return null;
}
function imageDimensions(bytes, contentType) {
    if (contentType === "image/png" && bytes.length >= 24) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    if (contentType === "image/gif" && bytes.length >= 10) {
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
    }
    if (contentType === "image/jpeg")
        return jpegDimensions(bytes);
    if (contentType === "image/webp" && bytes.length >= 30) {
        const chunk = asciiAt(bytes, 12, 4);
        if (chunk === "VP8X") {
            return {
                width: 1 + readUint24Le(bytes, 24),
                height: 1 + readUint24Le(bytes, 27),
            };
        }
        if (chunk === "VP8L" && bytes[20] === 0x2f) {
            const bits = (bytes[21] ?? 0) |
                ((bytes[22] ?? 0) << 8) |
                ((bytes[23] ?? 0) << 16) |
                ((bytes[24] ?? 0) << 24);
            return {
                width: (bits & 0x3fff) + 1,
                height: ((bits >> 14) & 0x3fff) + 1,
            };
        }
        if (chunk === "VP8 " &&
            bytes[23] === 0x9d &&
            bytes[24] === 0x01 &&
            bytes[25] === 0x2a) {
            return {
                width: ((bytes[26] ?? 0) | ((bytes[27] ?? 0) << 8)) & 0x3fff,
                height: ((bytes[28] ?? 0) | ((bytes[29] ?? 0) << 8)) & 0x3fff,
            };
        }
    }
    return null;
}
function detectFile(bytes, declaredType, extension) {
    assertNoExecutableOrArchiveMagic(bytes);
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
        return {
            contentType: "image/jpeg",
            canonicalExtension: "jpg",
            width: null,
            height: null,
        };
    }
    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
        return {
            contentType: "image/png",
            canonicalExtension: "png",
            width: null,
            height: null,
        };
    }
    if (asciiAt(bytes, 0, 4) === "RIFF" && asciiAt(bytes, 8, 4) === "WEBP") {
        return {
            contentType: "image/webp",
            canonicalExtension: "webp",
            width: null,
            height: null,
        };
    }
    if (asciiAt(bytes, 0, 6) === "GIF87a" || asciiAt(bytes, 0, 6) === "GIF89a") {
        return {
            contentType: "image/gif",
            canonicalExtension: "gif",
            width: null,
            height: null,
        };
    }
    if (asciiAt(bytes, 0, 5) === "%PDF-") {
        return {
            contentType: "application/pdf",
            canonicalExtension: "pdf",
            width: null,
            height: null,
        };
    }
    if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
        if (declaredType === "application/msword" && extension === "doc") {
            return {
                contentType: declaredType,
                canonicalExtension: extension,
                width: null,
                height: null,
            };
        }
        if (declaredType === "application/vnd.ms-excel" && extension === "xls") {
            return {
                contentType: declaredType,
                canonicalExtension: extension,
                width: null,
                height: null,
            };
        }
        throw new MediaValidationError("Legacy Office file type does not match its declaration");
    }
    if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
        const hasContentTypes = containsAscii(bytes, "[Content_Types].xml");
        if (hasContentTypes &&
            containsAscii(bytes, "word/") &&
            extension === "docx") {
            return {
                contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                canonicalExtension: "docx",
                width: null,
                height: null,
            };
        }
        if (hasContentTypes &&
            containsAscii(bytes, "xl/") &&
            extension === "xlsx") {
            return {
                contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                canonicalExtension: "xlsx",
                width: null,
                height: null,
            };
        }
        throw new MediaValidationError("ZIP and archive uploads are not allowed");
    }
    if (asciiAt(bytes, 0, 6) === "#!AMR\n") {
        return {
            contentType: "audio/amr",
            canonicalExtension: "amr",
            width: null,
            height: null,
        };
    }
    if (asciiAt(bytes, 0, 4) === "OggS") {
        return declaredType === "audio/opus"
            ? {
                contentType: "audio/opus",
                canonicalExtension: "opus",
                width: null,
                height: null,
            }
            : {
                contentType: "audio/ogg",
                canonicalExtension: "ogg",
                width: null,
                height: null,
            };
    }
    if (asciiAt(bytes, 0, 4) === "RIFF" && asciiAt(bytes, 8, 4) === "WAVE") {
        return {
            contentType: "audio/wav",
            canonicalExtension: "wav",
            width: null,
            height: null,
        };
    }
    if (asciiAt(bytes, 0, 3) === "ID3" ||
        (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)) {
        return {
            contentType: "audio/mpeg",
            canonicalExtension: "mp3",
            width: null,
            height: null,
        };
    }
    if (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xf6) === 0xf0) {
        return {
            contentType: "audio/aac",
            canonicalExtension: "aac",
            width: null,
            height: null,
        };
    }
    if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) {
        return {
            contentType: declaredType,
            canonicalExtension: extension,
            width: null,
            height: null,
        };
    }
    if (asciiAt(bytes, 4, 4) === "ftyp") {
        const brand = asciiAt(bytes, 8, 4);
        if (declaredType === "audio/mp4") {
            return {
                contentType: declaredType,
                canonicalExtension: "m4a",
                width: null,
                height: null,
            };
        }
        if (brand === "qt  " || declaredType === "video/quicktime") {
            return {
                contentType: "video/quicktime",
                canonicalExtension: "mov",
                width: null,
                height: null,
            };
        }
        return {
            contentType: "video/mp4",
            canonicalExtension: "mp4",
            width: null,
            height: null,
        };
    }
    if (declaredType === "application/vnd.vendero.logo-batch" &&
        extension === "vlogob" &&
        asciiAt(bytes, 0, 8) === "VLOGOB01") {
        const headerLength = ((bytes[8] ?? 0) << 24) |
            ((bytes[9] ?? 0) << 16) |
            ((bytes[10] ?? 0) << 8) |
            (bytes[11] ?? 0);
        if (headerLength < 2 || 12 + headerLength > bytes.byteLength) {
            throw new MediaValidationError("AI provider artifact header is invalid");
        }
        try {
            const header = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(12, 12 + headerLength)));
            if (header?.version !== 1 || !Array.isArray(header?.images))
                throw new Error("invalid header");
        }
        catch {
            throw new MediaValidationError("AI provider artifact metadata is invalid");
        }
        return {
            contentType: "application/vnd.vendero.logo-batch",
            canonicalExtension: "vlogob",
            width: null,
            height: null,
        };
    }
    if (declaredType === "image/svg+xml" && extension === "svg") {
        let source;
        try {
            source = new TextDecoder("utf-8", { fatal: true })
                .decode(bytes)
                .replace(/^\uFEFF/u, "")
                .trim();
        }
        catch {
            throw new MediaValidationError("SVG output must use UTF-8 encoding");
        }
        if (!/^(?:<\?xml[^>]*>\s*)?<svg\b/iu.test(source)) {
            throw new MediaValidationError("SVG output must contain a valid SVG root");
        }
        if (/<!doctype|<!entity|<\s*(?:script|style|foreignObject|iframe|object|embed)\b|\son[a-z]+\s*=|javascript\s*:|data\s*:|@import|url\s*\(/iu.test(source) ||
            /(?:href|xlink:href)\s*=\s*["'](?!#)[^"']+["']/iu.test(source)) {
            throw new MediaValidationError("SVG output contains unsafe or external content");
        }
        const root = source.match(/<svg\b[^>]*>/iu)?.[0] ?? "";
        const numberAttribute = (name) => {
            const value = root.match(new RegExp(`\\b${name}\\s*=\\s*["']([0-9]+(?:\\.[0-9]+)?)(?:px)?["']`, "iu"))?.[1];
            return value ? Number(value) : 0;
        };
        let width = numberAttribute("width");
        let height = numberAttribute("height");
        if (!width || !height) {
            const viewBox = root.match(/\bviewBox\s*=\s*["']\s*[-+0-9.e]+[ ,]+[-+0-9.e]+[ ,]+([-+0-9.e]+)[ ,]+([-+0-9.e]+)\s*["']/iu);
            width = Number(viewBox?.[1] ?? 0);
            height = Number(viewBox?.[2] ?? 0);
        }
        if (!Number.isFinite(width) ||
            !Number.isFinite(height) ||
            width <= 0 ||
            height <= 0) {
            throw new MediaValidationError("SVG output dimensions could not be verified");
        }
        return {
            contentType: "image/svg+xml",
            canonicalExtension: "svg",
            width,
            height,
        };
    }
    if (["text/plain", "text/csv", "text/markdown"].includes(declaredType)) {
        assertSafeTextDocument(bytes);
        return {
            contentType: declaredType,
            canonicalExtension: extension,
            width: null,
            height: null,
        };
    }
    throw new MediaValidationError("The real file type is unsupported or could not be verified");
}
export function canonicalDeclaredMediaExtension(fileName) {
    const extension = extensionFromFileName(fileName);
    if (!extension)
        throw new MediaValidationError("A supported file extension is required");
    return extension === "jpeg" ? "jpg" : extension;
}
export async function sha256Hex(bytes) {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer));
    return [...digest]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
}
export async function validateMediaBytes(input) {
    const policy = getMediaPurposePolicy(input.purpose);
    const declaredType = normalizeContentType(input.declaredContentType);
    const declaredExtension = canonicalDeclaredMediaExtension(input.fileName);
    if (!policy.acceptedContentTypes.includes(declaredType)) {
        throw new MediaValidationError("Declared content type is not allowed for this purpose");
    }
    if (!policy.acceptedExtensions.includes(declaredExtension)) {
        throw new MediaValidationError("File extension is not allowed for this purpose");
    }
    if (input.bytes.byteLength < 1 ||
        input.bytes.byteLength > policy.maxSizeBytes) {
        throw new MediaValidationError("Uploaded byte count exceeds the purpose limit", "E_MEDIA_SIZE_LIMIT");
    }
    const detected = detectFile(input.bytes, declaredType, declaredExtension);
    if (detected.contentType !== declaredType) {
        throw new MediaValidationError("Declared content type does not match the real file type");
    }
    if (!policy.acceptedContentTypes.includes(detected.contentType)) {
        throw new MediaValidationError("Real file type is not allowed for this purpose");
    }
    if (detected.canonicalExtension !== declaredExtension) {
        throw new MediaValidationError("File extension does not match the real file type");
    }
    if (policy.kind === "image") {
        const dimensions = detected.contentType === "image/svg+xml" &&
            detected.width &&
            detected.height
            ? { width: detected.width, height: detected.height }
            : imageDimensions(input.bytes, detected.contentType);
        if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
            throw new MediaValidationError("Image dimensions could not be verified");
        }
        if (dimensions.width * dimensions.height >
            (policy.maxImagePixels ?? 25_000_000)) {
            throw new MediaValidationError("Image dimensions are too large", "E_MEDIA_IMAGE_PIXELS");
        }
        if (policy.requiredWidth && dimensions.width !== policy.requiredWidth) {
            throw new MediaValidationError(`Image width must be exactly ${policy.requiredWidth}px`);
        }
        if (policy.requiredHeight && dimensions.height !== policy.requiredHeight) {
            throw new MediaValidationError(`Image height must be exactly ${policy.requiredHeight}px`);
        }
        detected.width = dimensions.width;
        detected.height = dimensions.height;
    }
    return { ...detected, sha256: await sha256Hex(input.bytes) };
}
function safeIntentId(value) {
    if (!/^[a-zA-Z0-9_-]{8,80}$/u.test(value)) {
        throw new MediaValidationError("Invalid upload intent identifier");
    }
    return value;
}
export function buildMediaObjectKey(input) {
    const policy = getMediaPurposePolicy(input.purpose);
    const issued = input.issuedAt instanceof Date
        ? input.issuedAt
        : new Date(input.issuedAt * 1_000);
    const year = String(issued.getUTCFullYear()).padStart(4, "0");
    const month = String(issued.getUTCMonth() + 1).padStart(2, "0");
    const owner = input.ownerType === "vendor" ? `vendors/${input.ownerId}` : "platform";
    return assertMediaObjectKey(`v1/${input.environment}/${owner}/${policy.path}/${year}/${month}/${safeIntentId(input.intentId)}.${input.canonicalExtension}`);
}
export function buildQuarantineObjectKey(environment, intentId) {
    return `quarantine/v1/${environment}/${safeIntentId(intentId)}`;
}

