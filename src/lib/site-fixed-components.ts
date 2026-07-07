import type { SiteThemeComponent } from "@/app/(protected)/site-themes/site-themes-panel";

export type FixedSearchDataSource = "places" | "products" | "vendors" | "custom";
export type FixedSearchMode = "single" | "route";
export type FixedPlaceType = "city" | "airport";

export type FixedSiteComponent = Omit<SiteThemeComponent, "id" | "publicId"> & {
  id?: number;
  publicId?: string;
};

const searchSettingsSchema = {
  componentKind: "fixed",
  capability: "search",
  editableProps: [
    "title",
    "subtitle",
    "actionLabel",
    "searchMode",
    "dataSource",
    "placeType",
    "label",
    "placeholder",
    "pickupLabel",
    "pickupPlaceholder",
    "dropLabel",
    "dropPlaceholder",
    "minCharacters",
    "loadingMessage",
    "emptyMessage",
    "onSelectAction",
    "resultPathTemplate",
  ],
  dataSources: [
    {
      key: "places",
      label: "Places",
      endpoint: "/api/place",
      valueField: "id",
      titleField: "label",
      subtitleField: "state",
    },
    {
      key: "products",
      label: "Products",
      endpoint: "custom",
      valueField: "id",
      titleField: "name",
      subtitleField: "description",
    },
    {
      key: "vendors",
      label: "Vendors",
      endpoint: "custom",
      valueField: "id",
      titleField: "businessName",
      subtitleField: "city",
    },
  ],
  lifecycle: {
    build: "Create or update fixed component in local white-label app",
    test: "Verify in Theme Builder preview and white-label runtime",
    deploy: "Deploy app/API once, then reuse in any theme",
  },
};

export const fixedSiteComponents: FixedSiteComponent[] = [
  {
    componentKey: "site-header",
    name: "Site header",
    componentType: "navigation",
    rendererKey: "site-header",
    figmaFileKey: null,
    figmaNodeId: null,
    htmlCode: "",
    cssCode: "",
    jsCode: "",
    settingsSchema: {
      componentKind: "fixed",
      capability: "navigation",
      editableProps: [
        "title",
        "subtitle",
        "logoImageUrl",
        "logoText",
        "navigationLinks",
        "headerBackgroundColor",
        "headerPadding",
        "headerMargin",
        "headerWidth",
        "headerGap",
        "headerFlexDirection",
        "headerJustifyContent",
        "headerAlignItems",
        "headerLinkPlacement",
        "headerLinkColor",
        "headerLinkBackgroundColor",
        "headerLinkHoverColor",
        "headerLinkHoverBackgroundColor",
        "headerLinkActiveColor",
        "headerLinkActiveBackgroundColor",
        "headerLinkBorderRadius",
        "headerLinkMinWidth",
        "headerLinkHeight",
        "headerLinkPadding",
      ],
      lifecycle: {
        build: "Create header once in local white-label app",
        test: "Verify links and section anchors in Theme Builder preview",
        deploy: "Deploy app/API once, then reuse in any theme",
      },
    },
    defaultProps: {
      title: "Brand header",
      subtitle: "Cab booking website",
      logoImageUrl: "",
      logoText: "V",
      headerBackgroundColor: "",
      headerPadding: "12px 14px",
      headerMargin: "",
      headerWidth: "",
      headerGap: "14px",
      headerFlexDirection: "row",
      headerJustifyContent: "space-between",
      headerAlignItems: "center",
      headerLinkPlacement: "right",
      headerLinkColor: "",
      headerLinkBackgroundColor: "",
      headerLinkHoverColor: "",
      headerLinkHoverBackgroundColor: "",
      headerLinkActiveColor: "",
      headerLinkActiveBackgroundColor: "",
      headerLinkBorderRadius: "8px",
      headerLinkMinWidth: "",
      headerLinkHeight: "34px",
      headerLinkPadding: "10px 11px",
      navigationLinks: [
        { label: "Home", href: "/" },
        { label: "Cabs", href: "#cab-list" },
        { label: "Routes", href: "#popular-routes" },
        { label: "Contact", href: "#contact" },
      ],
    },
    assetSchema: {},
    status: "live",
    isActive: true,
    sortOrder: 10,
    metadata: {
      fixedComponent: true,
      fixedComponentVersion: 1,
      capability: "navigation",
      lifecycle: "local-test-deploy-reuse",
      createdFor: "theme_builder",
    },
  },
  {
    componentKey: "store-search",
    name: "Fixed Store Search",
    componentType: "search",
    rendererKey: "store-search",
    figmaFileKey: null,
    figmaNodeId: null,
    htmlCode: "",
    cssCode: "",
    jsCode: "",
    settingsSchema: searchSettingsSchema,
    defaultProps: {
      title: "Search your trip",
      subtitle: "Let visitors search pickup and drop places from the live place database.",
      actionLabel: "Continue",
      searchMode: "route" satisfies FixedSearchMode,
      dataSource: "places" satisfies FixedSearchDataSource,
      placeType: "city" satisfies FixedPlaceType,
      minCharacters: 2,
      debounceMs: 320,
      label: "Search place",
      placeholder: "Search city, airport, or place",
      pickupLabel: "Pickup",
      pickupPlaceholder: "Search pickup city",
      dropLabel: "Drop",
      dropPlaceholder: "Search drop city",
      loadingMessage: "Searching places...",
      emptyMessage: "No place found. Try a nearby city or another spelling.",
      onSelectAction: "hold_selection",
      resultPathTemplate: "/cab/{pickup}-to-{drop}",
      resultTitleField: "label",
      resultSubtitleField: "state",
      valueField: "id",
      analyticsSource: "fixed_store_search",
    },
    assetSchema: {},
    status: "live",
    isActive: true,
    sortOrder: 20,
    metadata: {
      fixedComponent: true,
      fixedComponentVersion: 1,
      capability: "search",
      lifecycle: "local-test-deploy-reuse",
      supportedDataSources: ["places", "products", "vendors", "custom"],
      createdFor: "theme_builder",
    },
  },
  {
    componentKey: "place-search",
    name: "Fixed Place Search",
    componentType: "search",
    rendererKey: "place-search",
    figmaFileKey: null,
    figmaNodeId: null,
    htmlCode: "",
    cssCode: "",
    jsCode: "",
    settingsSchema: {
      ...searchSettingsSchema,
      editableProps: [
        "title",
        "subtitle",
        "actionLabel",
        "dataSource",
        "placeType",
        "label",
        "placeholder",
        "minCharacters",
        "loadingMessage",
        "emptyMessage",
        "onSelectAction",
      ],
    },
    defaultProps: {
      title: "Search a place",
      subtitle: "Use the live place search API inside any theme section.",
      actionLabel: "Use selected place",
      searchMode: "single" satisfies FixedSearchMode,
      dataSource: "places" satisfies FixedSearchDataSource,
      placeType: "city" satisfies FixedPlaceType,
      minCharacters: 2,
      debounceMs: 320,
      label: "Place",
      placeholder: "Search city or airport",
      loadingMessage: "Searching places...",
      emptyMessage: "No place found. Try a nearby city or another spelling.",
      onSelectAction: "hold_selection",
      resultTitleField: "label",
      resultSubtitleField: "state",
      valueField: "id",
      analyticsSource: "fixed_place_search",
    },
    assetSchema: {},
    status: "live",
    isActive: true,
    sortOrder: 21,
    metadata: {
      fixedComponent: true,
      fixedComponentVersion: 1,
      capability: "search",
      lifecycle: "local-test-deploy-reuse",
      supportedDataSources: ["places"],
      createdFor: "theme_builder",
    },
  },
];

