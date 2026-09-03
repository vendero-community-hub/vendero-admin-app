// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./whatsapp-pilot-account-operations-panel", () => ({
  WhatsPilotAccountOperationsPanel: () => <div>Account operation search</div>,
}));

vi.mock("@/components/ui/action-modal", () => ({
  useActionModal: () => ({
    confirm: vi.fn(async () => false),
    prompt: vi.fn(async () => null),
  }),
}));

import { WhatsPilotLifecyclePanel } from "./whatsapp-pilot-lifecycle-panel";

const pendingRequest = {
  id: "wpdr_test",
  accountId: "wpa_test",
  status: "pending",
  source: "vendor_request",
  reason: "Requested by account owner",
  accountGeneration: 1,
  requestedAt: "2026-09-01T08:00:00.000Z",
  vendorBusinessName: "Example Cabs",
  wabaId: "waba_123",
};

const deletedAccount = {
  id: "wpa_deleted_fleet",
  generation: 2,
  vendorProfileId: 44,
  vendorBusinessName: "Fleet Archives",
  businessName: "Fleet Archives",
  wabaId: "waba_deleted_44",
  phoneNumbers: [
    {
      phoneNumberId: "phone_44",
      displayPhoneNumber: "+91 99999 00044",
      verifiedName: "Fleet Archives",
      status: "retired",
    },
  ],
  deletionSource: "vendor_request",
  deletionReason: "The owner closed this WhatsPilot workspace",
  requesterName: "Vendor Owner",
  reviewerName: "Archive Admin",
  deletedAt: "2026-09-01T09:00:00.000Z",
  counts: { contacts: 2, conversations: 2, messages: 3 },
};

const archivedConversations = [
  {
    id: "wpconv_asha",
    contact: {
      id: "wpc_asha",
      name: "Asha Rider",
      displayName: "Asha Rider",
      phone: "+91 98888 10001",
      waId: "919888810001",
    },
    handlingMode: "bot",
    status: "archived",
    lastMessage: "Your receipt is attached",
    lastMessageAt: "2026-08-31T10:03:00.000Z",
    messageCount: 3,
    readOnly: true,
  },
  {
    id: "wpconv_karan",
    contact: {
      id: "wpc_karan",
      name: "Karan Shah",
      phone: "+91 98888 10002",
    },
    handlingMode: "human",
    status: "archived",
    lastMessage: "Thank you",
    lastMessageAt: "2026-08-30T07:00:00.000Z",
    messageCount: 1,
    readOnly: true,
  },
];

const archivedMessages = [
  {
    id: "wam_receipt",
    direction: "outbound",
    actor: "human",
    type: "image",
    text: "Your receipt is attached",
    status: "read",
    providerTimestamp: "2026-08-31T10:03:00.000Z",
    sentAt: "2026-08-31T10:03:00.000Z",
    deliveredAt: "2026-08-31T10:03:10.000Z",
    readAt: "2026-08-31T10:04:00.000Z",
    replyTo: { messageId: "wam_question" },
    reactions: [{ emoji: "👍", count: 2 }],
    attachment: {
      availability: "ready",
      mediaType: "image",
      mimeType: "image/jpeg",
      fileName: "receipt.jpg",
      url: "https://cdn.example.test/archive/receipt.jpg",
    },
  },
  {
    id: "wam_question",
    direction: "inbound",
    actor: "customer",
    type: "text",
    text: "Hello, I need the receipt.",
    status: "received",
    providerTimestamp: "2026-08-31T10:01:00.000Z",
    receivedAt: "2026-08-31T10:01:00.000Z",
  },
  {
    id: "wam_voice",
    direction: "inbound",
    actor: "customer",
    type: "audio",
    text: "An older voice note",
    status: "received",
    providerTimestamp: "2026-08-31T10:02:00.000Z",
    receivedAt: "2026-08-31T10:02:00.000Z",
    attachment: {
      availability: "unavailable",
      mediaType: "audio",
      mimeType: "audio/ogg",
      fileName: "voice-note.ogg",
      reason: "provider_media_expired",
    },
  },
];

