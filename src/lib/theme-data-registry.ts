export type ThemeDataFieldType = "text" | "number" | "image" | "url" | "boolean" | "json";

export type ThemeDataField = {
  key: string;
  label: string;
  type: ThemeDataFieldType;
  required: boolean;
  example: string;
};

export type ThemeDataDefinition = {
  key: string;
  label: string;
  description: string;
  aliases: string[];
  fields: ThemeDataField[];
  previewItems: Array<Record<string, unknown>>;
};

export const THEME_DATA_SCHEMA_VERSION = "theme-data:v1";

export const themeDataDefinitions: ThemeDataDefinition[] = [
  {
    key: "cabs",
    label: "Cabs",
    description: "Vendor vehicle cards, fleet showcase, fare hints, and availability.",
    aliases: ["cabOptions", "vehicles", "vehicleOptions", "fleet", "cars"],
    fields: [
      { key: "title", label: "Cab title", type: "text", required: true, example: "Sedan cab" },
      { key: "description", label: "Cab details", type: "text", required: false, example: "4 seats, AC" },
      { key: "vehicleType", label: "Vehicle type", type: "text", required: false, example: "Sedan" },
      { key: "seatCapacity", label: "Seats", type: "number", required: false, example: "4" },
      { key: "price", label: "Fare text", type: "text", required: false, example: "From Rs. 12/km" },
      { key: "imageUrl", label: "Vehicle image", type: "image", required: false, example: "" },
    ],
    previewItems: [
      { publicId: "demo-cab-1", title: "Sedan cab", description: "4 seats, AC", vehicleType: "Sedan", seatCapacity: 4, price: "From Rs. 12/km" },
      { publicId: "demo-cab-2", title: "SUV cab", description: "6 seats, luggage", vehicleType: "SUV", seatCapacity: 6, price: "From Rs. 17/km" },
      { publicId: "demo-cab-3", title: "Tempo traveller", description: "Group trips", vehicleType: "Traveller", seatCapacity: 12, price: "Custom fare" },
    ],
  },
  {
    key: "routes",
    label: "Routes",
    description: "Popular pickup/drop routes, package rows, and route landing cards.",
    aliases: ["routePackages", "popularRoutes", "locations"],
    fields: [
      { key: "title", label: "Route title", type: "text", required: true, example: "Ahmedabad to Vadodara" },
      { key: "pickupCityName", label: "Pickup", type: "text", required: false, example: "Ahmedabad" },
      { key: "dropCityName", label: "Drop", type: "text", required: false, example: "Vadodara" },
      { key: "tripType", label: "Trip type", type: "text", required: false, example: "oneway" },
      { key: "minRateTotal", label: "Fare text", type: "text", required: false, example: "Rs. 2,499" },
    ],
    previewItems: [
      { publicId: "demo-route-1", title: "Ahmedabad to Vadodara", pickupCityName: "Ahmedabad", dropCityName: "Vadodara", tripType: "oneway", minRateTotal: "Rs. 2,499" },
      { publicId: "demo-route-2", title: "Ahmedabad Airport transfer", pickupCityName: "Ahmedabad Airport", dropCityName: "Vadodara", tripType: "airport", minRateTotal: "Rs. 1,299" },
      { publicId: "demo-route-3", title: "Vadodara to Surat", pickupCityName: "Vadodara", dropCityName: "Surat", tripType: "outstation", minRateTotal: "Rs. 4,499" },
    ],
  },
  {
    key: "reviews",
    label: "Reviews",
    description: "Approved public customer review snippets and ratings.",
    aliases: ["testimonials", "ratings"],
    fields: [
      { key: "reviewerName", label: "Reviewer", type: "text", required: true, example: "Rahul" },
      { key: "rating", label: "Rating", type: "number", required: true, example: "5" },
      { key: "reviewText", label: "Review text", type: "text", required: true, example: "Clean cab and quick confirmation." },
      { key: "createdAt", label: "Date", type: "text", required: false, example: "Jun 2026" },
    ],
    previewItems: [
      { publicId: "demo-review-1", reviewerName: "Rahul", rating: 5, reviewText: "Clean cab, clear fare and quick booking confirmation.", createdAt: "Jun 2026" },
      { publicId: "demo-review-2", reviewerName: "Priya", rating: 5, reviewText: "Driver reached on time and support stayed available on WhatsApp.", createdAt: "Jun 2026" },
      { publicId: "demo-review-3", reviewerName: "Amit", rating: 4, reviewText: "Good outstation trip experience with transparent charges.", createdAt: "Jun 2026" },
    ],
  },
  {
    key: "faqs",
    label: "FAQs",
    description: "Public booking questions and answers.",
    aliases: ["faq", "questions"],
    fields: [
      { key: "question", label: "Question", type: "text", required: true, example: "Can I book airport pickup?" },
      { key: "answer", label: "Answer", type: "text", required: true, example: "Yes, airport pickup is available." },
    ],
    previewItems: [
      { publicId: "demo-faq-1", question: "How can I book a taxi?", answer: "Choose pickup, drop, cab type, then send the booking request." },
      { publicId: "demo-faq-2", question: "Do you provide airport taxi service?", answer: "Yes, airport pickup and drop can be configured." },
    ],
  },
  {
    key: "services",
    label: "Services",
    description: "Service cards such as one-way, round trip, airport, hourly rental.",
    aliases: ["servicePages", "serviceOptions"],
    fields: [
      { key: "title", label: "Service title", type: "text", required: true, example: "Airport transfer" },
      { key: "description", label: "Description", type: "text", required: false, example: "Pickup and drop support." },
      { key: "price", label: "Price hint", type: "text", required: false, example: "From Rs. 1,299" },
    ],
    previewItems: [
      { publicId: "demo-service-1", title: "One-way cab", description: "City to city taxi booking.", price: "Ask vendor" },
      { publicId: "demo-service-2", title: "Airport transfer", description: "Pickup and drop support.", price: "From Rs. 1,299" },
      { publicId: "demo-service-3", title: "Hourly rental", description: "Local city package.", price: "From Rs. 1,999" },
    ],
  },
  {
    key: "tariffs",
    label: "Tariffs",
    description: "Per-km rates, hourly package rows, and pricing rules.",
    aliases: ["rates", "rateCards", "fareRules"],
    fields: [
      { key: "title", label: "Rate title", type: "text", required: true, example: "Sedan one-way" },
      { key: "cabType", label: "Cab type", type: "text", required: false, example: "Sedan" },
      { key: "oneWayPerKmRate", label: "One-way rate", type: "number", required: false, example: "12" },
      { key: "roundTripPerKmRate", label: "Round-trip rate", type: "number", required: false, example: "11" },
    ],
    previewItems: [
      { publicId: "demo-tariff-1", title: "Sedan one-way", cabType: "Sedan", oneWayPerKmRate: 12, roundTripPerKmRate: 11 },
      { publicId: "demo-tariff-2", title: "SUV one-way", cabType: "SUV", oneWayPerKmRate: 17, roundTripPerKmRate: 16 },
    ],
  },
  {
    key: "calculativeCabsData",
    label: "Calculative cab data",
    description: "Route and cab fare calculation rows for booking totals, cab comparison, and checkout components.",
    aliases: [
      "calculatedCabs",
      "calculatedCabData",
      "fareOptions",
      "bookingTotals",
      "routeCabPricing",
      "cabFareOptions",
      "fareCalculator",
    ],
    fields: [
      { key: "routePublicId", label: "Route public id", type: "text", required: false, example: "route_1" },
      { key: "cabPublicId", label: "Cab public id", type: "text", required: false, example: "cab_1" },
      { key: "routeTitle", label: "Route title", type: "text", required: true, example: "Ahmedabad to Vadodara" },
      { key: "cabTitle", label: "Cab title", type: "text", required: true, example: "Sedan cab" },
      { key: "tripType", label: "Trip type", type: "text", required: false, example: "oneway" },
      { key: "distanceKm", label: "Distance km", type: "number", required: false, example: "110" },
      { key: "perKmRate", label: "Per km rate", type: "number", required: false, example: "12" },
      { key: "estimatedTotal", label: "Estimated total", type: "number", required: true, example: "2499" },
      { key: "price", label: "Display price", type: "text", required: false, example: "Rs. 2,499" },
      { key: "breakdown", label: "Fare breakdown", type: "json", required: false, example: "[{\"label\":\"Base fare\",\"value\":\"Rs. 2,499\"}]" },
    ],
    previewItems: [
      {
        publicId: "demo-calc-1",
        routePublicId: "demo-route-1",
        cabPublicId: "demo-cab-1",
        routeTitle: "Ahmedabad to Vadodara",
        cabTitle: "Sedan cab",
        tripType: "oneway",
        distanceKm: 110,
        perKmRate: 12,
        estimatedTotal: 2499,
        price: "Rs. 2,499",
        breakdown: [
          { label: "Distance", value: "110 km" },
          { label: "Rate", value: "Rs. 12/km" },
        ],
      },
      {
        publicId: "demo-calc-2",
        routePublicId: "demo-route-1",
        cabPublicId: "demo-cab-2",
        routeTitle: "Ahmedabad to Vadodara",
        cabTitle: "SUV cab",
        tripType: "oneway",
        distanceKm: 110,
        perKmRate: 17,
        estimatedTotal: 3299,
        price: "Rs. 3,299",
        breakdown: [
          { label: "Distance", value: "110 km" },
          { label: "Rate", value: "Rs. 17/km" },
        ],
      },
    ],
  },
  {
    key: "serviceAreas",
    label: "Service areas",
    description: "Cities, hubs, airport zones, and operating areas.",
    aliases: ["areas", "cities", "locationsServed"],
    fields: [
      { key: "title", label: "Area name", type: "text", required: true, example: "Vadodara" },
      { key: "description", label: "Area detail", type: "text", required: false, example: "Local and outstation pickup." },
    ],
    previewItems: [
      { publicId: "demo-area-1", title: "Vadodara", description: "Local, airport, and outstation service." },
      { publicId: "demo-area-2", title: "Ahmedabad", description: "Airport and intercity pickup support." },
    ],
  },
  {
    key: "offers",
    label: "Offers",
    description: "Promotional rows, package highlights, and seasonal offers.",
    aliases: ["deals", "promotions", "packages"],
    fields: [
      { key: "title", label: "Offer title", type: "text", required: true, example: "Airport pickup offer" },
      { key: "description", label: "Offer detail", type: "text", required: false, example: "Flat fare on advance booking." },
      { key: "price", label: "Offer price", type: "text", required: false, example: "Rs. 1,299" },
    ],
    previewItems: [
      { publicId: "demo-offer-1", title: "Airport pickup offer", description: "Flat fare on advance booking.", price: "Rs. 1,299" },
    ],
  },
  {
    key: "gallery",
    label: "Gallery",
    description: "Public media cards for fleet, office, routes, and brand moments.",
    aliases: ["images", "photos", "media"],
    fields: [
      { key: "title", label: "Image title", type: "text", required: true, example: "Clean sedan fleet" },
      { key: "imageUrl", label: "Image URL", type: "image", required: true, example: "" },
      { key: "description", label: "Caption", type: "text", required: false, example: "AC cab ready for pickup." },
    ],
    previewItems: [
      { publicId: "demo-gallery-1", title: "Cab fleet", description: "Vehicle photos appear here.", imageUrl: "" },
    ],
  },
  {
    key: "businessInfo",
    label: "Business info",
    description: "Public business profile and contact-safe vendor details.",
    aliases: ["business", "vendor", "profile"],
    fields: [
      { key: "title", label: "Business name", type: "text", required: true, example: "Vendero Demo Cabs" },
      { key: "category", label: "Category", type: "text", required: false, example: "Taxi Service" },
      { key: "location", label: "Location", type: "text", required: false, example: "Vadodara, Gujarat" },
      { key: "description", label: "Description", type: "text", required: false, example: "Reliable local and outstation taxi service." },
    ],
    previewItems: [
      { publicId: "demo-business-1", title: "Vendero Demo Cabs", category: "Taxi Service", location: "Vadodara, Gujarat", description: "Reliable local, airport, and outstation cab support." },
    ],
  },
];

