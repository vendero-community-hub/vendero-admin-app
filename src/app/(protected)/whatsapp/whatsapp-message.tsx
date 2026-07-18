"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock3,
  ContactRound,
  Download,
  ExternalLink,
  FileText,
  ImageOff,
  ListChecks,
  LoaderCircle,
  MapPin,
  MessageSquareReply,
  Music2,
  Package,
  Reply,
  RotateCcw,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PlatformMessage = {
  id: number;
  publicId: string;
  conversationId: number;
  direction: "inbound" | "outbound";
  messageType: string;
  textBody: string | null;
  providerMessageId: string | null;
  providerStatus: string;
  payload: Record<string, unknown>;
  media: Record<string, unknown>;
  location: Record<string, unknown>;
  contacts: Array<Record<string, unknown>>;
  sentByAdminUserId?: number | null;
  replyToProviderMessageId?: string | null;
  receivedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  failureCode?: string | null;
  failureReason: string | null;
  createdAt: string | null;
  updatedAt?: string | null;
};

export type WhatsAppMessageMap =
  | ReadonlyMap<string, PlatformMessage>
  | Readonly<Record<string, PlatformMessage>>;

export type WhatsAppMessageBubbleProps = {
  message: PlatformMessage;
  messageMap?: WhatsAppMessageMap;
  onReply?: (message: PlatformMessage) => void;
  className?: string;
};

type MessageContentProps = {
  message: PlatformMessage;
};

const messageTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
});

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];
}

function stringValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text || null;
}

function firstString(
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value) return value;
  }
  return null;
}

function safeResourceUrl(value: unknown): string | null {
  const candidate = stringValue(value);
  if (!candidate) return null;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate;
  }

  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizedContent(message: PlatformMessage) {
  return asRecord(message.payload?.normalizedContent);
}

function mediaRecord(message: PlatformMessage) {
  const typedPayload = asRecord(message.payload?.[message.messageType]);
  const normalizedMedia = asRecord(normalizedContent(message).media);
  return { ...typedPayload, ...normalizedMedia, ...asRecord(message.media) };
}

function mediaSource(message: PlatformMessage) {
  const media = mediaRecord(message);
  const storedUrl = safeResourceUrl(
    media.publicUrl ??
      media.public_url ??
      media.cloudflareUrl ??
      media.cloudflare_url ??
      media.fileUrl ??
      media.file_url,
  );
  if (storedUrl || message.direction === "inbound") return storedUrl;
  return safeResourceUrl(media.url ?? media.link);
}

function mediaFilename(message: PlatformMessage) {
  const media = mediaRecord(message);
  return (
    firstString(media, ["filename", "fileName", "clientName", "name"]) ??
    `${message.messageType}-message`
  );
}

function mediaFileSize(message: PlatformMessage) {
  const media = mediaRecord(message);
  const bytes = Number(media.fileSize ?? media.file_size ?? media.size);
  return Number.isFinite(bytes) && bytes > 0 ? bytes : null;
}

function mediaMimeType(message: PlatformMessage) {
  return (
    firstString(mediaRecord(message), [
      "mimeType",
      "mime_type",
      "contentType",
    ]) ?? "application/octet-stream"
  );
}

function mediaStatus(message: PlatformMessage) {
  return (
    firstString(mediaRecord(message), [
      "downloadStatus",
      "download_status",
      "status",
    ]) ?? null
  );
}

function formatFileSize(value: unknown) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const amount = bytes / 1024 ** unitIndex;
  return `${amount >= 10 || unitIndex === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${
    units[unitIndex]
  }`;
}