function jsonResponse(payload: unknown) {
  return Promise.resolve({
    ok: true,
    statusText: "OK",
    json: async () => payload,
  } as Response);
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/deletion-requests")) {
        return jsonResponse({
          data: {
            items: [pendingRequest],
            counts: { pending: 1 },
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
        });
      }
      if (url.includes("/deleted-accounts")) {
        return jsonResponse({
          data: {
            items: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WhatsPilotLifecyclePanel", () => {
  it("shows the pending badge and loads the admin approval queue", async () => {
    const user = userEvent.setup();
    render(<WhatsPilotLifecyclePanel />);

    expect(screen.getByText("Account operation search")).toBeTruthy();
    const requestsTab = screen.getByRole("tab", { name: /Deletion Requests/i });
    await waitFor(() => expect(within(requestsTab).getByText("1")).toBeTruthy());

    await user.click(requestsTab);

    expect(await screen.findByText("Example Cabs")).toBeTruthy();
    expect(screen.getByText("Requested by account owner")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Approve/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Reject$/i })).toBeTruthy();
  });

  it("shows the Mongo archive failure and an admin retry action", async () => {
    const failedRequest = {
      ...pendingRequest,
      status: "failed",
      cleanupError: {
        code: "E_WHATS_PILOT_MONGO_ARCHIVE_UNAVAILABLE",
        message: "MongoDB archive could not be verified.",
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/deletion-requests")) {
          return jsonResponse({
            data: {
              items: [failedRequest],
              counts: { pending: 0 },
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          });
        }
        if (url.includes("/deleted-accounts")) {
          return jsonResponse({
            data: {
              items: [],
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    const user = userEvent.setup();
    render(<WhatsPilotLifecyclePanel />);
    await user.click(screen.getByRole("tab", { name: /Deletion Requests/i }));
    await user.click(screen.getByRole("button", { name: /^failed$/i }));

    expect(
      await screen.findByText(/E_WHATS_PILOT_MONGO_ARCHIVE_UNAVAILABLE/),
    ).toBeTruthy();
    expect(screen.getByText(/MongoDB archive could not be verified/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Retry archive/i })).toBeTruthy();
  });

  it("exposes deleted generations as an immutable read-only archive", async () => {
    const user = userEvent.setup();
    render(<WhatsPilotLifecyclePanel />);

    await user.click(screen.getByRole("tab", { name: /Deleted Accounts/i }));

    expect(await screen.findByText("Deleted WhatsPilot accounts")).toBeTruthy();
    expect(
      screen.getByText(/Immutable account generations retained for audited, read-only inspection/i),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Reconnect/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Restore/i })).toBeNull();
  });

  it("navigates from a deleted account to its contacts and exact read-only chat", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/deletion-requests")) {
        return jsonResponse({
          data: {
            items: [pendingRequest],
            counts: { pending: 1 },
            pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
          },
        });
      }
      if (url.includes("/wpconv_asha/messages")) {
        return jsonResponse({
          data: {
            account: deletedAccount,
            conversation: archivedConversations[0],
            messages: archivedMessages,
            pagination: { page: 1, limit: 50, total: 3, totalPages: 1 },
            readOnly: true,
          },
        });
      }
      if (url.includes("/wpa_deleted_fleet/conversations")) {
        return jsonResponse({
          data: {
            account: deletedAccount,
            conversations: archivedConversations,
            pagination: { page: 1, limit: 25, total: 2, totalPages: 1 },
            readOnly: true,
          },
        });
      }
      if (url.includes("/deleted-accounts")) {
        return jsonResponse({
          data: {
            items: [deletedAccount],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<WhatsPilotLifecyclePanel />);

    await user.click(screen.getByRole("tab", { name: /Deleted Accounts/i }));

    expect(await screen.findByText("Fleet Archives")).toBeTruthy();
    expect(screen.getByText("+91 99999 00044")).toBeTruthy();
    const openInbox = screen.getByRole("button", {
      name: "Open archived inbox for Fleet Archives",
    });
    const accountRow = openInbox.closest("article");
    expect(accountRow).not.toBeNull();
    expect(within(accountRow as HTMLElement).getByText("Contacts")).toBeTruthy();
    expect(within(accountRow as HTMLElement).getAllByText("2")).toHaveLength(2);
    await user.click(openInbox);

    expect(await screen.findByText("Contacts & conversations")).toBeTruthy();
    expect(screen.getByText("Asha Rider")).toBeTruthy();
    expect(screen.getByText("Your receipt is attached")).toBeTruthy();
    expect(screen.getByText("Karan Shah")).toBeTruthy();
    expect(screen.queryByText("Deleted WhatsPilot accounts")).toBeNull();

    await user.click(
      screen.getByRole("button", {
        name: "Open archived conversation with Asha Rider",
      }),
    );

    expect(await screen.findByText("Hello, I need the receipt.")).toBeTruthy();
    const chatMessages = screen.getAllByTestId("archived-message");
    expect(chatMessages).toHaveLength(3);
    expect(chatMessages.map((message) => message.getAttribute("data-message-time"))).toEqual([
      "2026-08-31T10:01:00.000Z",
      "2026-08-31T10:02:00.000Z",
      "2026-08-31T10:03:00.000Z",
    ]);
    expect(within(chatMessages[2]).getByText("Reply to wam_question")).toBeTruthy();
    expect(within(chatMessages[2]).getByText("👍 2")).toBeTruthy();
    expect(within(chatMessages[2]).getByRole("img", { name: "receipt.jpg" })).toBeTruthy();
    expect(within(chatMessages[2]).getByText(/^Delivered /)).toBeTruthy();
    expect(within(chatMessages[2]).getByText(/^Read /)).toBeTruthy();
    expect(
      within(chatMessages[1]).getByText("Archived media is unavailable or expired."),
    ).toBeTruthy();

    for (const name of [
      /^Reply$/i,
      /^Send$/i,
      /Mark read/i,
      /Typing/i,
      /Delete message/i,
      /Reconnect/i,
      /Restore/i,
    ]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit | undefined)?.method ?? "GET").toBe("GET");
    }

    await user.click(
      screen.getByRole("button", { name: "Back to deleted WhatsApp accounts" }),
    );
    expect(await screen.findByText("Deleted WhatsPilot accounts")).toBeTruthy();
  });
});
