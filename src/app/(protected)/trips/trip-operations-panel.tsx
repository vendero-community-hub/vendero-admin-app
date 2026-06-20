"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
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

type VendorSummary = {
  id: number;
  businessName: string | null;
  ownerName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  isVerified: boolean;
  verificationStatus: string | null;
  subscriptionTier: string | null;
} | null;

type TripSummary = {
  id: number;
  status: string | null;
  tripType: string | null;
  route: string;
  pickupPlaceName: string | null;
  dropPlaceName: string | null;
  pickupDatetime: string | null;
  returnDatetime: string | null;
  rateTotal: string | null;
  distanceKm: string | null;
  cabCategoryName: string | null;
  cabModelName: string | null;
  tripOrigin: string | null;
  isPremiumOnly: boolean;
  recipientCount: number;
  requestCount: number;
  activeRequestCount: number;
  acceptedRequestCount: number;
  acceptedByVendorProfileId: number | null;
  ownerVendor: VendorSummary;
  acceptedVendor: VendorSummary;
  assignedDriver: {
    id: number;
    fullName: string | null;
    phone: string | null;
    verificationStatus: string | null;
  } | null;
  assignedCab: {
    id: number;
    cabNumber: string | null;
    color: string | null;
    status: string | null;
    verificationStatus: string | null;
  } | null;
  sharedAt: string | null;
  acceptedAt: string | null;
  driverCabAssignedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  conflictCount: number;
};

type TimelineEvent = {
  key: string;
  label: string;
  status: string;
  occurredAt: string | null;
  actor?: string | null;
  detail?: string | null;
};

type ConflictFinding = {
  key: string;
  severity: "low" | "medium" | "high";
  badgeVariant?: "default" | "warning" | "danger";
  title: string;
  detail: string;
  relatedIds?: number[];
};

type TripDetail = {
  trip: TripSummary;
  timeline: TimelineEvent[];
  acceptedVendor:
    | (NonNullable<VendorSummary> & {
        acceptedAt: string | null;
        assignedDriver: TripSummary["assignedDriver"];
        assignedCab: TripSummary["assignedCab"];
        acceptedRequest: Record<string, unknown> | null;
      })
    | null;
  conflicts: ConflictFinding[];
  recipients: Array<Record<string, any>>;
  requests: Array<Record<string, any>>;
  submissions: Array<Record<string, any>>;
  publicLinks: Array<Record<string, any>>;
};

type PreviewCity = {
  id: number;
  name: string;
  stateName: string | null;
};

type PreviewPlace = {
  id: number;
  type?: "city" | "airport";
  label?: string | null;
  name?: string | null;
  stateName?: string | null;
  state?: string | null;
  countryIsoCode?: string | null;
};

type PreviewCabCategory = {
  id: number;
  name: string;
  onewayPerKmRate: string;
  roundTripPerKmRate: string;
};

type PreviewCabModel = PreviewCabCategory & {
  cabCategoryId: number;
};