function getAdminAccessToken() {
  if (typeof document === "undefined") return null;
  const encoded = document.cookie
    .split("; ")
    .find((part) => part.startsWith("vendero_admin_access_token="))
    ?.slice("vendero_admin_access_token=".length);
  if (!encoded) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function safeDownloadFilename(value: string | null | undefined) {
  const filename = String(value ?? "")
    .replaceAll("\\", "/")
    .split("/")
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return filename || null;
}

function responseFilename(contentDisposition: string | null) {
  if (!contentDisposition) return null;

  const encoded = contentDisposition.match(
    /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i,
  )?.[1];
  if (encoded) {
    const value = encoded.trim().replace(/^"|"$/g, "");
    try {
      return safeDownloadFilename(decodeURIComponent(value));
    } catch {
      return safeDownloadFilename(value);
    }
  }

  const plain = contentDisposition.match(
    /filename\s*=\s*(?:"([^"]+)"|([^;]+))/i,
  );
  return safeDownloadFilename(plain?.[1] ?? plain?.[2]);
}

type MediaDownloadState = {
  status: "idle" | "downloading" | "complete" | "error";
  loaded: number;
  total: number | null;
  error: string | null;
};

const INITIAL_MEDIA_DOWNLOAD_STATE: MediaDownloadState = {
  status: "idle",
  loaded: 0,
  total: null,
  error: null,
};

