"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

function getAdminToken() {
  const tokenEntry = document.cookie
    .split("; ")
    .find((part) => part.startsWith("vendero_admin_access_token="));

  return tokenEntry?.split("=")[1] ?? null;
}

export function SecureIdReviewActions({
  resourceType,
  resourceId,
  status,
}: {
  resourceType: string;
  resourceId: number;
  status: string;
}) {
  const router = useRouter();
  const [workingStatus, setWorkingStatus] = useState<string | null>(null);

  async function updateStatus(verificationStatus: "pending" | "approved" | "rejected") {
    const token = getAdminToken();
    setWorkingStatus(verificationStatus);
    try {
      const response = await fetch(
        `/api/v1/admin/secure-id/${resourceType}/${resourceId}/verification`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ verificationStatus }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? "Unable to update verification");
      }

      router.refresh();
    } finally {
      setWorkingStatus(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "approved" ? (
        <Button
          size="sm"
          onClick={() => updateStatus("approved")}
          disabled={Boolean(workingStatus)}
        >
          <CheckCircle2 className="h-4 w-4" />
          {workingStatus === "approved" ? "Approving..." : "Approve"}
        </Button>
      ) : null}
      {status !== "pending" ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus("pending")}
          disabled={Boolean(workingStatus)}
        >
          <Clock3 className="h-4 w-4" />
          {workingStatus === "pending" ? "Saving..." : "Pending"}
        </Button>
      ) : null}
      {status !== "rejected" ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus("rejected")}
          disabled={Boolean(workingStatus)}
        >
          <ShieldAlert className="h-4 w-4" />
          {workingStatus === "rejected" ? "Rejecting..." : "Reject"}
        </Button>
      ) : null}
    </div>
  );
}
