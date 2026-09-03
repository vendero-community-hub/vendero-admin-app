class TrustedMediaUploadError extends Error {
    status;
    code;
    constructor(message, status = null, code = "E_MEDIA_UPLOAD_FAILED") {
        super(message);
        this.status = status;
        this.code = code;
    }
}
function abortError() {
    const error = new Error("Upload cancelled");
    error.name = "AbortError";
    return error;
}
async function errorFromResponse(response, fallback) {
    const payload = (await response.json().catch(() => null));
    return new TrustedMediaUploadError(payload?.error?.message ??
        payload?.message ??
        `${fallback} (${response.status})`, response.status, payload?.error?.code ?? "E_MEDIA_UPLOAD_FAILED");
}
async function apiJson(options, path, init) {
    if (options.signal?.aborted)
        throw abortError();
    const headers = new Headers(init.headers);
    headers.set("content-type", "application/json");
    if (options.registrationChallengeId) {
        headers.set("x-registration-challenge-id", options.registrationChallengeId);
    }
    const response = await options.apiRequest(path, {
        ...init,
        signal: options.signal,
        headers,
    });
    if (!response.ok)
        throw await errorFromResponse(response, "Media API request failed");
    const payload = (await response.json());
    if (!payload?.success)
        throw new TrustedMediaUploadError("Media API returned an invalid response");
    return payload.data;
}
function validatePolicy(file, intent) {
    const rawType = file.type.split(";", 1)[0].trim().toLowerCase();
    const type = rawType === "image/jpg"
        ? "image/jpeg"
        : rawType === "audio/mp3"
            ? "audio/mpeg"
            : rawType;
    const rawExtension = file.name
        .trim()
        .toLowerCase()
        .match(/\.([a-z0-9]{1,12})$/u)?.[1];
    const extension = rawExtension === "jpeg" ? "jpg" : rawExtension;
    if (file.size < 1 || file.size > intent.policy.maxSizeBytes) {
        throw new TrustedMediaUploadError(`File exceeds the ${intent.policy.maxSizeBytes}-byte upload policy`);
    }
    if (!intent.policy.acceptedContentTypes.includes(type)) {
        throw new TrustedMediaUploadError("File type is not allowed for this upload");
    }
    if (!extension || !intent.policy.acceptedExtensions.includes(extension)) {
        throw new TrustedMediaUploadError("File extension is not allowed for this upload");
    }
}
function uploadWithProgress(file, intent, options) {
    return new Promise((resolve, reject) => {
        if (options.signal?.aborted)
            return reject(abortError());
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", intent.uploadUrl, true);
        for (const [name, value] of Object.entries(intent.uploadHeaders)) {
            xhr.setRequestHeader(name, value);
        }
        xhr.upload.onprogress = (event) => {
            const total = event.lengthComputable ? event.total : file.size;
            options.onProgress?.({
                clientId: file.clientId,
                loadedBytes: event.loaded,
                totalBytes: total,
                percent: total
                    ? Math.min(100, Math.round((event.loaded / total) * 100))
                    : 0,
            });
        };
        const onAbort = () => xhr.abort();
        options.signal?.addEventListener("abort", onAbort, { once: true });
        xhr.onerror = () => reject(new TrustedMediaUploadError("Unable to reach the media upload service"));
        xhr.onabort = () => reject(abortError());
        xhr.onload = () => {
            options.signal?.removeEventListener("abort", onAbort);
            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new TrustedMediaUploadError(`R2 upload failed (${xhr.status || "network"})`, xhr.status || null, "E_MEDIA_R2_UPLOAD_FAILED"));
                return;
            }
            options.onProgress?.({
                clientId: file.clientId,
                loadedBytes: file.size,
                totalBytes: file.size,
                percent: 100,
            });
            resolve({
                objectKey: intent.objectKey,
                uploadReceipt: intent.uploadReceipt,
            });
        };
        xhr.send(file.body);
    });
}
async function uploadWithRetry(file, intent, options) {
    const attempts = Math.max(1, Math.min(options.maxUploadAttempts ?? 3, 5));
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await uploadWithProgress(file, intent, options);
        }
        catch (error) {
            lastError = error;
            if (options.signal?.aborted ||
                (error instanceof TrustedMediaUploadError &&
                    error.status &&
                    error.status < 500)) {
                throw error;
            }
        }
    }
    throw lastError;
}
function delay(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted)
            return reject(abortError());
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(abortError());
        }, { once: true });
    });
}
async function waitUntilReady(asset, options, basePath) {
    if (asset.status === "ready")
        return asset;
    const deadline = Date.now() + (options.scanTimeoutMs ?? 5 * 60_000);
    let current = asset;
    while (current.status === "pending_scan" && Date.now() < deadline) {
        await delay(options.scanPollIntervalMs ?? 1_500, options.signal);
        current = await apiJson(options, `${basePath}/assets/${encodeURIComponent(asset.id)}/status`, { method: "GET" });
    }
    if (current.status === "rejected")
        throw new TrustedMediaUploadError("File was rejected by security scanning");
    if (current.status !== "ready")
        throw new TrustedMediaUploadError("File security scan did not finish in time");
    return current;
}
export async function uploadTrustedMedia(options) {
    if (!options.files.length)
        return [];
    const basePath = (options.apiBasePath ?? "/api/v1/media").replace(/\/+$/u, "");
    const response = await apiJson(options, `${basePath}/upload-intents`, {
        method: "POST",
        body: JSON.stringify({
            purpose: options.purpose,
            files: options.files.map((file) => ({
                clientId: file.clientId,
                fileName: file.name,
                declaredContentType: file.type,
                sizeBytes: file.size,
            })),
            ...(options.registrationChallengeId
                ? { challengeId: options.registrationChallengeId }
                : {}),
        }),
    });
    const intentByClient = new Map(response.intents.map((intent) => [intent.clientId, intent]));
    const receipts = await Promise.all(options.files.map(async (file) => {
        const intent = intentByClient.get(file.clientId);
        if (!intent)
            throw new TrustedMediaUploadError(`Upload intent missing for ${file.clientId}`);
        validatePolicy(file, intent);
        return uploadWithRetry(file, intent, options);
    }));
    const committed = await apiJson(options, `${basePath}/assets/commit`, {
        method: "POST",
        body: JSON.stringify({
            uploads: receipts,
            ...(options.registrationChallengeId
                ? { challengeId: options.registrationChallengeId }
                : {}),
        }),
    });
    const assets = Array.isArray(committed) ? committed : [committed];
    return Promise.all(assets.map((asset) => waitUntilReady(asset, options, basePath)));
}
export { TrustedMediaUploadError };