function useMediaDownload(message: PlatformMessage) {
  const [state, setState] = useState<MediaDownloadState>(
    INITIAL_MEDIA_DOWNLOAD_STATE,
  );
  const controllerRef = useRef<AbortController | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const download = useCallback(async () => {
    if (controllerRef.current) return;
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    const persistedTotal = mediaFileSize(message);
    setState({
      status: "downloading",
      loaded: 0,
      total: persistedTotal,
      error: null,
    });

    try {
      const token = getAdminAccessToken();
      if (!token) throw new Error("Admin session is unavailable");

      const response = await fetch(
        `/api/v1/admin/whatsapp/platform/messages/${encodeURIComponent(message.publicId)}/media/download`,
        {
          method: "GET",
          headers: {
            accept: "application/octet-stream, */*",
            authorization: `Bearer ${token}`,
          },
          credentials: "same-origin",
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const payload = await response
          .clone()
          .json()
          .catch(() => null);
        throw new Error(
          payload?.error?.message ??
            payload?.message ??
            `Download failed (${response.status})`,
        );
      }

      const headerTotal = Number(response.headers.get("content-length"));
      const total =
        Number.isFinite(headerTotal) && headerTotal > 0
          ? headerTotal
          : persistedTotal;
      const contentType =
        response.headers.get("content-type") || mediaMimeType(message);
      const filename =
        responseFilename(response.headers.get("content-disposition")) ??
        safeDownloadFilename(mediaFilename(message)) ??
        "whatsapp-attachment";

      let blob: Blob;
      if (response.body) {
        const reader = response.body.getReader();
        const chunks: ArrayBuffer[] = [];
        let loaded = 0;
        let lastPaintAt = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value?.byteLength) continue;

          const chunk = new ArrayBuffer(value.byteLength);
          new Uint8Array(chunk).set(value);
          chunks.push(chunk);
          loaded += chunk.byteLength;

          const now = performance.now();
          if (now - lastPaintAt >= 100 || (total && loaded >= total)) {
            lastPaintAt = now;
            setState({ status: "downloading", loaded, total, error: null });
          }
        }

        blob = new Blob(chunks, { type: contentType });
        setState({
          status: "downloading",
          loaded: blob.size,
          total: total ?? blob.size,
          error: null,
        });
      } else {
        blob = await response.blob();
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);

      setState({
        status: "complete",
        loaded: blob.size,
        total: total ?? blob.size,
        error: null,
      });
      resetTimerRef.current = setTimeout(() => {
        setState(INITIAL_MEDIA_DOWNLOAD_STATE);
        resetTimerRef.current = null;
      }, 1_500);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState({
        status: "error",
        loaded: 0,
        total: persistedTotal,
        error: error instanceof Error ? error.message : "Download failed",
      });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [message]);

  return { state, download };
}

export function formatWhatsAppMessageTime(message: PlatformMessage) {
  const value =
    message.receivedAt ??
    message.sentAt ??
    message.createdAt ??
    message.updatedAt;
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : messageTimeFormatter.format(date);
}

export function whatsappDeliveryStatus(message: PlatformMessage) {
  const status = String(message.providerStatus ?? "").toLowerCase();
  if (status === "failed" || message.failedAt) return "failed";
  if (status === "read" || message.readAt) return "read";
  if (status === "delivered" || message.deliveredAt) return "delivered";
  if (status === "sent" || message.sentAt) return "sent";
  if (status === "queued" || status === "pending") return status;
  return status || (message.direction === "inbound" ? "received" : "sent");
}

function replyReference(message: PlatformMessage) {
  const payload = asRecord(message.payload);
  const context = asRecord(payload.context);
  const normalized = normalizedContent(message);
  const normalizedContext = asRecord(normalized.context);
  const reaction = asRecord(payload.reaction);
  const normalizedReaction = asRecord(normalized.reaction);

  return (
    stringValue(message.replyToProviderMessageId) ??
    firstString(payload, [
      "replyToProviderMessageId",
      "reply_to_provider_message_id",
    ]) ??
    firstString(context, ["id", "message_id", "messageId"]) ??
    firstString(normalizedContext, ["id", "message_id", "messageId"]) ??
    firstString(reaction, ["message_id", "messageId"]) ??
    firstString(normalizedReaction, ["message_id", "messageId"])
  );
}

function mapMessage(
  messageMap: WhatsAppMessageMap | undefined,
  reference: string | null,
) {
  if (!messageMap || !reference) return null;
  if ("get" in messageMap && typeof messageMap.get === "function") {
    return messageMap.get(reference) ?? null;
  }
  return (
    (messageMap as Readonly<Record<string, PlatformMessage>>)[reference] ?? null
  );
}

export function buildWhatsAppMessageMap(messages: PlatformMessage[]) {
  const map = new Map<string, PlatformMessage>();
  for (const message of messages) {
    if (message.publicId) map.set(message.publicId, message);
    if (message.providerMessageId) map.set(message.providerMessageId, message);
  }
  return map;
}

function interactiveSummary(message: PlatformMessage) {
  const payload = asRecord(message.payload);
  const normalized = normalizedContent(message);
  const interactive = asRecord(payload.interactive);
  const buttonReply = {
    ...asRecord(interactive.button_reply),
    ...asRecord(normalized.buttonReply),
  };
  const listReply = {
    ...asRecord(interactive.list_reply),
    ...asRecord(normalized.listReply),
  };
  const flowReply = {
    ...asRecord(interactive.nfm_reply),
    ...asRecord(normalized.nfmReply),
  };
  const choice = Object.keys(buttonReply).length
    ? buttonReply
    : Object.keys(listReply).length
      ? listReply
      : flowReply;

  return {
    kind:
      firstString(normalized, ["type"]) ??
      firstString(interactive, ["type"]) ??
      "interactive reply",
    title:
      firstString(choice, ["title", "text", "name"]) ??
      message.textBody ??
      "Customer response",
    description: firstString(choice, ["description", "response_json"]),
    id: firstString(choice, ["id", "payload"]),
  };
}

export function whatsappMessagePreview(message: PlatformMessage) {
  const type = String(message.messageType ?? "unknown").toLowerCase();
  if (message.textBody?.trim()) return message.textBody.trim().slice(0, 120);
  const media = mediaRecord(message);
  const caption = firstString(media, ["caption"]);
  if (caption) return caption.slice(0, 120);
  if (type === "image") return "Photo";
  if (type === "sticker") return "Sticker";
  if (type === "video") return "Video";
  if (type === "audio") return "Audio";
  if (type === "document") return mediaFilename(message);
  if (type === "location") return "Location";
  if (type === "contacts" || type === "contact") return "Contact";
  if (type === "interactive" || type === "button") {
    return interactiveSummary(message).title.slice(0, 120);
  }
  if (type === "reaction") return reactionEmoji(message) ?? "Reaction";
  if (type === "order") return "Order";
  if (type === "template") return "Template message";
  return `${type.replaceAll("_", " ")} message`;
}

function LinkifiedText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const pattern = /https?:\/\/[^\s<]+/gi;
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));

    const raw = match[0];
    const trailing = raw.match(/[),.!?;:]+$/)?.[0] ?? "";
    const candidate = trailing ? raw.slice(0, -trailing.length) : raw;
    const url = safeResourceUrl(candidate);
    if (url) {
      nodes.push(
        <a
          key={`${index}-${candidate}`}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="break-all text-[#53bdeb] underline decoration-[#53bdeb]/50 underline-offset-2 hover:decoration-[#53bdeb]"
        >
          {candidate}
        </a>,
      );
    } else {
      nodes.push(candidate);
    }
    if (trailing) nodes.push(trailing);
    cursor = index + raw.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function DownloadAction({
  message,
  className,
}: MessageContentProps & { className?: string }) {
  const { state, download } = useMediaDownload(message);
  const status = mediaStatus(message);
  const isPreparing = [
    "pending",
    "queued",
    "processing",
    "downloading",
  ].includes(status ?? "");
  if (isPreparing) return null;

  const percentage = state.total
    ? Math.min(100, Math.round((state.loaded / state.total) * 100))
    : null;
  const title =
    state.status === "error"
      ? `${state.error ?? "Download failed"}. Tap to retry.`
      : state.status === "downloading"
        ? percentage === null
          ? "Downloading file"
          : `Downloading file: ${percentage}%`
        : state.status === "complete"
          ? "Download complete"
          : `Download ${mediaFilename(message)}`;

  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={state.status === "downloading"}
      aria-busy={state.status === "downloading"}
      aria-label={title}
      title={title}
      data-download-status={state.status}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full bg-black/45 px-2 text-white shadow-sm transition hover:bg-black/65 disabled:cursor-wait disabled:opacity-100",
        state.status === "idle" && "w-8 px-0",
        state.status === "error" && "bg-rose-600/90 hover:bg-rose-600",
        state.status === "complete" && "bg-emerald-600/90 hover:bg-emerald-600",
        className,
      )}
    >
      {state.status === "downloading" ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {percentage !== null ? (
            <span className="min-w-7 text-[10px] font-semibold tabular-nums">
              {percentage}%
            </span>
          ) : null}
        </>
      ) : state.status === "error" ? (
        <RotateCcw className="h-4 w-4" />
      ) : state.status === "complete" ? (
        <Check className="h-4 w-4" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span className="sr-only" aria-live="polite">
        {title}
      </span>
    </button>
  );
}