export function normalizeThemeDataKey(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const compact = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const direct = themeDataDefinitions.find(
    (definition) => definition.key.toLowerCase() === raw.toLowerCase() || definition.key.toLowerCase() === compact,
  );
  if (direct) return direct.key;
  const alias = themeDataDefinitions.find((definition) =>
    definition.aliases.some((item) => item.toLowerCase().replace(/[^a-z0-9]+/g, "") === compact),
  );
  return alias?.key ?? raw;
}

export function themeDataDefinitionForKey(value: unknown) {
  const key = normalizeThemeDataKey(value);
  return themeDataDefinitions.find((definition) => definition.key === key) ?? null;
}

export function defaultDataFieldsForThemeDataset(value: unknown): ThemeDataField[] {
  const definition = themeDataDefinitionForKey(value);
  return definition
    ? definition.fields.map((field) => ({ ...field }))
    : [
        { key: "title", label: "Title", type: "text", required: true, example: "Card title" },
        { key: "description", label: "Description", type: "text", required: false, example: "Short description" },
        { key: "imageUrl", label: "Image URL", type: "image", required: false, example: "" },
      ];
}

export function previewItemsForThemeDataset(value: unknown) {
  const definition = themeDataDefinitionForKey(value);
  return definition
    ? definition.previewItems.map((item) => ({ ...item }))
    : [
        { publicId: "demo-item-1", title: "Demo item one", description: "Replace this with vendor data." },
        { publicId: "demo-item-2", title: "Demo item two", description: "This record helps preview the theme." },
      ];
}