function mergeRecord(base: unknown, override: unknown) {
  const safeBase = base && typeof base === "object" && !Array.isArray(base) ? base : {};
  const safeOverride = override && typeof override === "object" && !Array.isArray(override) ? override : {};
  return {
    ...(safeBase as Record<string, unknown>),
    ...(safeOverride as Record<string, unknown>),
  };
}

export function fixedComponentForKey(componentKey: string) {
  return fixedSiteComponents.find((component) => component.componentKey === componentKey) ?? null;
}

export function isFixedComponent(component?: Pick<SiteThemeComponent, "metadata" | "componentKey"> | null) {
  if (!component) return false;
  return Boolean(component.metadata?.fixedComponent || fixedComponentForKey(component.componentKey));
}

export function siteThemeComponentFromFixed(component: FixedSiteComponent, index: number): SiteThemeComponent {
  return {
    id: component.id ?? -(index + 1),
    publicId: component.publicId ?? `fixed_${component.componentKey}`,
    ...component,
  };
}

export function mergeFixedSiteComponents(components: SiteThemeComponent[]) {
  const byKey = new Map(components.map((component) => [component.componentKey, component]));

  fixedSiteComponents.forEach((fixed, index) => {
    const existing = byKey.get(fixed.componentKey);
    if (!existing) {
      byKey.set(fixed.componentKey, siteThemeComponentFromFixed(fixed, index));
      return;
    }

    byKey.set(fixed.componentKey, {
      ...siteThemeComponentFromFixed(fixed, index),
      ...existing,
      settingsSchema: mergeRecord(fixed.settingsSchema, existing.settingsSchema),
      defaultProps: mergeRecord(fixed.defaultProps, existing.defaultProps),
      assetSchema: mergeRecord(fixed.assetSchema, existing.assetSchema),
      metadata: mergeRecord(fixed.metadata, existing.metadata),
    });
  });

  return Array.from(byKey.values());
}