function MediaUnavailable({ message }: MessageContentProps) {
  const status = mediaStatus(message);
  return (
    <div className="flex min-h-24 items-center justify-center gap-2 rounded-lg bg-black/20 px-5 text-sm text-slate-300">
      <ImageOff className="h-5 w-5" />
      <span>
        {["pending", "queued", "processing", "downloading"].includes(
          status ?? "",
        )
          ? "Media is being prepared"
          : "Media is unavailable"}
      </span>
    </div>
  );
}

function MediaCaption({ message }: MessageContentProps) {
  const caption =
    firstString(mediaRecord(message), ["caption"]) ??
    message.textBody?.trim() ??
    null;
  if (!caption) return null;
  return (
    <p className="px-1 pt-2 whitespace-pre-wrap break-words leading-5">
      <LinkifiedText text={caption} />
    </p>
  );
}

function ImageMessage({
  message,
  sticker = false,
}: MessageContentProps & { sticker?: boolean }) {
  const src = mediaSource(message);
  if (!src) return <MediaUnavailable message={message} />;
  const size = formatFileSize(mediaFileSize(message));
  return (
    <div className="overflow-hidden rounded-lg">
      <div className="relative">
        <img
          src={src}
          alt={sticker ? "WhatsApp sticker" : mediaFilename(message)}
          loading="lazy"
          className={cn(
            "block h-auto max-h-[440px] w-full object-cover",
            sticker && "max-h-56 w-auto max-w-56 bg-transparent object-contain",
          )}
        />
        <div className="absolute right-2 top-2">
          <DownloadAction message={message} />
        </div>
        {!sticker && size ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white shadow-sm backdrop-blur-sm">
            {size}
          </span>
        ) : null}
      </div>
      {!sticker ? <MediaCaption message={message} /> : null}
    </div>
  );
}

