"use client";

import { HtmlCodePreview } from "./html-code-preview";
import type { SiteTheme, SiteThemeComponent } from "./site-themes-panel";
import { isFixedComponent } from "@/lib/site-fixed-components";

type PreviewProps = {
  componentKey: string;
  component?: SiteThemeComponent | null;
  theme?: SiteTheme | null;
  index?: number;
};

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textFrom(
  source: Record<string, unknown>,
  keys: string[],
  fallback: string,
) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function listFrom(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return Array.isArray(value) ? value : [];
}

function previewKind(
  componentKey: string,
  component?: SiteThemeComponent | null,
) {
  const key =
    `${componentKey} ${component?.componentType ?? ""} ${component?.rendererKey ?? ""}`.toLowerCase();
  if (key.includes("header") || key.includes("nav")) return "header";
  if (
    key.includes("search") ||
    key.includes("hero") ||
    key.includes("booking")
  ) {
    return "search";
  }
  if (key.includes("cab") || key.includes("vehicle") || key.includes("fleet")) {
    return "cab";
  }
  if (
    key.includes("route") ||
    key.includes("package") ||
    key.includes("fare")
  ) {
    return "route";
  }
  if (key.includes("review") || key.includes("testimonial")) return "reviews";
  if (key.includes("seo") || key.includes("faq")) return "seo";
  if (key.includes("footer") || key.includes("contact")) return "footer";
  return "content";
}

function themeColors(theme?: SiteTheme | null) {
  const defaultSettings = recordFrom(theme?.defaultSettings);
  const colorSchema = recordFrom(defaultSettings.colorSchema);
  return {
    pageBg: textFrom(colorSchema, ["pageBg"], "#F8FAFC"),
    font: textFrom(colorSchema, ["font"], "#111827"),
    primary: textFrom(colorSchema, ["primaryActionBg", "primary"], "#2563EB"),
    primaryText: textFrom(
      colorSchema,
      ["primaryActionFont", "primaryText"],
      "#FFFFFF",
    ),
  };
}

function componentProps(component?: SiteThemeComponent | null) {
  return recordFrom(component?.defaultProps);
}

function carItems(props: Record<string, unknown>) {
  const items = listFrom(props, "items");
  if (items.length) return items;
  return [
    { title: "Sedan cab", subtitle: "4 seats, AC", price: "From Rs. 12/km" },
    { title: "SUV cab", subtitle: "6 seats, luggage", price: "From Rs. 17/km" },
    { title: "Tempo traveller", subtitle: "Group trips", price: "Custom fare" },
  ];
}

function routeItems(props: Record<string, unknown>) {
  const items = listFrom(props, "routes");
  if (items.length) return items;
  return [
    {
      title: "Ahmedabad to Vadodara",
      subtitle: "One way cab",
      price: "Rs. 2,499",
    },
    {
      title: "Ahmedabad Airport transfer",
      subtitle: "Pickup and drop",
      price: "Rs. 1,299",
    },
    {
      title: "Vadodara to Surat",
      subtitle: "Outstation route",
      price: "Rs. 4,499",
    },
    {
      title: "Hourly rental",
      subtitle: "Local city package",
      price: "Rs. 1,999",
    },
  ];
}

function choiceFrom<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function searchPreviewField(label: string, placeholder: string) {
  return (
    <label className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="text-[10px] font-semibold uppercase text-slate-500">
        {label}
      </span>
      <span className="mt-1 block truncate text-sm font-semibold text-slate-950">
        {placeholder}
      </span>
    </label>
  );
}

