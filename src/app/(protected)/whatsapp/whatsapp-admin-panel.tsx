"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  File,
  FileText,
  Image as ImageIcon,
  ListChecks,
  MapPin,
  MessageSquare,
  Mic,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smile,
  UserRound,
  Video,
  Wifi,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_ENV, socketIoEndpoint } from "@/lib/environment";

type BadgeTone =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "danger";

type VendorSummary = {
  id: number;
  businessName: string | null;
  ownerName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
} | null;

type WhatsappTemplate = {
  id: number;
  name: string;
  category: string;
  language: string;
  status: string;
  providerStatus: string | null;
  qualityRating: string | null;
  headerText: string | null;
  bodyText: string;
  footerText: string | null;
  rejectionReason: string | null;
  messageCount: number;
  failedCount: number;
  updatedAt: string | null;
  createdAt: string | null;
};

type WhatsappOptIn = {
  id: number;
  phone: string;
  phoneE164: string | null;
  status: string;
  source: string;
  consentText: string | null;
  optedInAt: string | null;
  optedOutAt: string | null;
  vendor: VendorSummary;
  user: {
    id: number;
    fullName: string | null;
    phone: string | null;
    role: string | null;
  } | null;
  createdAt: string | null;
};

type WhatsappLog = {
  id: number;
  vendorProfileId: number | null;
  recipientPhone: string;
  recipientPhoneE164: string | null;
  messageType: string;
  templateName: string | null;
  templateLanguage: string | null;
  status: string;
  providerMessageId: string | null;
  failureCode: string | null;
  failureReason: string | null;
  estimatedCost: number;
  currency: string;
  sentAt: string | null;
  failedAt: string | null;
  createdAt: string | null;
  vendor: VendorSummary;
};

type PlatformConversation = {
  id: number;
  publicId: string;
  waId: string;
  phoneE164: string | null;
  phoneSearch: string | null;
  displayName: string | null;
  profileName: string | null;
  status: string;
  sessionStartedAt: string | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastMessageAt: string | null;
  expiresAt: string | null;
  isSessionOpen: boolean;
  unreadCount: number;
};

type PlatformMessage = {
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
  receivedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  createdAt: string | null;
  failureReason: string | null;
};

export type WhatsappAdminData = {
  templates: WhatsappTemplate[];
  optIns: WhatsappOptIn[];
  logs: WhatsappLog[];
  failedSends: WhatsappLog[];
  analytics: {
    sent24h: number;
    failed24h: number;
    vendors24h: number;
    spendMonth: number;
    currency: string;
    activeOptIns: number;
    optedOut: number;
    optIns24h: number;
    approvedTemplates: number;
    pendingTemplates: number;
    rejectedTemplates: number;
    dailyUsage: Array<{
      label: string;
      total: number;
      failed: number;
      spend: number;
    }>;
    byStatus: Record<string, number>;
  };
  filters: {
    q: string;
    templateStatus: string;
    optInStatus: string;
    logStatus: string;
    limit: number;
  };
} | null;

const VIEW_OPTIONS = [
  { key: "inbox", label: "Inbox", icon: MessageSquare },
  { key: "templates", label: "Templates", icon: FileText },
  { key: "optIns", label: "Opt-ins", icon: ShieldCheck },
  { key: "logs", label: "Message Logs", icon: MessageSquare },
  { key: "failed", label: "Failed Sends", icon: XCircle },
] as const;

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function getAdminToken() {
  return (
    document.cookie
      .split("; ")
      .find((part) => part.startsWith("vendero_admin_access_token="))
      ?.split("=")[1] ?? null
  );
}