function VideoMessage({ message }: MessageContentProps) {
  const src = mediaSource(message);
  if (!src) return <MediaUnavailable message={message} />;
  const media = mediaRecord(message);
  const poster = safeResourceUrl(
    media.thumbnailUrl ?? media.thumbnail_url ?? media.poster,
  );
  return (
    <div className="overflow-hidden rounded-lg">
      <div className="relative bg-black">
        <video
          src={src}
          poster={poster ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="max-h-[440px] w-full"
        >
          Your browser cannot play this video.
        </video>
        <div className="absolute right-2 top-2">
          <DownloadAction message={message} />
        </div>
      </div>
      <MediaCaption message={message} />
    </div>
  );
}

function AudioMessage({ message }: MessageContentProps) {
  const src = mediaSource(message);
  if (!src) return <MediaUnavailable message={message} />;
  const size = formatFileSize(mediaFileSize(message));
  return (
    <div className="min-w-[260px] rounded-lg bg-black/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-200">
          <Music2 className="h-4 w-4 text-emerald-300" />
          <span>
            Voice message
            {size ? (
              <span className="ml-1.5 font-normal text-slate-400">
                · {size}
              </span>
            ) : null}
          </span>
        </span>
        <DownloadAction message={message} />
      </div>
      <audio src={src} controls preload="metadata" className="h-10 w-full">
        Your browser cannot play this audio.
      </audio>
    </div>
  );
}

function DocumentMessage({ message }: MessageContentProps) {
  const media = mediaRecord(message);
  const status = mediaStatus(message);
  const canDownload = ![
    "pending",
    "queued",
    "processing",
    "downloading",
  ].includes(status ?? "");
  const size = formatFileSize(mediaFileSize(message));
  const mime = firstString(media, ["mimeType", "mime_type", "contentType"]);
  return (
    <div>
      <div
        className={cn(
          "flex min-w-[270px] items-center gap-3 rounded-lg bg-black/20 p-3",
          !canDownload && "opacity-80",
        )}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <FileText className="h-5 w-5 text-sky-300" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-white">
            {mediaFilename(message)}
          </span>
          <span className="mt-1 block truncate text-xs text-slate-300">
            {[mime, size].filter(Boolean).join(" · ") || "Document"}
          </span>
        </span>
        {canDownload ? <DownloadAction message={message} /> : null}
      </div>
      <MediaCaption message={message} />
    </div>
  );
}

function LocationMessage({ message }: MessageContentProps) {
  const payloadLocation = asRecord(message.payload?.location);
  const normalized = normalizedContent(message);
  const location = {
    ...payloadLocation,
    ...normalized,
    ...asRecord(message.location),
  };
  const latitude = firstString(location, ["latitude", "lat"]);
  const longitude = firstString(location, ["longitude", "lng", "lon"]);
  const name = firstString(location, ["name", "title"]) ?? "Shared location";
  const address = firstString(location, ["address"]);
  const mapsUrl =
    latitude && longitude
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${latitude},${longitude}`,
        )}`
      : null;

  const card = (
    <div className="min-w-[270px] overflow-hidden rounded-lg bg-black/20">
      <div className="flex h-28 items-center justify-center bg-emerald-950/60">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/20 ring-8 ring-emerald-400/10">
          <MapPin className="h-7 w-7 text-emerald-300" />
        </span>
      </div>
      <div className="flex items-center gap-3 p-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-white">{name}</span>
          <span className="mt-1 block text-xs text-slate-300">
            {address ??
              (latitude && longitude
                ? `${latitude}, ${longitude}`
                : "Location details")}
          </span>
        </span>
        {mapsUrl ? <ExternalLink className="h-4 w-4 text-slate-200" /> : null}
      </div>
    </div>
  );

  return mapsUrl ? (
    <a href={mapsUrl} target="_blank" rel="noreferrer noopener">
      {card}
    </a>
  ) : (
    card
  );
}

function contactName(contact: Record<string, unknown>) {
  const name = asRecord(contact.name);
  return (
    firstString(name, [
      "formatted_name",
      "formattedName",
      "first_name",
      "firstName",
    ]) ??
    firstString(contact, ["name", "displayName"]) ??
    "WhatsApp contact"
  );
}

function contactDetail(contact: Record<string, unknown>) {
  const phones = asRecordArray(contact.phones);
  const emails = asRecordArray(contact.emails);
  return (
    firstString(phones[0] ?? {}, ["phone", "wa_id", "waId"]) ??
    firstString(emails[0] ?? {}, ["email"]) ??
    firstString(asRecord(contact.org), ["company", "title"]) ??
    "Contact card"
  );
}

function ContactsMessage({ message }: MessageContentProps) {
  const normalized = normalizedContent(message);
  const contacts = message.contacts.length
    ? message.contacts
    : asRecordArray(normalized.contacts ?? message.payload?.contacts);

  if (!contacts.length) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-black/20 p-3 text-slate-200">
        <ContactRound className="h-5 w-5" /> Contact details unavailable
      </div>
    );
  }

  return (
    <div className="min-w-[270px] divide-y divide-white/10 rounded-lg bg-black/20">
      {contacts.slice(0, 6).map((contact, index) => (
        <div
          key={`${contactName(contact)}-${index}`}
          className="flex items-center gap-3 p-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-600">
            <UserRound className="h-5 w-5 text-white" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-white">
              {contactName(contact)}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-300">
              {contactDetail(contact)}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function InteractiveMessage({ message }: MessageContentProps) {
  const summary = interactiveSummary(message);
  return (
    <div className="min-w-[230px] rounded-lg bg-black/20 p-3">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
        <ListChecks className="h-4 w-4" /> {summary.kind.replaceAll("_", " ")}
      </p>
      <p className="mt-2 font-medium text-white">{summary.title}</p>
      {summary.description ? (
        <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-300">
          {summary.description}
        </p>
      ) : null}
      {summary.id ? (
        <p className="mt-2 truncate text-[11px] text-slate-400">
          ID: {summary.id}
        </p>
      ) : null}
    </div>
  );
}

function reactionEmoji(message: PlatformMessage) {
  const payload = asRecord(message.payload);
  const reaction = asRecord(payload.reaction);
  const normalized = normalizedContent(message);
  return (
    message.textBody?.trim() ??
    firstString(reaction, ["emoji"]) ??
    firstString(normalized, ["emoji"])
  );
}

function ReactionMessage({ message }: MessageContentProps) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-black/20 px-4 py-2">
      <span className="text-2xl leading-none">
        {reactionEmoji(message) ?? "👍"}
      </span>
      <span className="text-xs text-slate-300">Reaction</span>
    </div>
  );
}

function OrderMessage({ message }: MessageContentProps) {
  const normalized = normalizedContent(message);
  const order = {
    ...asRecord(message.payload?.order),
    ...normalized,
  };
  const items = asRecordArray(order.productItems ?? order.product_items);
  const note = firstString(order, ["text"]);
  return (
    <div className="min-w-[280px] overflow-hidden rounded-lg bg-black/20">
      <div className="flex items-center gap-3 border-b border-white/10 p-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/15">
          <ShoppingBag className="h-5 w-5 text-emerald-300" />
        </span>
        <span>
          <span className="block font-medium text-white">WhatsApp order</span>
          <span className="text-xs text-slate-300">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </span>
      </div>
      {items.slice(0, 4).map((item, index) => {
        const product =
          firstString(item, [
            "product_retailer_id",
            "productRetailerId",
            "name",
          ]) ?? `Item ${index + 1}`;
        const quantity = firstString(item, ["quantity"]);
        const price = firstString(item, ["item_price", "itemPrice"]);
        const currency = firstString(item, ["currency"]);
        return (
          <div
            key={`${product}-${index}`}
            className="flex items-center justify-between gap-3 border-b border-white/5 px-3 py-2 text-xs last:border-0"
          >
            <span className="truncate text-slate-100">{product}</span>
            <span className="shrink-0 text-slate-300">
              {quantity ? `×${quantity}` : ""}
              {price ? ` · ${currency ? `${currency} ` : ""}${price}` : ""}
            </span>
          </div>
        );
      })}
      {note ? <p className="px-3 py-2 text-xs text-slate-300">{note}</p> : null}
    </div>
  );
}

function TemplateMessage({ message }: MessageContentProps) {
  const template = asRecord(message.payload?.template);
  const language = asRecord(template.language);
  const name =
    firstString(template, ["name"]) ??
    message.textBody?.trim() ??
    "WhatsApp template";
  const languageCode = firstString(language, ["code"]);
  return (
    <div className="min-w-[240px] rounded-lg border border-white/10 bg-black/15 p-3">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
        <MessageSquareReply className="h-4 w-4" /> Template
      </p>
      <p className="mt-2 font-medium text-white">{name}</p>
      {languageCode ? (
        <p className="mt-1 text-xs text-slate-300">Language: {languageCode}</p>
      ) : null}
    </div>
  );
}

function SafeFallbackMessage({ message }: MessageContentProps) {
  const type = String(message.messageType || "unknown").replaceAll("_", " ");
  return (
    <div className="min-w-[220px] rounded-lg bg-black/20 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold capitalize text-slate-200">
        <Package className="h-4 w-4 text-slate-300" /> {type} message
      </p>
      {message.textBody ? (
        <p className="mt-2 whitespace-pre-wrap break-words leading-5">
          <LinkifiedText text={message.textBody} />
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-400">
          This message type does not have a preview.
        </p>
      )}
    </div>
  );
}

function TextMessage({ message }: MessageContentProps) {
  return (
    <p className="whitespace-pre-wrap break-words leading-5.5">
      <LinkifiedText text={message.textBody?.trim() || "Empty message"} />
    </p>
  );
}

function MessageContent({ message }: MessageContentProps) {
  const type = String(message.messageType ?? "unknown").toLowerCase();
  if (type === "text" || type === "emoji")
    return <TextMessage message={message} />;
  if (type === "image") return <ImageMessage message={message} />;
  if (type === "sticker") return <ImageMessage message={message} sticker />;
  if (type === "video") return <VideoMessage message={message} />;
  if (type === "audio") return <AudioMessage message={message} />;
  if (type === "document") return <DocumentMessage message={message} />;
  if (type === "location") return <LocationMessage message={message} />;
  if (type === "contacts" || type === "contact") {
    return <ContactsMessage message={message} />;
  }
  if (type === "interactive" || type === "button") {
    return <InteractiveMessage message={message} />;
  }
  if (type === "reaction") return <ReactionMessage message={message} />;
  if (type === "order") return <OrderMessage message={message} />;
  if (type === "template") return <TemplateMessage message={message} />;
  return <SafeFallbackMessage message={message} />;
}

function QuotedMessage({
  message,
  messageMap,
}: {
  message: PlatformMessage;
  messageMap?: WhatsAppMessageMap;
}) {
  const reference = replyReference(message);
  if (!reference) return null;
  const quoted = mapMessage(messageMap, reference);
  return (
    <div className="mb-2 overflow-hidden rounded-md border-l-4 border-emerald-400 bg-black/20 px-3 py-2">
      <p className="text-xs font-semibold text-emerald-300">
        {quoted
          ? quoted.direction === "outbound"
            ? "You"
            : "Customer"
          : "Replied message"}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-300">
        {quoted
          ? whatsappMessagePreview(quoted)
          : "Original message is not loaded"}
      </p>
    </div>
  );
}

function DeliveryMetadata({ message }: MessageContentProps) {
  const status = whatsappDeliveryStatus(message);
  const time = formatWhatsAppMessageTime(message);
  const outbound = message.direction === "outbound";
  let icon: ReactNode = null;

  if (outbound) {
    if (status === "failed") {
      icon = <AlertCircle className="h-3.5 w-3.5 text-rose-300" />;
    } else if (status === "read") {
      icon = <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />;
    } else if (status === "delivered") {
      icon = <CheckCheck className="h-3.5 w-3.5 text-slate-300" />;
    } else if (status === "queued" || status === "pending") {
      icon = <Clock3 className="h-3.5 w-3.5 text-slate-300" />;
    } else {
      icon = <Check className="h-3.5 w-3.5 text-slate-300" />;
    }
  }

  return (
    <div className="mt-1 flex min-h-4 items-center justify-end gap-1 text-[10px] leading-none text-slate-300/80">
      {time ? <span>{time}</span> : null}
      <span title={status}>{icon}</span>
    </div>
  );
}

export function WhatsAppMessageBubble({
  message,
  messageMap,
  onReply,
  className,
}: WhatsAppMessageBubbleProps) {
  const outbound = message.direction === "outbound";
  const canReply = Boolean(onReply && message.providerMessageId);
  const type = String(message.messageType ?? "unknown").toLowerCase();
  const isWide = [
    "image",
    "video",
    "audio",
    "document",
    "location",
    "contacts",
    "contact",
    "order",
  ].includes(type);

  return (
    <div
      id={`whatsapp-message-${message.publicId}`}
      data-message-id={message.publicId}
      className={cn(
        "group/message flex w-full items-end gap-1.5",
        outbound ? "justify-end" : "justify-start",
        className,
      )}
    >
      {outbound && canReply ? (
        <button
          type="button"
          onClick={() => onReply?.(message)}
          title="Reply to message"
          className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#202c33] text-slate-300 opacity-70 shadow transition hover:text-white sm:opacity-0 sm:group-hover/message:opacity-100"
        >
          <Reply className="h-4 w-4" />
          <span className="sr-only">Reply</span>
        </button>
      ) : null}

      <div
        className={cn(
          "relative max-w-[88%] rounded-lg px-2.5 py-2 text-[13px] text-slate-50 shadow-sm sm:max-w-[76%] xl:max-w-[66%]",
          outbound
            ? "rounded-tr-sm bg-[#005c4b]"
            : "rounded-tl-sm bg-[#202c33]",
          isWide && "w-full max-w-[390px] p-1.5 sm:max-w-[430px]",
          type === "sticker" && "w-auto bg-transparent p-0 shadow-none",
        )}
      >
        <QuotedMessage message={message} messageMap={messageMap} />
        <MessageContent message={message} />
        {message.failureReason ? (
          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-rose-500/15 px-2 py-1.5 text-xs leading-4 text-rose-100">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{message.failureReason}</span>
          </div>
        ) : null}
        <DeliveryMetadata message={message} />
      </div>

      {!outbound && canReply ? (
        <button
          type="button"
          onClick={() => onReply?.(message)}
          title="Reply to message"
          className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#202c33] text-slate-300 opacity-70 shadow transition hover:text-white sm:opacity-0 sm:group-hover/message:opacity-100"
        >
          <Reply className="h-4 w-4" />
          <span className="sr-only">Reply</span>
        </button>
      ) : null}
    </div>
  );
}