export function SiteComponentPreview({
  componentKey,
  component,
  theme,
  index = 0,
}: PreviewProps) {
  const kind = previewKind(componentKey, component);
  const props = componentProps(component);
  const colors = themeColors(theme);
  const title = textFrom(
    props,
    ["title", "heading", "name"],
    component?.name ?? componentKey,
  );
  const subtitle = textFrom(
    props,
    ["subtitle", "description", "body"],
    "Fast cab booking, trusted routes, and business-ready website content.",
  );
  const actionLabel = textFrom(
    props,
    ["actionLabel", "buttonLabel", "cta"],
    "Book now",
  );
  const imageUrl = textFrom(
    props,
    ["imageUrl", "bannerImageUrl", "coverImageUrl"],
    "",
  );
  const hasCustomCode =
    component?.htmlCode?.trim() ||
    component?.cssCode?.trim() ||
    component?.jsCode?.trim();

  if (hasCustomCode) {
    return (
      <HtmlCodePreview
        title={component?.name ?? componentKey}
        htmlCode={component?.htmlCode ?? ""}
        cssCode={component?.cssCode ?? ""}
        jsCode={component?.jsCode ?? ""}
        minHeight={260}
      />
    );
  }

  if (kind === "header") {
    const navItems = listFrom(props, "navItems").length
      ? listFrom(props, "navItems")
      : ["Home", "Routes", "Cabs", "Contact"];
    return (
      <section className="rounded-t-xl border border-border bg-white p-4 text-slate-950">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-lg text-sm font-black"
              style={{ background: colors.primary, color: colors.primaryText }}
            >
              V
            </div>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-xs text-slate-500">Cab booking website</p>
            </div>
          </div>
          <div className="hidden items-center gap-4 text-xs font-medium text-slate-600 md:flex">
            {navItems.slice(0, 4).map((item) => (
              <span key={String(item)}>{String(item)}</span>
            ))}
          </div>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-xs font-semibold"
            style={{ background: colors.primary, color: colors.primaryText }}
          >
            {actionLabel}
          </button>
        </div>
      </section>
    );
  }

  if (kind === "search") {
    const fixed = isFixedComponent(component);
    const searchMode = choiceFrom(props.searchMode, ["single", "route"] as const, fixed ? "route" : "route");
    const dataSource = textFrom(props, ["dataSource"], fixed ? "places" : "routes");
    const placeType = textFrom(props, ["placeType"], "city");
    const label = textFrom(props, ["label"], "Search place");
    const placeholder = textFrom(props, ["placeholder"], "Search city, airport, or place");
    const pickupLabel = textFrom(props, ["pickupLabel"], "Pickup");
    const pickupPlaceholder = textFrom(props, ["pickupPlaceholder"], "Search pickup city");
    const dropLabel = textFrom(props, ["dropLabel"], "Drop");
    const dropPlaceholder = textFrom(props, ["dropPlaceholder"], "Search drop city");

    return (
      <section
        className="border-x border-border bg-slate-950 p-5 text-white"
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase text-white/75">
                {component?.rendererKey ?? "booking-search"}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase text-white/75">
                {dataSource}
              </span>
              {fixed ? (
                <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-100">
                  fixed
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 max-w-xl text-2xl font-bold leading-tight">
              {title}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-white/80">{subtitle}</p>
          </div>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-36 w-full rounded-xl object-cover"
            />
          ) : null}
        </div>
        <div className="mt-5 rounded-xl bg-white p-3 text-slate-950 shadow-sm">
          <div
            className={
              searchMode === "route"
                ? "grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                : "grid gap-2 md:grid-cols-[1fr_auto]"
            }
          >
            {searchMode === "route" ? (
              <>
                {searchPreviewField(pickupLabel, pickupPlaceholder)}
                {searchPreviewField(dropLabel, dropPlaceholder)}
              </>
            ) : (
              searchPreviewField(label, placeholder)
            )}
            <div className="grid rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                Source
              </span>
              <span className="mt-1 text-sm font-semibold capitalize">
                {dataSource} / {placeType}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="mt-3 h-10 w-full rounded-lg text-sm font-semibold"
            style={{ background: colors.primary, color: colors.primaryText }}
          >
            {actionLabel}
          </button>
        </div>
      </section>
    );
  }

  if (kind === "cab") {
    return (
      <section className="border-x border-border bg-white p-5 text-slate-950">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Fleet
            </p>
            <h2 className="mt-1 text-xl font-bold">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: `${colors.primary}18`, color: colors.primary }}
          >
            Live fares
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {carItems(props)
            .slice(0, 3)
            .map((item, itemIndex) => {
              const record = recordFrom(item);
              return (
                <article
                  key={itemIndex}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <div className="grid h-16 place-items-center rounded-lg bg-slate-100 text-2xl">
                    {itemIndex === 1 ? "SUV" : itemIndex === 2 ? "TT" : "CAB"}
                  </div>
                  <h3 className="mt-3 font-semibold">
                    {textFrom(record, ["title", "name"], "Cab")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {textFrom(record, ["subtitle", "description"], "AC cab")}
                  </p>
                  <p
                    className="mt-3 text-sm font-bold"
                    style={{ color: colors.primary }}
                  >
                    {textFrom(record, ["price", "fare"], "Best fare")}
                  </p>
                </article>
              );
            })}
        </div>
      </section>
    );
  }

  if (kind === "route") {
    return (
      <section className="border-x border-border bg-slate-50 p-5 text-slate-950">
        <p className="text-xs font-semibold uppercase text-slate-500">Routes</p>
        <h2 className="mt-1 text-xl font-bold">{title}</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {routeItems(props)
            .slice(0, 4)
            .map((item, itemIndex) => {
              const record = recordFrom(item);
              return (
                <article
                  key={itemIndex}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {textFrom(record, ["title", "name"], "Route")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {textFrom(
                        record,
                        ["subtitle", "description"],
                        "One way cab",
                      )}
                    </p>
                  </div>
                  <span
                    className="text-sm font-bold"
                    style={{ color: colors.primary }}
                  >
                    {textFrom(record, ["price", "fare"], "View")}
                  </span>
                </article>
              );
            })}
        </div>
      </section>
    );
  }

  if (kind === "reviews") {
    return (
      <section className="border-x border-border bg-white p-5 text-slate-950">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Reviews
        </p>
        <h2 className="mt-1 text-xl font-bold">{title}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            "Clean cab and on-time driver.",
            "Best outstation support.",
            "Easy booking experience.",
          ].map((review, itemIndex) => (
            <article
              key={review}
              className="rounded-xl border border-slate-200 p-3"
            >
              <p className="text-sm text-slate-600">{review}</p>
              <p className="mt-3 text-xs font-semibold text-slate-950">
                Customer {itemIndex + 1}
              </p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (kind === "seo") {
    return (
      <section className="border-x border-border bg-white p-5 text-slate-950">
        <p className="text-xs font-semibold uppercase text-slate-500">SEO</p>
        <h2 className="mt-1 text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-4 space-y-2">
          {[
            "Why book this cab route?",
            "What is included in the fare?",
            "Can I book airport pickup?",
          ].map((question) => (
            <div
              key={question}
              className="rounded-lg border border-slate-200 p-3"
            >
              <p className="text-sm font-semibold">{question}</p>
              <p className="mt-1 text-xs text-slate-500">
                Admin managed SEO content can answer this question on route
                pages.
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (kind === "footer") {
    return (
      <section className="rounded-b-xl border border-border bg-slate-950 p-5 text-white">
        <div className="grid gap-4 md:grid-cols-3">
          {[title, "Contact", "Popular links"].map((item) => (
            <div key={item}>
              <p className="text-xs font-semibold uppercase text-white/60">
                {item}
              </p>
              <p className="mt-3 text-sm text-white/80">
                {item === "Contact"
                  ? "+91 98765 43210"
                  : "Cab booking, airport transfer, outstation trips"}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="border-x border-border bg-white p-5 text-slate-950">
      <p className="text-xs font-semibold uppercase text-slate-500">
        Component {index + 1}
      </p>
      <div className="mt-2 grid gap-4 md:grid-cols-[1fr_180px]">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <button
            type="button"
            className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold"
            style={{ background: colors.primary, color: colors.primaryText }}
          >
            {actionLabel}
          </button>
        </div>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-32 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="grid h-32 place-items-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500">
            {componentKey}
          </div>
        )}
      </div>
    </section>
  );
}