type PremiumPreviewVendor = {
  id: number;
  publicId: string | null;
  displayName: string | null;
  businessName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  status: string | null;
  isVerified: boolean;
  priority: number;
  createdByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type PremiumPreviewTrip = {
  id: number;
  publicId: string | null;
  title: string | null;
  status: string | null;
  tripType: string | null;
  route: string;
  pickupAddress: string | null;
  dropAddress: string | null;
  pickupPlaceName: string | null;
  dropPlaceName: string | null;
  pickupDatetime: string | null;
  rateTotal: string | null;
  distanceKm: string | null;
  perKmRate: string | null;
  cabCategoryName: string | null;
  cabModelName: string | null;
  badgeLabel: string | null;
  fareQuality: string | null;
  previewVendorId: number | null;
  previewVendor: PremiumPreviewVendor | null;
  priority: number;
  createdByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type PreviewSettings = {
  showPreviews: boolean;
  realTripLimit: number;
  previewTripLimit: number;
  updatedAt: string | null;
};

type PreviewMeta = {
  cities: PreviewCity[];
  cabCategories: PreviewCabCategory[];
  cabModels: PreviewCabModel[];
  previewVendors: PremiumPreviewVendor[];
};

export type TripOperationsData = {
  trips: TripSummary[];
  filters: {
    q: string;
    status: string | null;
    limit: number;
    offset: number;
  };
  analytics: {
    totalReturned: number;
    byStatus: Record<string, number>;
    conflictTripCount: number;
  };
} | null;

const STATUS_OPTIONS = [
  "all",
  "open",
  "shared",
  "accepted",
  "completed",
  "cancelled",
  "expired",
];

function unwrapPayload(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

const emptyPreviewMeta: PreviewMeta = {
  cities: [],
  cabCategories: [],
  cabModels: [],
  previewVendors: [],
};

const defaultPreviewSettings: PreviewSettings = {
  showPreviews: true,
  realTripLimit: 5,
  previewTripLimit: 5,
  updatedAt: null,
};

function previewPlaceLabel(place: PreviewPlace | null) {
  if (!place) return "";
  if (place.label) return place.label;
  return [
    place.name ?? `City #${place.id}`,
    place.stateName ?? place.state,
    place.countryIsoCode,
  ]
    .filter(Boolean)
    .join(", ");
}

function PreviewPlaceSearchInput({
  label,
  value,
  placeholder,
  selectedPlace,
  results,
  loading,
  onChange,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  selectedPlace: PreviewPlace | null;
  results: PreviewPlace[];
  loading: boolean;
  onChange: (value: string) => void;
  onSelect: (place: PreviewPlace) => void;
}) {
  const showResults = results.length > 0;

  return (
    <div className="relative space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
      <div className="min-h-5">
        {selectedPlace ? (
          <Badge variant="success" className="text-[11px]">
            Selected Vendero city
          </Badge>
        ) : loading ? (
          <span className="text-xs text-muted-foreground">Searching...</span>
        ) : value.trim().length >= 2 ? (
          <span className="text-xs text-muted-foreground">
            Select a city from results.
          </span>
        ) : null}
      </div>
      {showResults ? (
        <div className="absolute z-20 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
          {results.map((place) => (
            <button
              key={`${place.type ?? "city"}-${place.id}`}
              type="button"
              className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(place);
              }}
            >
              <span className="font-semibold">{previewPlaceLabel(place)}</span>
              <span className="text-xs text-muted-foreground">
                Vendero city #{place.id}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function requestJson(path: string, options: RequestInit = {}) {
  const tokenEntry = document.cookie
    .split("; ")
    .find((part) => part.startsWith("vendero_admin_access_token="));
  const token = tokenEntry?.split("=")[1] ?? null;
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  headers.set("authorization", token ? `Bearer ${token}` : "");

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload?.message ?? payload?.error?.message ?? "Request failed",
    );
  }

  return response.json().catch(() => ({}));
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusVariant(status: string | null) {
  if (status === "accepted" || status === "completed") return "success";
  if (status === "cancelled" || status === "expired") return "danger";
  if (status === "shared") return "warning";
  return "default";
}

function conflictVariant(conflictCount: number) {
  return conflictCount > 0 ? "danger" : "success";
}

function tripOriginLabel(origin: string | null) {
  return origin === "vendero_trip" ? "Vendero Trip" : "Vendor Trip";
}

function vendorLabel(vendor: VendorSummary) {
  if (!vendor) return "No vendor";
  return vendor.businessName ?? vendor.ownerName ?? `Vendor #${vendor.id}`;
}

export function TripOperationsPanel({
  initialData,
}: {
  initialData: TripOperationsData;
}) {
  const [query, setQuery] = useState(initialData?.filters.q ?? "");
  const [status, setStatus] = useState(initialData?.filters.status ?? "all");
  const [trips, setTrips] = useState<TripSummary[]>(initialData?.trips ?? []);
  const [analytics, setAnalytics] = useState(
    initialData?.analytics ?? {
      totalReturned: 0,
      byStatus: {},
      conflictTripCount: 0,
    },
  );
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TripDetail | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTrips, setPreviewTrips] = useState<PremiumPreviewTrip[]>([]);
  const [previewMeta, setPreviewMeta] = useState<PreviewMeta>(emptyPreviewMeta);
  const [previewSettings, setPreviewSettings] = useState<PreviewSettings>(
    defaultPreviewSettings,
  );
  const [previewForm, setPreviewForm] = useState({
    title: "",
    tripType: "oneway",
    pickupAddress: "",
    dropAddress: "",
    distanceKm: "",
    cabResourceType: "category",
    cabResourceId: "",
    previewVendorId: "",
    fareQuality: "good_rate",
    priority: "0",
  });
  const [previewVendorForm, setPreviewVendorForm] = useState({
    displayName: "",
    businessName: "",
    phone: "",
    avatarUrl: "",
    priority: "0",
  });
  const [selectedPreviewPlaces, setSelectedPreviewPlaces] = useState<{
    pickup: PreviewPlace | null;
    drop: PreviewPlace | null;
  }>({ pickup: null, drop: null });
  const [previewPlaceResults, setPreviewPlaceResults] = useState<{
    pickup: PreviewPlace[];
    drop: PreviewPlace[];
  }>({ pickup: [], drop: [] });
  const [placeSearchLoading, setPlaceSearchLoading] = useState({
    pickup: false,
    drop: false,
  });
  const [calculatingPreviewDistance, setCalculatingPreviewDistance] =
    useState(false);
  const [previewDistanceMessage, setPreviewDistanceMessage] = useState<
    string | null
  >(null);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [savingPreview, setSavingPreview] = useState(false);
  const [savingPreviewVendor, setSavingPreviewVendor] = useState(false);
  const [savingPreviewSettings, setSavingPreviewSettings] = useState(false);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [selectedTripId, trips],
  );
  const previewCabOptions =
    previewForm.cabResourceType === "model"
      ? previewMeta.cabModels
      : previewMeta.cabCategories;

  const searchPreviewPlaces = useCallback(
    async (field: "pickup" | "drop", query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setPreviewPlaceResults((current) => ({ ...current, [field]: [] }));
        return;
      }

      setPlaceSearchLoading((current) => ({ ...current, [field]: true }));
      try {
        const params = new URLSearchParams({
          q: trimmed,
          type: "city",
          includeAirports: "false",
        });
        const payload = await requestJson(
          `/api/v1/places?${params.toString()}`,
        );
        const rows = unwrapPayload(payload);
        setPreviewPlaceResults((current) => ({
          ...current,
          [field]: Array.isArray(rows) ? rows : [],
        }));
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to search Vendero places",
        );
        setPreviewPlaceResults((current) => ({ ...current, [field]: [] }));
      } finally {
        setPlaceSearchLoading((current) => ({ ...current, [field]: false }));
      }
    },
    [],
  );

  const calculatePreviewDistance = useCallback(
    async ({
      pickup,
      drop,
      tripType,
    }: {
      pickup: PreviewPlace;
      drop: PreviewPlace;
      tripType: string;
    }) => {
      setCalculatingPreviewDistance(true);
      setPreviewDistanceMessage("Calculating distance from Vendero places...");

      try {
        const payload = await requestJson("/api/v1/route/quote", {
          method: "POST",
          body: JSON.stringify({
            tripType,
            pickupPlaceId: pickup.id,
            dropPlaceId: drop.id,
          }),
        });
        const data = unwrapPayload(payload);
        const distanceValue =
          data?.fare?.distanceKm ??
          data?.distance?.distanceKm ??
          data?.routeCalculation?.distanceKm;
        const distanceKm = Number(distanceValue);

        if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
          throw new Error("Unable to calculate distance for selected cities.");
        }

        setPreviewForm((current) => ({
          ...current,
          distanceKm: distanceKm.toFixed(2),
        }));
        setPreviewDistanceMessage(
          `Distance auto-calculated: ${distanceKm.toFixed(2)} km`,
        );
      } catch (requestError) {
        setPreviewForm((current) => ({ ...current, distanceKm: "" }));
        setPreviewDistanceMessage(
          requestError instanceof Error
            ? requestError.message
            : "Unable to calculate distance for selected cities.",
        );
      } finally {
        setCalculatingPreviewDistance(false);
      }
    },
    [],
  );

  useEffect(() => {
    const pickup = selectedPreviewPlaces.pickup;
    const drop = selectedPreviewPlaces.drop;
    if (!pickup || !drop) {
      setPreviewForm((current) => ({ ...current, distanceKm: "" }));
      setPreviewDistanceMessage(null);
      return;
    }

    void calculatePreviewDistance({
      pickup,
      drop,
      tripType: previewForm.tripType,
    });
  }, [
    calculatePreviewDistance,
    previewForm.tripType,
    selectedPreviewPlaces.drop,
    selectedPreviewPlaces.pickup,
  ]);

  const loadPreviewTrips = useCallback(async () => {
    setLoadingPreviews(true);

    try {
      const payload = await requestJson("/api/v1/admin/trips/premium-previews");
      const data = unwrapPayload(payload);
      setPreviewTrips(data.previews ?? []);
      setPreviewMeta(data.meta ?? emptyPreviewMeta);
      setPreviewSettings(data.settings ?? defaultPreviewSettings);
      const firstCategory = data.meta?.cabCategories?.[0];
      const firstPreviewVendor = data.meta?.previewVendors?.[0];
      setPreviewForm((current) => ({
        ...current,
        cabResourceId: current.cabResourceId || String(firstCategory?.id ?? ""),
        previewVendorId:
          current.previewVendorId || String(firstPreviewVendor?.id ?? ""),
      }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load preview trips",
      );
    } finally {
      setLoadingPreviews(false);
    }
  }, []);

  useEffect(() => {
    void loadPreviewTrips();
  }, [loadPreviewTrips]);

  async function createPreviewVendor() {
    setSavingPreviewVendor(true);
    setError(null);

    try {
      const payload = await requestJson(
        "/api/v1/admin/trips/premium-preview-vendors",
        {
          method: "POST",
          body: JSON.stringify({
            displayName: previewVendorForm.displayName.trim(),
            businessName: previewVendorForm.businessName.trim(),
            phone: previewVendorForm.phone.trim() || undefined,
            avatarUrl: previewVendorForm.avatarUrl.trim() || undefined,
            priority: Number(previewVendorForm.priority),
            isVerified: true,
          }),
        },
      );
      const created = unwrapPayload(payload) as PremiumPreviewVendor;
      setPreviewMeta((current) => ({
        ...current,
        previewVendors: [created, ...current.previewVendors],
      }));
      setPreviewForm((current) => ({
        ...current,
        previewVendorId: String(created.id),
      }));
      setPreviewVendorForm({
        displayName: "",
        businessName: "",
        phone: "",
        avatarUrl: "",
        priority: "0",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create preview vendor",
      );
    } finally {
      setSavingPreviewVendor(false);
    }
  }

  async function createPreviewTrip() {
    setSavingPreview(true);
    setError(null);

    try {
      const payload = await requestJson(
        "/api/v1/admin/trips/premium-previews",
        {
          method: "POST",
          body: JSON.stringify({
            title: previewForm.title.trim() || undefined,
            tripType: previewForm.tripType,
            pickupPlaceId: selectedPreviewPlaces.pickup?.id,
            dropPlaceId: selectedPreviewPlaces.drop?.id,
            pickupAddress: previewForm.pickupAddress.trim(),
            dropAddress: previewForm.dropAddress.trim(),
            cabResourceType: previewForm.cabResourceType,
            cabResourceId: Number(previewForm.cabResourceId),
            previewVendorId: previewForm.previewVendorId
              ? Number(previewForm.previewVendorId)
              : undefined,
            fareQuality: previewForm.fareQuality,
            priority: Number(previewForm.priority),
          }),
        },
      );
      const created = unwrapPayload(payload) as PremiumPreviewTrip;
      setPreviewTrips((current) => [created, ...current]);
      setPreviewForm((current) => ({
        ...current,
        title: "",
        pickupAddress: "",
        dropAddress: "",
        distanceKm: "",
      }));
      setSelectedPreviewPlaces({ pickup: null, drop: null });
      setPreviewPlaceResults({ pickup: [], drop: [] });
      setPreviewDistanceMessage(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create preview trip",
      );
    } finally {
      setSavingPreview(false);
    }
  }

  async function updatePreviewSettings(next: Partial<PreviewSettings>) {
    setSavingPreviewSettings(true);
    setError(null);

    try {
      const payload = await requestJson(
        "/api/v1/admin/trips/premium-previews/settings",
        {
          method: "POST",
          body: JSON.stringify({
            ...previewSettings,
            ...next,
          }),
        },
      );
      setPreviewSettings(unwrapPayload(payload) as PreviewSettings);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update preview setting",
      );
    } finally {
      setSavingPreviewSettings(false);
    }
  }

  async function updatePreviewStatus(
    preview: PremiumPreviewTrip,
    nextStatus: "active" | "paused",
  ) {
    setLoadingPreviews(true);
    setError(null);

    try {
      const payload = await requestJson(
        `/api/v1/admin/trips/premium-previews/${preview.id}/status`,
        {
          method: "POST",
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const updated = unwrapPayload(payload) as PremiumPreviewTrip;
      setPreviewTrips((current) =>
        current.map((item) => (item.id === preview.id ? updated : item)),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update preview trip",
      );
    } finally {
      setLoadingPreviews(false);
    }
  }

  function handlePreviewPlaceInput(field: "pickup" | "drop", value: string) {
    setPreviewForm((current) => ({
      ...current,
      [field === "pickup" ? "pickupAddress" : "dropAddress"]: value,
    }));
    setSelectedPreviewPlaces((current) => ({
      ...current,
      [field]: null,
    }));
    setPreviewDistanceMessage(null);
    void searchPreviewPlaces(field, value);
  }

  function selectPreviewPlace(field: "pickup" | "drop", place: PreviewPlace) {
    const label = previewPlaceLabel(place);
    setSelectedPreviewPlaces((current) => ({
      ...current,
      [field]: place,
    }));
    setPreviewForm((current) => ({
      ...current,
      [field === "pickup" ? "pickupAddress" : "dropAddress"]: label,
    }));
    setPreviewPlaceResults((current) => ({
      ...current,
      [field]: [],
    }));
  }

  async function searchTrips() {
    setLoadingList(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "25" });
      if (query.trim()) params.set("q", query.trim());
      if (status && status !== "all") params.set("status", status);
      const payload = await requestJson(
        `/api/v1/admin/trips?${params.toString()}`,
      );
      const data = unwrapPayload(payload);
      setTrips(data.trips ?? []);
      setAnalytics(data.analytics ?? analytics);
      setSelectedTripId(null);
      setDetail(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to search trips",
      );
    } finally {
      setLoadingList(false);
    }
  }

  async function inspectTrip(id: number) {
    setSelectedTripId(id);
    setLoadingDetail(true);
    setError(null);

    try {
      const payload = await requestJson(`/api/v1/admin/trips/${id}`);
      setDetail(unwrapPayload(payload) as TripDetail);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to inspect trip",
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
                Search
              </CardDescription>
              <CardTitle className="mt-2 text-2xl">Trip directory</CardTitle>
            </div>
            <Button
              variant="outline"
              onClick={searchTrips}
              disabled={loadingList}
            >
              <RefreshCw className="h-4 w-4" />
              {loadingList ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void searchTrips();
                }}
                placeholder="Search trip #, city, owner, accepted vendor"
              />
            </div>
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All statuses" : option}
                </option>
              ))}
            </select>
            <Button onClick={searchTrips} disabled={loadingList}>
              Search
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Returned {analytics.totalReturned}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Accepted {analytics.byStatus.accepted ?? 0}
            </Badge>
            <Badge
              variant={analytics.conflictTripCount ? "danger" : "success"}
              className="rounded-full px-3 py-1"
            >
              Conflicts {analytics.conflictTripCount}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {error ? (
            <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          {trips.map((trip) => (
            <div
              key={trip.id}
              className="rounded-xl border border-border/70 bg-background/30 p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">Trip #{trip.id}</p>
                    <Badge variant={statusVariant(trip.status)}>
                      {trip.status}
                    </Badge>
                    {trip.isPremiumOnly ? (
                      <Badge variant="warning">Premium only</Badge>
                    ) : null}
                    <Badge variant="outline">
                      {tripOriginLabel(trip.tripOrigin)}
                    </Badge>
                    <Badge variant={conflictVariant(trip.conflictCount)}>
                      {trip.conflictCount
                        ? `${trip.conflictCount} conflict`
                        : "No conflict"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{trip.route}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {vendorLabel(trip.ownerVendor)} to{" "}
                    {vendorLabel(trip.acceptedVendor)} • Rs{" "}
                    {trip.rateTotal ?? "-"} • {trip.distanceKm ?? "-"} km
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Pickup {formatDate(trip.pickupDatetime)} • Recipients{" "}
                    {trip.recipientCount} • Requests {trip.requestCount}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={selectedTripId === trip.id ? "secondary" : "outline"}
                  onClick={() => inspectTrip(trip.id)}
                  disabled={loadingDetail && selectedTripId === trip.id}
                >
                  {loadingDetail && selectedTripId === trip.id
                    ? "Loading..."
                    : "Inspect"}
                </Button>
              </div>
            </div>
          ))}

          {!trips.length ? (
            <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
              No trips found for this search.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>Premium preview trips</CardTitle>
                </div>
                <CardDescription>
                  Transparent sample opportunities shown only to vendors without
                  active subscription access.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <label className="flex cursor-pointer items-center gap-3 rounded-full border border-border bg-background/50 px-4 py-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={previewSettings.showPreviews}
                    disabled={savingPreviewSettings}
                    onChange={(event) =>
                      void updatePreviewSettings({
                        showPreviews: event.target.checked,
                      })
                    }
                  />
                  Show in unsubscribed feed
                </label>
                <Button
                  variant="outline"
                  onClick={loadPreviewTrips}
                  disabled={loadingPreviews}
                >
                  <RefreshCw className="h-4 w-4" />
                  {loadingPreviews ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Create preview vendor</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={previewVendorForm.displayName}
                    onChange={(event) =>
                      setPreviewVendorForm((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder="Owner name, e.g. Rakesh Patel"
                  />
                  <Input
                    value={previewVendorForm.businessName}
                    onChange={(event) =>
                      setPreviewVendorForm((current) => ({
                        ...current,
                        businessName: event.target.value,
                      }))
                    }
                    placeholder="Business name, e.g. Shree Ganesh Travels"
                  />
                  <Input
                    value={previewVendorForm.phone}
                    onChange={(event) =>
                      setPreviewVendorForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="Phone optional"
                  />
                  <Input
                    value={previewVendorForm.avatarUrl}
                    onChange={(event) =>
                      setPreviewVendorForm((current) => ({
                        ...current,
                        avatarUrl: event.target.value,
                      }))
                    }
                    placeholder="Avatar URL optional"
                  />
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Input
                    className="sm:w-32"
                    type="number"
                    min="0"
                    value={previewVendorForm.priority}
                    onChange={(event) =>
                      setPreviewVendorForm((current) => ({
                        ...current,
                        priority: event.target.value,
                      }))
                    }
                    placeholder="Priority"
                  />
                  <Button
                    variant="outline"
                    onClick={createPreviewVendor}
                    disabled={
                      savingPreviewVendor ||
                      !previewVendorForm.displayName.trim() ||
                      !previewVendorForm.businessName.trim()
                    }
                  >
                    <UserCheck className="h-4 w-4" />
                    {savingPreviewVendor ? "Creating..." : "Create vendor"}
                  </Button>
                </div>
              </div>

              <Input
                value={previewForm.title}
                onChange={(event) =>
                  setPreviewForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Optional label, e.g. Airport premium lead"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={previewForm.previewVendorId}
                  onChange={(event) =>
                    setPreviewForm((current) => ({
                      ...current,
                      previewVendorId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select preview vendor</option>
                  {previewMeta.previewVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.displayName} • {vendor.businessName}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={previewForm.tripType}
                  onChange={(event) =>
                    setPreviewForm((current) => ({
                      ...current,
                      tripType: event.target.value,
                    }))
                  }
                >
                  <option value="oneway">One way</option>
                  <option value="round_trip">Round trip</option>
                </select>
                <Input
                  type="number"
                  min="0"
                  value={previewForm.priority}
                  onChange={(event) =>
                    setPreviewForm((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                  placeholder="Priority"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <PreviewPlaceSearchInput
                  label="Pickup city"
                  value={previewForm.pickupAddress}
                  placeholder="Search pickup city"
                  selectedPlace={selectedPreviewPlaces.pickup}
                  results={previewPlaceResults.pickup}
                  loading={placeSearchLoading.pickup}
                  onChange={(value) => handlePreviewPlaceInput("pickup", value)}
                  onSelect={(place) => selectPreviewPlace("pickup", place)}
                />
                <PreviewPlaceSearchInput
                  label="Drop city"
                  value={previewForm.dropAddress}
                  placeholder="Search drop city"
                  selectedPlace={selectedPreviewPlaces.drop}
                  results={previewPlaceResults.drop}
                  loading={placeSearchLoading.drop}
                  onChange={(value) => handlePreviewPlaceInput("drop", value)}
                  onSelect={(place) => selectPreviewPlace("drop", place)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Distance
                  </label>
                  <Input
                    readOnly
                    value={
                      calculatingPreviewDistance
                        ? "Calculating..."
                        : previewForm.distanceKm
                          ? `${previewForm.distanceKm} km`
                          : ""
                    }
                    placeholder="Select pickup and drop city"
                  />
                  {previewDistanceMessage ? (
                    <p className="text-xs text-muted-foreground">
                      {previewDistanceMessage}
                    </p>
                  ) : null}
                </div>
                <select
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={previewForm.fareQuality}
                  onChange={(event) =>
                    setPreviewForm((current) => ({
                      ...current,
                      fareQuality: event.target.value,
                    }))
                  }
                >
                  <option value="good_rate">Good fare</option>
                  <option value="market_rate">Medium fare</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
                <select
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={previewForm.cabResourceType}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    const nextOptions =
                      nextType === "model"
                        ? previewMeta.cabModels
                        : previewMeta.cabCategories;
                    setPreviewForm((current) => ({
                      ...current,
                      cabResourceType: nextType,
                      cabResourceId: String(nextOptions[0]?.id ?? ""),
                    }));
                  }}
                >
                  <option value="category">Category</option>
                  <option value="model">Model</option>
                </select>
                <select
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={previewForm.cabResourceId}
                  onChange={(event) =>
                    setPreviewForm((current) => ({
                      ...current,
                      cabResourceId: event.target.value,
                    }))
                  }
                >
                  {previewCabOptions.map((cab) => (
                    <option key={cab.id} value={cab.id}>
                      {cab.name} • Rs{" "}
                      {previewForm.tripType === "round_trip"
                        ? cab.roundTripPerKmRate
                        : cab.onewayPerKmRate}
                      /km
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={createPreviewTrip}
                disabled={
                  savingPreview ||
                  calculatingPreviewDistance ||
                  !selectedPreviewPlaces.pickup ||
                  !selectedPreviewPlaces.drop ||
                  !Number(previewForm.distanceKm) ||
                  !previewForm.previewVendorId ||
                  !previewForm.cabResourceId
                }
              >
                <Sparkles className="h-4 w-4" />
                {savingPreview ? "Creating..." : "Create preview trip"}
              </Button>
            </div>

            <div className="space-y-3">
              {previewTrips.map((preview) => {
                const nextStatus =
                  preview.status === "active" ? "paused" : "active";
                const cabLabel =
                  preview.cabModelName ?? preview.cabCategoryName ?? "Cab";

                return (
                  <div
                    key={preview.id}
                    className="rounded-xl border border-border/70 bg-background/30 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">
                            {preview.title ?? preview.route}
                          </p>
                          <Badge
                            variant={
                              preview.status === "active"
                                ? "success"
                                : "warning"
                            }
                          >
                            {preview.status}
                          </Badge>
                          <Badge variant="outline">
                            {preview.badgeLabel ?? "Good Rate"}
                          </Badge>
                          <Badge variant="outline">
                            {preview.fareQuality === "market_rate"
                              ? "Medium fare"
                              : "Good fare"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-foreground">
                          {preview.route}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {cabLabel} • Rs {preview.rateTotal ?? "-"} •{" "}
                          {preview.distanceKm ?? "-"} km • Rs{" "}
                          {preview.perKmRate ?? "-"}/km
                        </p>
                        {preview.previewVendor ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Preview vendor:{" "}
                            <span className="font-medium text-foreground">
                              {preview.previewVendor.displayName}
                            </span>{" "}
                            • {preview.previewVendor.businessName}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Pickup {formatDate(preview.pickupDatetime)} • Priority{" "}
                          {preview.priority}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updatePreviewStatus(preview, nextStatus)}
                        disabled={loadingPreviews}
                      >
                        {preview.status === "active" ? (
                          <PauseCircle className="h-4 w-4" />
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )}
                        {preview.status === "active" ? "Pause" : "Resume"}
                      </Button>
                    </div>
                  </div>
                );
              })}

              {!previewTrips.length ? (
                <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                  No premium preview trips created yet.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardDescription className="uppercase tracking-[0.2em] text-muted-foreground">
              Accepted Vendor
            </CardDescription>
            <CardTitle className="mt-2 text-2xl">
              {selectedTrip ? `Trip #${selectedTrip.id}` : "Select a trip"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail?.acceptedVendor ? (
              <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {vendorLabel(detail.acceptedVendor)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detail.acceptedVendor.ownerName ?? "Owner not set"} •{" "}
                      {detail.acceptedVendor.phone ?? "No phone"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Accepted {formatDate(detail.acceptedVendor.acceptedAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      detail.acceptedVendor.isVerified ? "success" : "warning"
                    }
                  >
                    {detail.acceptedVendor.verificationStatus ?? "pending"}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/70 bg-card/50 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Driver
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {detail.acceptedVendor.assignedDriver?.fullName ??
                        "Not assigned"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {detail.acceptedVendor.assignedDriver?.phone ?? ""}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card/50 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Cab
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {detail.acceptedVendor.assignedCab?.cabNumber ??
                        "Not assigned"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {detail.acceptedVendor.assignedCab?.verificationStatus ??
                        ""}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                {loadingDetail
                  ? "Loading accepted vendor..."
                  : "No accepted vendor is attached yet."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              <CardTitle>Sharing conflict audit</CardTitle>
            </div>
            <CardDescription>
              Race conditions and mismatched recipient/request state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail?.conflicts.map((conflict) => (
              <div
                key={conflict.key}
                className="rounded-xl border border-border/70 bg-background/30 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={conflict.badgeVariant ?? "default"}>
                    {conflict.severity}
                  </Badge>
                  <p className="font-medium">{conflict.title}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {conflict.detail}
                </p>
              </div>
            ))}
            {detail && !detail.conflicts.length ? (
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                No sharing conflicts detected for this trip.
              </p>
            ) : null}
            {!detail && !loadingDetail ? (
              <p className="rounded-xl border border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                Inspect a trip to run conflict checks.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              <CardTitle>Trip timeline</CardTitle>
            </div>
            <CardDescription>
              Lifecycle events from trip state, requests, public links, and
              audit logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail?.timeline.map((event) => (
              <div key={event.key} className="grid grid-cols-[24px_1fr] gap-3">
                <span className="mt-1 h-3 w-3 rounded-full bg-primary" />
                <div className="rounded-xl border border-border/70 bg-background/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{event.label}</p>
                    <Badge variant="outline">
                      {formatDate(event.occurredAt)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[event.actor, event.detail].filter(Boolean).join(" • ") ||
                      event.status}
                  </p>
                </div>
              </div>
            ))}
            {detail && !detail.timeline.length ? (
              <p className="text-sm text-muted-foreground">
                No timeline events available.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <CardTitle>Requests and recipients</CardTitle>
            </div>
            <CardDescription>
              Request state used to diagnose sharing outcomes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail?.requests.map((request) => (
              <div
                key={`request-${request.id}`}
                className="rounded-xl border border-border/70 bg-background/30 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(String(request.status))}>
                    {String(request.status)}
                  </Badge>
                  <p className="font-medium">
                    {request.businessName ??
                      `Vendor #${request.requesterVendorProfileId}`}
                  </p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Requested {formatDate(request.requestedAt)} • Responded{" "}
                  {formatDate(request.respondedAt)}
                </p>
              </div>
            ))}
            {detail && !detail.requests.length ? (
              <p className="text-sm text-muted-foreground">
                No requests recorded for this trip.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