async function requestJson(
  path: string,
  body?: Record<string, unknown>,
  method = "GET"
) {
  const token = getAdminToken();
  const response = await fetch(path, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: token ? `Bearer ${token}` : "",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      payload?.message ?? payload?.error?.message ?? "Request failed"
    );
  return unwrapPayload(payload);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatChatTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toneForStatus(status: string | null | undefined): BadgeTone {
  if (
    ["approved", "sent", "delivered", "read", "opted_in"].includes(
      String(status)
    )
  )
    return "success";
  if (
    ["failed", "rejected", "disabled", "revoked", "opted_out"].includes(
      String(status)
    )
  )
    return "danger";
  if (["draft", "submitted", "queued", "paused"].includes(String(status)))
    return "warning";
  return "secondary";
}

function vendorLabel(vendor: VendorSummary) {
  if (!vendor) return "No vendor";
  return (
    vendor.businessName ??
    vendor.ownerName ??
    vendor.phone ??
    `Vendor #${vendor.id}`
  );
}

function conversationLabel(conversation: PlatformConversation | null) {
  if (!conversation) return "Select a conversation";
  return (
    conversation.displayName ??
    conversation.profileName ??
    conversation.phoneE164 ??
    conversation.phoneSearch ??
    "WhatsApp contact"
  );
}

function conversationInitials(conversation: PlatformConversation) {
  const label = conversationLabel(conversation);
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

function replaceById<T extends { id: number }>(records: T[], next: T) {
  return records.map((record) => (record.id === next.id ? next : record));
}

export function WhatsappAdminPanel({
  initialData,
}: {
  initialData: WhatsappAdminData;
}) {
  const [data, setData] = useState<WhatsappAdminData>(initialData);
  const [view, setView] =
    useState<(typeof VIEW_OPTIONS)[number]["key"]>("inbox");
  const [query, setQuery] = useState(initialData?.filters.q ?? "");
  const [templateStatus, setTemplateStatus] = useState(
    initialData?.filters.templateStatus ?? "all"
  );
  const [optInStatus, setOptInStatus] = useState(
    initialData?.filters.optInStatus ?? "all"
  );
  const [logStatus, setLogStatus] = useState(
    initialData?.filters.logStatus ?? "all"
  );
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "utility",
    language: "en",
    bodyText: "",
  });
  const [optInForm, setOptInForm] = useState({
    phone: "",
    status: "opted_in",
    source: "admin",
    consentText: "",
  });
  const [conversations, setConversations] = useState<PlatformConversation[]>(
    []
  );
  const [messages, setMessages] = useState<PlatformMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [socketState, setSocketState] = useState<
    "idle" | "connecting" | "connected"
  >("idle");
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [messageForm, setMessageForm] = useState({
    to: "",
    type: "text",
    text: "",
    emoji: "",
    mediaUrl: "",
    mediaId: "",
    caption: "",
    filename: "",
    latitude: "",
    longitude: "",
    name: "",
    address: "",
    templateName: "",
    templateLanguage: "en",
  });
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const typingSignalRef = useRef({ conversationId: 0, sentAt: 0 });

  const activeRecords = useMemo(() => {
    if (view === "inbox") return conversations.length;
    if (view === "optIns") return data?.optIns.length ?? 0;
    if (view === "logs") return data?.logs.length ?? 0;
    if (view === "failed") return data?.failedSends.length ?? 0;
    return data?.templates.length ?? 0;
  }, [conversations.length, data, view]);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === selectedConversationId
      ) ?? null,
    [conversations, selectedConversationId]
  );

  const approvedTemplates = useMemo(
    () =>
      (data?.templates ?? []).filter((template) =>
        [template.status, template.providerStatus]
          .map((status) => String(status ?? "").toLowerCase())
          .includes("approved")
      ),
    [data?.templates]
  );

  async function refreshConversations(selectFirst = false) {
    const params = new URLSearchParams({ limit: "80" });
    if (query.trim()) params.set("q", query.trim());
    const rows = (await requestJson(
      `/api/v1/admin/whatsapp/platform/conversations?${params.toString()}`
    )) as PlatformConversation[];
    setConversations(rows);
    if (selectFirst && rows[0]) {
      setSelectedConversationId(rows[0].id);
      await loadMessages(rows[0].id);
    }
  }

  async function loadMessages(conversationId: number) {
    const payload = (await requestJson(
      `/api/v1/admin/whatsapp/platform/conversations/${conversationId}/messages?limit=120`
    )) as { conversation: PlatformConversation; messages: PlatformMessage[] };
    setMessages(payload.messages);
    setSelectedConversationId(conversationId);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === payload.conversation.id
          ? payload.conversation
          : conversation
      )
    );
    const inboundNeedsRead = payload.messages.some(
      (message) =>
        message.direction === "inbound" &&
        Boolean(message.providerMessageId) &&
        deliveryStatus(message) !== "read"
    );
    if (payload.conversation.unreadCount > 0 || inboundNeedsRead) {
      void markConversationReadById(conversationId);
    }
  }

  useEffect(() => {
    void refreshConversations(true).catch((requestError) => {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load WhatsApp inbox"
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;

    let closed = false;
    let socket: {
      disconnect: () => void;
      on: (event: string, handler: (...args: any[]) => void) => void;
    } | null = null;
    setSocketState("connecting");

    void import("socket.io-client").then(({ io }) => {
      if (closed) return;
      const endpoint = socketIoEndpoint();
      socket = io(endpoint.url, {
        path: endpoint.path,
        transports: ["polling", "websocket"],
        auth: { token, appEnv: APP_ENV },
      });
      socket.on("connect", () => setSocketState("connected"));
      socket.on("disconnect", () => setSocketState("idle"));
      socket.on("connect_error", (socketError: Error) => {
        setSocketState("idle");
        setLiveNotice(`Live inbox connection failed: ${socketError.message}`);
      });
      socket.on(
        "whatsapp:message:new",
        (payload: {
          event?: string;
          conversation?: PlatformConversation;
          message?: PlatformMessage;
        }) => {
          if (payload.conversation) {
            setConversations((current) => {
              const exists = current.some(
                (item) => item.id === payload.conversation!.id
              );
              const next = exists
                ? current.map((item) =>
                    item.id === payload.conversation!.id
                      ? payload.conversation!
                      : item
                  )
                : [payload.conversation!, ...current];
              return next.sort(
                (left, right) =>
                  Date.parse(right.lastMessageAt ?? "") -
                  Date.parse(left.lastMessageAt ?? "")
              );
            });
            if (payload.event === "message.received") {
              setLiveNotice(
                `New WhatsApp message from ${conversationLabel(
                  payload.conversation
                )}`
              );
            } else if (payload.event === "message.status_updated") {
              setLiveNotice(
                `WhatsApp message status updated to ${
                  payload.message?.providerStatus ?? "updated"
                }`
              );
            }
          }
          if (
            payload.message &&
            payload.message.conversationId === selectedConversationId
          ) {
            setMessages((current) => {
              const exists = current.some(
                (message) => message.publicId === payload.message!.publicId
              );
              return exists
                ? current.map((message) =>
                    message.publicId === payload.message!.publicId
                      ? payload.message!
                      : message
                  )
                : [...current, payload.message!];
            });
            if (
              payload.event === "message.received" &&
              payload.message.direction === "inbound"
            ) {
              void markConversationReadById(selectedConversationId);
            }
          }
        }
      );
    });

    return () => {
      closed = true;
      socket?.disconnect();
    };
  }, [selectedConversationId]);

  async function refresh(nextView = view) {
    setWorking("refresh");
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (query.trim()) params.set("q", query.trim());
      if (templateStatus !== "all")
        params.set("templateStatus", templateStatus);
      if (optInStatus !== "all") params.set("optInStatus", optInStatus);
      if (logStatus !== "all") params.set("logStatus", logStatus);
      const nextData = await requestJson(
        `/api/v1/admin/whatsapp?${params.toString()}`
      );
      setData(nextData as WhatsappAdminData);
      setView(nextView);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to refresh WhatsApp admin data"
      );
    } finally {
      setWorking(null);
    }
  }

  async function createTemplate() {
    if (!templateForm.name.trim() || !templateForm.bodyText.trim()) return;
    setWorking("template");
    setError(null);
    try {
      const template = (await requestJson(
        "/api/v1/admin/whatsapp/templates",
        templateForm,
        "POST"
      )) as WhatsappTemplate;
      setData((current) =>
        current
          ? { ...current, templates: [template, ...current.templates] }
          : current
      );
      setTemplateForm({
        name: "",
        category: "utility",
        language: "en",
        bodyText: "",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create template"
      );
    } finally {
      setWorking(null);
    }
  }

  async function updateTemplateStatus(
    template: WhatsappTemplate,
    status: string
  ) {
    const rejectionReason =
      status === "rejected"
        ? window.prompt("Rejection reason", template.rejectionReason ?? "")
        : null;
    if (status === "rejected" && rejectionReason === null) return;
    setWorking(`template-${template.id}`);
    setError(null);
    try {
      const updated = (await requestJson(
        `/api/v1/admin/whatsapp/templates/${template.id}`,
        { status, rejectionReason },
        "PUT"
      )) as WhatsappTemplate;
      setData((current) =>
        current
          ? { ...current, templates: replaceById(current.templates, updated) }
          : current
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update template"
      );
    } finally {
      setWorking(null);
    }
  }

  async function saveOptIn() {
    if (!optInForm.phone.trim()) return;
    setWorking("optin");
    setError(null);
    try {
      const optIn = (await requestJson(
        "/api/v1/admin/whatsapp/opt-ins",
        optInForm,
        "POST"
      )) as WhatsappOptIn;
      setData((current) => {
        if (!current) return current;
        const exists = current.optIns.some((item) => item.id === optIn.id);
        return {
          ...current,
          optIns: exists
            ? replaceById(current.optIns, optIn)
            : [optIn, ...current.optIns],
        };
      });
      setOptInForm({
        phone: "",
        status: "opted_in",
        source: "admin",
        consentText: "",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save opt-in"
      );
    } finally {
      setWorking(null);
    }
  }

  async function updateOptInStatus(optIn: WhatsappOptIn, status: string) {
    setWorking(`optin-${optIn.id}`);
    setError(null);
    try {
      const updated = (await requestJson(
        `/api/v1/admin/whatsapp/opt-ins/${optIn.id}/status`,
        { status, source: "admin" },
        "POST"
      )) as WhatsappOptIn;
      setData((current) =>
        current
          ? { ...current, optIns: replaceById(current.optIns, updated) }
          : current
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update opt-in"
      );
    } finally {
      setWorking(null);
    }
  }

  async function sendPlatformMessage() {
    const conversationId = selectedConversation?.id;
    const endpoint = conversationId
      ? `/api/v1/admin/whatsapp/platform/conversations/${conversationId}/messages`
      : "/api/v1/admin/whatsapp/platform/messages";
    const body: Record<string, unknown> = {
      to: conversationId ? undefined : messageForm.to,
      type: messageForm.type,
      text: messageForm.text,
      emoji: messageForm.emoji,
      mediaUrl: messageForm.mediaUrl,
      mediaId: messageForm.mediaId,
      caption: messageForm.caption,
      filename: messageForm.filename,
      latitude: messageForm.latitude ? Number(messageForm.latitude) : undefined,
      longitude: messageForm.longitude
        ? Number(messageForm.longitude)
        : undefined,
      name: messageForm.name,
      address: messageForm.address,
      templateName: messageForm.templateName,
      templateLanguage: messageForm.templateLanguage || "en",
    };

    setWorking("send-platform-message");
    setError(null);
    try {
      const data = (await requestJson(endpoint, body, "POST")) as {
        conversation: PlatformConversation;
        message: PlatformMessage;
      };
      setConversations((current) => {
        const exists = current.some(
          (conversation) => conversation.id === data.conversation.id
        );
        return exists
          ? current.map((conversation) =>
              conversation.id === data.conversation.id
                ? data.conversation
                : conversation
            )
          : [data.conversation, ...current];
      });
      setSelectedConversationId(data.conversation.id);
      setMessages((current) =>
        current.some((message) => message.publicId === data.message.publicId)
          ? current
          : [...current, data.message]
      );
      setMessageForm((current) => ({
        ...current,
        to: "",
        text: "",
        emoji: "",
        mediaUrl: "",
        mediaId: "",
        caption: "",
        filename: "",
        latitude: "",
        longitude: "",
        name: "",
        address: "",
        templateName: "",
        templateLanguage: "en",
      }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send WhatsApp message"
      );
    } finally {
      setWorking(null);
    }
  }

  async function markConversationReadById(conversationId: number) {
    const conversation = (await requestJson(
      `/api/v1/admin/whatsapp/platform/conversations/${conversationId}/read`,
      {},
      "POST"
    )) as PlatformConversation;
    setConversations((current) =>
      current.map((item) => (item.id === conversation.id ? conversation : item))
    );
  }

  async function markSelectedRead() {
    if (!selectedConversationId) return;
    await markConversationReadById(selectedConversationId);
  }

  async function sendTypingIndicator(conversationId: number) {
    const now = Date.now();
    const last = typingSignalRef.current;
    if (last.conversationId === conversationId && now - last.sentAt < 7000) {
      return;
    }
    typingSignalRef.current = { conversationId, sentAt: now };

    await requestJson(
      `/api/v1/admin/whatsapp/platform/conversations/${conversationId}/typing`,
      {},
      "POST"
    );
  }

  function messageText(message: PlatformMessage) {
    if (message.textBody) return message.textBody;
    if (message.messageType === "location") {
      return `${message.location.name ?? "Location"} ${
        message.location.latitude ?? ""
      }, ${message.location.longitude ?? ""}`;
    }
    if (
      ["image", "video", "audio", "document", "sticker"].includes(
        message.messageType
      )
    ) {
      return message.media.caption
        ? String(message.media.caption)
        : `${message.messageType} message`;
    }
    return `${message.messageType} message`;
  }

  function deliveryStatus(message: PlatformMessage) {
    const status = String(message.providerStatus ?? "").toLowerCase();
    if (status === "failed" || message.failedAt) return "failed";
    if (status === "read" || message.readAt) return "read";
    if (status === "delivered" || message.deliveredAt) return "delivered";
    if (status === "sent" || message.sentAt) return "sent";
    return status;
  }

  function deliveryTick(message: PlatformMessage) {
    const status = deliveryStatus(message);
    if (status === "failed") return "!";
    if (status === "delivered" || status === "read") return "✓✓";
    return "✓";
  }

  function setComposerMode(type: string) {
    setMessageForm((current) => ({ ...current, type }));
    setAttachmentOpen(false);
    setTemplatePickerOpen(type === "template");
  }

  function selectTemplate(template: WhatsappTemplate) {
    setMessageForm((current) => ({
      ...current,
      type: "template",
      templateName: template.name,
      templateLanguage: template.language || "en",
    }));
    setAttachmentOpen(false);
    setTemplatePickerOpen(false);
  }

  function composerValue() {
    if (
      ["image", "video", "audio", "document", "sticker"].includes(
        messageForm.type
      )
    ) {
      return messageForm.caption;
    }
    if (messageForm.type === "location") return messageForm.name;
    if (messageForm.type === "template") return messageForm.templateName;
    return messageForm.type === "emoji" ? messageForm.emoji : messageForm.text;
  }

  function updateComposerText(value: string) {
    if (selectedConversationId && value.trim()) {
      void sendTypingIndicator(selectedConversationId).catch(() => undefined);
    }

    if (
      ["image", "video", "audio", "document", "sticker"].includes(
        messageForm.type
      )
    ) {
      setMessageForm((current) => ({ ...current, caption: value }));
      return;
    }
    if (messageForm.type === "location") {
      setMessageForm((current) => ({ ...current, name: value }));
      return;
    }
    setMessageForm((current) => ({
      ...current,
      [current.type === "emoji" ? "emoji" : "text"]: value,
    }));
  }

  function composerPlaceholder() {
    if (messageForm.type === "emoji") return "Send emoji or short message";
    if (messageForm.type === "template") return "Select an approved template";
    if (
      ["image", "video", "audio", "document", "sticker"].includes(
        messageForm.type
      )
    ) {
      return "Add a caption";
    }
    if (messageForm.type === "location") return "Add a location note";
    return "Type a message";
  }

  const analytics = data?.analytics;

  if (view === "inbox") {
    return (
      <section className="space-y-4">
        <div className="rounded-lg border border-border/70 bg-card/80 p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.key}
                    variant={view === option.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setView(option.key)}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={socketState === "connected" ? "success" : "outline"}
                className="gap-2 rounded-full px-3 py-1"
              >
                <Wifi className="h-3.5 w-3.5" />
                {socketState === "connected" ? "Live" : "Connecting"}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {conversations.length} chats
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void refresh();
                  void refreshConversations(false);
                }}
                disabled={working === "refresh"}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          {error ? (
            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
          {liveNotice ? (
            <p className="mt-2 text-xs text-muted-foreground">{liveNotice}</p>
          ) : null}
        </div>

        <div className="grid min-h-[720px] overflow-hidden rounded-lg border border-border/70 bg-[#0b141a] shadow-2xl lg:grid-cols-[360px_1fr]">
          <aside className="flex min-h-[720px] flex-col border-r border-border/70 bg-[#111b21]">
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                    WhatsApp Inbox
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    Chats
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Refresh conversations"
                  onClick={() => void refreshConversations(false)}
                >
                  <RefreshCw className="h-4 w-4 text-slate-200" />
                </Button>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="border-white/10 bg-[#202c33] pl-9 text-slate-100 placeholder:text-slate-400"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void refreshConversations(false);
                  }}
                  placeholder="Search or start new chat"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.map((conversation) => {
                const isSelected = selectedConversationId === conversation.id;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => void loadMessages(conversation.id)}
                    className={`grid w-full grid-cols-[44px_1fr] gap-3 border-b border-white/5 px-4 py-3 text-left transition ${
                      isSelected ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white">
                      {conversationInitials(conversation)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-slate-50">
                          {conversationLabel(conversation)}
                        </p>
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {formatChatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="truncate text-xs text-slate-400">
                          {conversation.isSessionOpen
                            ? "24h reply window open"
                            : "Template required"}
                        </p>
                        {conversation.unreadCount ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[11px] font-semibold text-emerald-950">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
              {!conversations.length ? (
                <div className="m-4 rounded-lg border border-white/10 bg-white/5 p-5 text-center text-sm text-slate-300">
                  No WhatsApp conversations yet.
                </div>
              ) : null}
            </div>
          </aside>

          <section className="flex min-h-[720px] flex-col bg-[#0b141a]">
            <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#202c33] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-600 text-sm font-semibold text-white">
                  {selectedConversation ? (
                    conversationInitials(selectedConversation)
                  ) : (
                    <UserRound className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-white">
                    {conversationLabel(selectedConversation)}
                  </h3>
                  <p className="truncate text-xs text-slate-400">
                    {selectedConversation
                      ? `Session expires ${formatDate(
                          selectedConversation.expiresAt
                        )}`
                      : "Select a chat or enter a phone number below"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConversation ? (
                  <Badge
                    variant={
                      selectedConversation.isSessionOpen ? "success" : "warning"
                    }
                    className="hidden rounded-full px-3 py-1 sm:inline-flex"
                  >
                    {selectedConversation.isSessionOpen
                      ? "Reply window open"
                      : "Template required"}
                  </Badge>
                ) : null}
                {selectedConversation ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Mark read"
                    onClick={() => void markSelectedRead()}
                  >
                    <CheckCircle2 className="h-4 w-4 text-slate-200" />
                  </Button>
                ) : null}
              </div>
            </header>

            <div
              className="relative flex-1 overflow-y-auto px-4 py-5"
              style={{
                backgroundColor: "#0b141a",
                backgroundImage:
                  "radial-gradient(circle at 18px 18px, rgba(255,255,255,0.055) 1px, transparent 1.5px), radial-gradient(circle at 52px 42px, rgba(255,255,255,0.035) 1px, transparent 1.5px)",
                backgroundSize: "72px 72px",
              }}
            >
              <div className="mx-auto flex max-w-4xl flex-col gap-2">
                {messages.map((message) => {
                  const outbound = message.direction === "outbound";
                  return (
                    <div
                      key={message.publicId}
                      className={`flex ${
                        outbound ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[82%] rounded-lg px-3 py-2 text-sm shadow md:max-w-[66%] ${
                          outbound
                            ? "bg-[#005c4b] text-white"
                            : "bg-[#202c33] text-slate-50"
                        }`}
                      >
                        {[
                          "image",
                          "video",
                          "audio",
                          "document",
                          "sticker",
                        ].includes(message.messageType) ? (
                          <p className="mb-1 flex items-center gap-1.5 rounded bg-black/15 px-2 py-1 text-xs text-slate-200">
                            <Paperclip className="h-3.5 w-3.5" />
                            {String(
                              message.media.link ?? message.media.id ?? "media"
                            )}
                          </p>
                        ) : null}
                        {message.messageType === "location" ? (
                          <p className="mb-1 flex items-center gap-1.5 rounded bg-black/15 px-2 py-1 text-xs text-slate-200">
                            <MapPin className="h-3.5 w-3.5" />
                            {String(message.location.latitude ?? "")},{" "}
                            {String(message.location.longitude ?? "")}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap leading-6">
                          {messageText(message)}
                        </p>
                        {message.failureReason ? (
                          <p className="mt-2 rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-100">
                            {message.failureReason}
                          </p>
                        ) : null}
                        <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-slate-300/80">
                          <span>{formatChatTime(message.createdAt)}</span>
                          {outbound ? (
                            <span
                              title={deliveryStatus(message) || "sent"}
                              className={
                                deliveryStatus(message) === "read"
                                  ? "font-bold text-[#53bdeb]"
                                  : deliveryStatus(message) === "failed"
                                  ? "font-bold text-rose-300"
                                  : "text-slate-300"
                              }
                            >
                              {deliveryTick(message)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!messages.length ? (
                  <div className="mx-auto mt-16 rounded-lg border border-white/10 bg-[#202c33]/90 px-5 py-4 text-center text-sm text-slate-300">
                    Choose a conversation or enter a phone number to begin.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="relative border-t border-white/10 bg-[#202c33] p-3">
              {selectedConversation && !selectedConversation.isSessionOpen ? (
                <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  24h session closed. Send an approved template to restart.
                </div>
              ) : null}

              {attachmentOpen ? (
                <div className="absolute bottom-20 left-3 z-20 w-64 overflow-hidden rounded-lg border border-white/10 bg-[#111b21] p-2 shadow-2xl">
                  {[
                    { type: "image", label: "Image", icon: ImageIcon },
                    { type: "video", label: "Video", icon: Video },
                    { type: "audio", label: "Audio", icon: Mic },
                    { type: "document", label: "Document", icon: File },
                    { type: "location", label: "Location", icon: MapPin },
                    { type: "template", label: "Template", icon: ListChecks },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setComposerMode(item.type)}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-slate-100 hover:bg-[#202c33]"
                      >
                        <Icon className="h-4 w-4 text-emerald-300" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {templatePickerOpen ? (
                <div className="absolute bottom-20 left-3 right-3 z-30 max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-[#111b21] p-3 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Approved templates
                      </p>
                      <p className="text-xs text-slate-400">
                        {approvedTemplates.length} ready to send
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTemplatePickerOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {approvedTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => selectTemplate(template)}
                        className="rounded-lg border border-white/10 bg-[#202c33] p-3 text-left hover:border-emerald-400/60"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {template.name}
                          </p>
                          <Badge variant="success">{template.language}</Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">
                          {template.bodyText}
                        </p>
                      </button>
                    ))}
                    {!approvedTemplates.length ? (
                      <div className="rounded-lg border border-white/10 bg-[#202c33] p-4 text-sm text-slate-300">
                        No approved templates found.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {["image", "video", "audio", "document", "sticker"].includes(
                messageForm.type
              ) ? (
                <div className="mb-3 grid gap-2 rounded-lg border border-white/10 bg-[#111b21] p-3 md:grid-cols-[160px_1fr_1fr]">
                  <select
                    className="h-10 rounded-md border border-white/10 bg-[#0b141a] px-3 text-sm text-slate-100"
                    value={messageForm.type}
                    onChange={(event) => setComposerMode(event.target.value)}
                  >
                    {["image", "video", "audio", "document", "sticker"].map(
                      (option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      )
                    )}
                  </select>
                  <Input
                    className="border-white/10 bg-[#0b141a] text-slate-100"
                    placeholder="Media URL"
                    value={messageForm.mediaUrl}
                    onChange={(event) =>
                      setMessageForm((current) => ({
                        ...current,
                        mediaUrl: event.target.value,
                      }))
                    }
                  />
                  <Input
                    className="border-white/10 bg-[#0b141a] text-slate-100"
                    placeholder="Media ID"
                    value={messageForm.mediaId}
                    onChange={(event) =>
                      setMessageForm((current) => ({
                        ...current,
                        mediaId: event.target.value,
                      }))
                    }
                  />
                  {messageForm.type === "document" ? (
                    <Input
                      className="border-white/10 bg-[#0b141a] text-slate-100 md:col-span-3"
                      placeholder="Filename"
                      value={messageForm.filename}
                      onChange={(event) =>
                        setMessageForm((current) => ({
                          ...current,
                          filename: event.target.value,
                        }))
                      }
                    />
                  ) : null}
                </div>
              ) : null}

              {messageForm.type === "location" ? (
                <div className="mb-3 grid gap-2 rounded-lg border border-white/10 bg-[#111b21] p-3 md:grid-cols-2">
                  <Input
                    className="border-white/10 bg-[#0b141a] text-slate-100"
                    placeholder="Latitude"
                    value={messageForm.latitude}
                    onChange={(event) =>
                      setMessageForm((current) => ({
                        ...current,
                        latitude: event.target.value,
                      }))
                    }
                  />
                  <Input
                    className="border-white/10 bg-[#0b141a] text-slate-100"
                    placeholder="Longitude"
                    value={messageForm.longitude}
                    onChange={(event) =>
                      setMessageForm((current) => ({
                        ...current,
                        longitude: event.target.value,
                      }))
                    }
                  />
                  <Input
                    className="border-white/10 bg-[#0b141a] text-slate-100"
                    placeholder="Place name"
                    value={messageForm.name}
                    onChange={(event) =>
                      setMessageForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                  <Input
                    className="border-white/10 bg-[#0b141a] text-slate-100"
                    placeholder="Address"
                    value={messageForm.address}
                    onChange={(event) =>
                      setMessageForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}

              {messageForm.type === "template" ? (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-[#111b21] p-3">
                  <Badge variant="success" className="rounded-full">
                    Template
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setTemplatePickerOpen(true)}
                    className="text-sm font-medium text-white underline-offset-4 hover:underline"
                  >
                    {messageForm.templateName || "Select approved template"}
                  </button>
                  {messageForm.templateLanguage ? (
                    <Badge variant="outline">
                      {messageForm.templateLanguage}
                    </Badge>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Attach media, location, or template"
                  onClick={() => setAttachmentOpen((current) => !current)}
                  className="shrink-0 text-slate-200"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Emoji message"
                  onClick={() => setComposerMode("emoji")}
                  className="hidden shrink-0 text-slate-200 sm:inline-flex"
                >
                  <Smile className="h-5 w-5" />
                </Button>
                <div className="flex-1 space-y-2">
                  {!selectedConversation ? (
                    <Input
                      className="border-white/10 bg-[#111b21] text-slate-100 placeholder:text-slate-400"
                      placeholder="Recipient phone number"
                      value={messageForm.to}
                      onChange={(event) =>
                        setMessageForm((current) => ({
                          ...current,
                          to: event.target.value,
                        }))
                      }
                    />
                  ) : null}
                  <textarea
                    className="max-h-32 min-h-11 w-full resize-none rounded-3xl border border-white/10 bg-[#2a3942] px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-400 focus:border-emerald-400/50"
                    placeholder={composerPlaceholder()}
                    value={composerValue()}
                    readOnly={messageForm.type === "template"}
                    onClick={() => {
                      if (messageForm.type === "template")
                        setTemplatePickerOpen(true);
                    }}
                    onChange={(event) => updateComposerText(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        void sendPlatformMessage();
                      }
                    }}
                  />
                </div>
                <Button
                  size="icon"
                  title="Send message"
                  onClick={() => void sendPlatformMessage()}
                  disabled={working === "send-platform-message"}
                  className="h-11 w-11 shrink-0 rounded-full"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Control
              </CardDescription>
              <CardTitle className="mt-2 text-2xl">WhatsApp console</CardTitle>
            </div>
            <Button
              variant="outline"
              onClick={() => void refresh()}
              disabled={working === "refresh"}
            >
              <RefreshCw className="h-4 w-4" />
              {working === "refresh" ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void refresh();
                }}
                placeholder="Search template, phone, vendor, provider id, or failure reason"
              />
            </div>
            <Button
              onClick={() => void refresh()}
              disabled={working === "refresh"}
            >
              Search
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={templateStatus}
              onChange={(event) => setTemplateStatus(event.target.value)}
            >
              {[
                "all",
                "draft",
                "submitted",
                "approved",
                "rejected",
                "paused",
                "disabled",
              ].map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All templates" : option}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={optInStatus}
              onChange={(event) => setOptInStatus(event.target.value)}
            >
              {["all", "opted_in", "opted_out", "revoked"].map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All opt-ins" : option}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={logStatus}
              onChange={(event) => setLogStatus(event.target.value)}
            >
              {["all", "queued", "sent", "delivered", "read", "failed"].map(
                (option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All sends" : option}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.key}
                  variant={view === option.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView(option.key)}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant={socketState === "connected" ? "success" : "outline"}
              className="gap-2"
            >
              <Wifi className="h-3.5 w-3.5" />
              {socketState === "connected"
                ? "Live inbox connected"
                : "Live inbox connecting"}
            </Badge>
            {liveNotice ? <span>{liveNotice}</span> : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Platform WhatsApp reply</p>
            {!selectedConversation ? (
              <Input
                placeholder="New recipient phone"
                value={messageForm.to}
                onChange={(event) =>
                  setMessageForm((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
              />
            ) : null}
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={messageForm.type}
              onChange={(event) =>
                setMessageForm((current) => ({
                  ...current,
                  type: event.target.value,
                }))
              }
            >
              {[
                "text",
                "emoji",
                "image",
                "video",
                "audio",
                "document",
                "sticker",
                "location",
                "template",
              ].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {["text", "emoji"].includes(messageForm.type) ? (
              <textarea
                className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder={
                  messageForm.type === "emoji"
                    ? "Emoji or short message"
                    : "Message text"
                }
                value={
                  messageForm.type === "emoji"
                    ? messageForm.emoji
                    : messageForm.text
                }
                onChange={(event) =>
                  setMessageForm((current) => ({
                    ...current,
                    [messageForm.type === "emoji" ? "emoji" : "text"]:
                      event.target.value,
                  }))
                }
              />
            ) : null}
            {["image", "video", "audio", "document", "sticker"].includes(
              messageForm.type
            ) ? (
              <div className="space-y-2">
                <Input
                  placeholder="Media URL"
                  value={messageForm.mediaUrl}
                  onChange={(event) =>
                    setMessageForm((current) => ({
                      ...current,
                      mediaUrl: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Media ID"
                  value={messageForm.mediaId}
                  onChange={(event) =>
                    setMessageForm((current) => ({
                      ...current,
                      mediaId: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Caption"
                  value={messageForm.caption}
                  onChange={(event) =>
                    setMessageForm((current) => ({
                      ...current,
                      caption: event.target.value,
                    }))
                  }
                />
                {messageForm.type === "document" ? (
                  <Input
                    placeholder="Filename"
                    value={messageForm.filename}
                    onChange={(event) =>
                      setMessageForm((current) => ({
                        ...current,
                        filename: event.target.value,
                      }))
                    }
                  />
                ) : null}
              </div>
            ) : null}
            {messageForm.type === "location" ? (
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Latitude"
                  value={messageForm.latitude}
                  onChange={(event) =>
                    setMessageForm((current) => ({
                      ...current,
                      latitude: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Longitude"
                  value={messageForm.longitude}
                  onChange={(event) =>
                    setMessageForm((current) => ({
                      ...current,
                      longitude: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Place name"
                  value={messageForm.name}
                  onChange={(event) =>
                    setMessageForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder="Address"
                  value={messageForm.address}
                  onChange={(event) =>
                    setMessageForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
            {messageForm.type === "template" ? (
              <Input
                placeholder="Template name"
                value={messageForm.templateName}
                onChange={(event) =>
                  setMessageForm((current) => ({
                    ...current,
                    templateName: event.target.value,
                  }))
                }
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void sendPlatformMessage()}
                disabled={working === "send-platform-message"}
              >
                <Send className="h-4 w-4" />
                {working === "send-platform-message" ? "Sending..." : "Send"}
              </Button>
              {selectedConversation ? (
                <Button
                  variant="outline"
                  onClick={() => void markSelectedRead()}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark read
                </Button>
              ) : null}
            </div>
            {selectedConversation && !selectedConversation.isSessionOpen ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                24h session is closed. Use an approved template to restart the
                conversation.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Approved templates</p>
              <p className="mt-1 text-xl font-semibold">
                {analytics?.approvedTemplates ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Pending templates</p>
              <p className="mt-1 text-xl font-semibold">
                {analytics?.pendingTemplates ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Opt-ins 24h</p>
              <p className="mt-1 text-xl font-semibold">
                {analytics?.optIns24h ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 p-3">
              <p className="text-muted-foreground">Vendors 24h</p>
              <p className="mt-1 text-xl font-semibold">
                {analytics?.vendors24h ?? 0}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Create template</p>
            <Input
              placeholder="template_name"
              value={templateForm.name}
              onChange={(event) =>
                setTemplateForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={templateForm.category}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                {["utility", "marketing", "authentication", "service"].map(
                  (option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  )
                )}
              </select>
              <Input
                placeholder="Language"
                value={templateForm.language}
                onChange={(event) =>
                  setTemplateForm((current) => ({
                    ...current,
                    language: event.target.value,
                  }))
                }
              />
            </div>
            <textarea
              className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Template body"
              value={templateForm.bodyText}
              onChange={(event) =>
                setTemplateForm((current) => ({
                  ...current,
                  bodyText: event.target.value,
                }))
              }
            />
            <Button
              onClick={() => void createTemplate()}
              disabled={working === "template"}
            >
              Create template
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Record opt-in</p>
            <Input
              placeholder="Phone number"
              value={optInForm.phone}
              onChange={(event) =>
                setOptInForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
            />
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={optInForm.status}
              onChange={(event) =>
                setOptInForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              {["opted_in", "opted_out", "revoked"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <textarea
              className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Consent note"
              value={optInForm.consentText}
              onChange={(event) =>
                setOptInForm((current) => ({
                  ...current,
                  consentText: event.target.value,
                }))
              }
            />
            <Button
              onClick={() => void saveOptIn()}
              disabled={working === "optin"}
            >
              Save opt-in
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>
            {VIEW_OPTIONS.find((option) => option.key === view)?.label}
          </CardTitle>
          <CardDescription>
            {activeRecords} records returned for the current filters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {view === "templates"
            ? data?.templates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-lg border border-border/70 bg-background/30 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={toneForStatus(template.status)}>
                          {template.status}
                        </Badge>
                        <Badge variant="outline">{template.category}</Badge>
                        <Badge variant="outline">{template.language}</Badge>
                      </div>
                      <h3 className="text-lg font-semibold">{template.name}</h3>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {template.bodyText}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {template.messageCount} sends / {template.failedCount}{" "}
                        failed
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["submitted", "approved", "rejected", "disabled"].map(
                        (status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={
                              status === "approved" ? "default" : "outline"
                            }
                            onClick={() =>
                              void updateTemplateStatus(template, status)
                            }
                            disabled={working === `template-${template.id}`}
                          >
                            {status === "approved" ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : null}
                            {status}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))
            : null}

          {view === "optIns"
            ? data?.optIns.map((optIn) => (
                <div
                  key={optIn.id}
                  className="rounded-lg border border-border/70 bg-background/30 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <Badge variant={toneForStatus(optIn.status)}>
                        {optIn.status}
                      </Badge>
                      <h3 className="text-lg font-semibold">
                        {optIn.phoneE164 ?? optIn.phone}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {vendorLabel(optIn.vendor)} /{" "}
                        {optIn.user?.fullName ?? "No linked user"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Source {optIn.source} / created{" "}
                        {formatDate(optIn.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["opted_in", "opted_out", "revoked"].map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={
                            status === "opted_in" ? "default" : "outline"
                          }
                          onClick={() => void updateOptInStatus(optIn, status)}
                          disabled={working === `optin-${optIn.id}`}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            : null}

          {view === "logs" || view === "failed"
            ? (view === "failed" ? data?.failedSends : data?.logs)?.map(
                (log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-border/70 bg-background/30 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={toneForStatus(log.status)}>
                            {log.status}
                          </Badge>
                          <Badge variant="outline">{log.messageType}</Badge>
                          {log.templateName ? (
                            <Badge variant="outline">{log.templateName}</Badge>
                          ) : null}
                        </div>
                        <h3 className="text-lg font-semibold">
                          {log.recipientPhoneE164 ?? log.recipientPhone}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {vendorLabel(log.vendor)} /{" "}
                          {formatDate(log.createdAt)}
                        </p>
                        {log.failureReason ? (
                          <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                            {log.failureReason}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-sm text-muted-foreground lg:text-right">
                        <p>
                          {log.currency} {log.estimatedCost.toFixed(4)}
                        </p>
                        <p>
                          {log.providerMessageId ??
                            log.failureCode ??
                            "No provider id"}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )
            : null}

          {activeRecords === 0 ? (
            <div className="rounded-lg border border-border/70 bg-background/30 p-6 text-center text-sm text-muted-foreground">
              No records match the current filters.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
