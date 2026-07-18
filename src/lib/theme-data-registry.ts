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

export const THEME_DATA_SCHEMA_VERSION = "theme-data:v2";

export const themeDataDefinitions: ThemeDataDefinition[] = [
  {
    key: "cabs",
    label: "Cabs",
    description: "Vendor vehicle cards, fleet showcase, fare hints, and availability.",
    aliases: ["cabOptions", "cabDetails", "vehicles", "vehicleOptions", "fleet", "cars"],
    fields: [
      { key: "publicId", label: "Cab public ID", type: "text", required: false, example: "cab_sedan_1" },
      { key: "slug", label: "Cab page slug", type: "text", required: true, example: "sedan-cab" },
      { key: "title", label: "Cab title", type: "text", required: true, example: "Sedan cab" },
      { key: "description", label: "Cab details", type: "text", required: false, example: "4 seats, AC" },
      { key: "vehicleType", label: "Vehicle type", type: "text", required: false, example: "Sedan" },
      { key: "make", label: "Make", type: "text", required: false, example: "Maruti Suzuki" },
      { key: "model", label: "Model", type: "text", required: false, example: "Dzire" },
      { key: "seatCapacity", label: "Seats", type: "number", required: false, example: "4" },
      { key: "luggageCapacity", label: "Luggage capacity", type: "number", required: false, example: "2" },
      { key: "ac", label: "Air conditioned", type: "boolean", required: false, example: "true" },
      { key: "amenities", label: "Amenities", type: "json", required: false, example: "[\"AC\",\"Music\",\"GPS\"]" },
      { key: "price", label: "Fare text", type: "text", required: false, example: "From Rs. 12/km" },
      { key: "perKmRate", label: "Per-km rate", type: "number", required: false, example: "12" },
      { key: "availabilityStatus", label: "Availability", type: "text", required: false, example: "available" },
      { key: "imageUrl", label: "Vehicle image", type: "image", required: false, example: "" },
      { key: "galleryImages", label: "Vehicle gallery", type: "json", required: false, example: "[\"/cab-front.jpg\",\"/cab-interior.jpg\"]" },
      { key: "included", label: "Included with cab", type: "json", required: false, example: "[\"Driver\",\"Fuel\"]" },
      { key: "excluded", label: "Not included", type: "json", required: false, example: "[\"Tolls\",\"Parking\"]" },
      { key: "detailPath", label: "Cab detail path", type: "url", required: false, example: "/vehicles/sedan-cab" },
    ],
    previewItems: [
      { publicId: "demo-cab-1", slug: "sedan-cab", title: "Sedan cab", description: "4 seats, AC", vehicleType: "Sedan", seatCapacity: 4, luggageCapacity: 2, ac: true, amenities: ["AC", "GPS"], price: "From Rs. 12/km", perKmRate: 12, availabilityStatus: "available", imageUrl: "/booking-assets/category/cab/01.jpg", included: ["Driver", "Fuel"], excluded: ["Tolls", "Parking"] },
      { publicId: "demo-cab-2", slug: "suv-cab", title: "SUV cab", description: "6 seats, luggage", vehicleType: "SUV", seatCapacity: 6, luggageCapacity: 4, ac: true, amenities: ["AC", "Music"], price: "From Rs. 17/km", perKmRate: 17, availabilityStatus: "available", imageUrl: "/booking-assets/category/cab/03.jpg", included: ["Driver", "Fuel"], excluded: ["Tolls", "Parking"] },
      { publicId: "demo-cab-3", slug: "tempo-traveller", title: "Tempo traveller", description: "Group trips", vehicleType: "Traveller", seatCapacity: 12, luggageCapacity: 8, ac: true, amenities: ["AC", "Push-back seats"], price: "Custom fare", availabilityStatus: "on_request", imageUrl: "/booking-assets/category/cab/05.jpg" },
    ],
  },
  {
    key: "routes",
    label: "Routes",
    description: "Popular pickup/drop routes, package rows, and route landing cards.",
    aliases: ["routePackages", "routeDetails", "routePages", "popularRoutes", "locations"],
    fields: [
      { key: "publicId", label: "Route public ID", type: "text", required: false, example: "route_ahmedabad_vadodara" },
      { key: "slug", label: "Route page slug", type: "text", required: true, example: "ahmedabad-to-vadodara" },
      { key: "title", label: "Route title", type: "text", required: true, example: "Ahmedabad to Vadodara" },
      { key: "pickupCityName", label: "Pickup", type: "text", required: false, example: "Ahmedabad" },
      { key: "dropCityName", label: "Drop", type: "text", required: false, example: "Vadodara" },
      { key: "pickupAddress", label: "Pickup details", type: "text", required: false, example: "Ahmedabad city pickup" },
      { key: "dropAddress", label: "Drop details", type: "text", required: false, example: "Vadodara city drop" },
      { key: "tripType", label: "Trip type", type: "text", required: false, example: "oneway" },
      { key: "description", label: "Route description", type: "text", required: false, example: "Book a private cab with door-to-door pickup." },
      { key: "distanceKm", label: "Distance in km", type: "number", required: false, example: "110" },
      { key: "durationText", label: "Travel duration", type: "text", required: false, example: "2 hr 15 min" },
      { key: "minRateTotal", label: "Fare text", type: "text", required: false, example: "Rs. 2,499" },
      { key: "imageUrl", label: "Route image", type: "image", required: false, example: "" },
      { key: "highlights", label: "Route highlights", type: "json", required: false, example: "[\"Doorstep pickup\",\"Verified driver\"]" },
      { key: "itinerary", label: "Suggested itinerary", type: "json", required: false, example: "[{\"title\":\"Pickup\",\"description\":\"Meet your driver\"}]" },
      { key: "included", label: "Included in route fare", type: "json", required: false, example: "[\"Driver\",\"Fuel\"]" },
      { key: "excluded", label: "Not included in route fare", type: "json", required: false, example: "[\"Tolls\",\"Parking\"]" },
      { key: "cabPublicIds", label: "Available cab IDs", type: "json", required: false, example: "[\"demo-cab-1\",\"demo-cab-2\"]" },
      { key: "faqPublicIds", label: "Route FAQ IDs", type: "json", required: false, example: "[\"demo-faq-1\"]" },
      { key: "seoTitle", label: "SEO title", type: "text", required: false, example: "Ahmedabad to Vadodara Cab" },
      { key: "seoDescription", label: "SEO description", type: "text", required: false, example: "Book a one-way Ahmedabad to Vadodara taxi." },
      { key: "detailPath", label: "Route detail path", type: "url", required: false, example: "/cab/ahmedabad-to-vadodara" },
    ],
    previewItems: [
      { publicId: "demo-route-1", slug: "ahmedabad-to-vadodara", title: "Ahmedabad to Vadodara", pickupCityName: "Ahmedabad", dropCityName: "Vadodara", tripType: "oneway", description: "Door-to-door intercity cab service.", distanceKm: 110, durationText: "2 hr 15 min", minRateTotal: "Rs. 2,499", imageUrl: "/booking-assets/category/cab/01.jpg", highlights: ["Doorstep pickup", "Verified driver"], included: ["Driver", "Fuel"], excluded: ["Tolls", "Parking"], cabPublicIds: ["demo-cab-1", "demo-cab-2"] },
      { publicId: "demo-route-2", slug: "ahmedabad-airport-to-vadodara", title: "Ahmedabad Airport transfer", pickupCityName: "Ahmedabad Airport", dropCityName: "Vadodara", tripType: "airport", description: "Flight-aware airport pickup and drop.", distanceKm: 115, durationText: "2 hr 30 min", minRateTotal: "Rs. 1,299", imageUrl: "/booking-assets/category/cab/02.jpg" },
      { publicId: "demo-route-3", slug: "vadodara-to-surat", title: "Vadodara to Surat", pickupCityName: "Vadodara", dropCityName: "Surat", tripType: "outstation", description: "Private outstation cab with flexible stops.", distanceKm: 155, durationText: "3 hr", minRateTotal: "Rs. 4,499", imageUrl: "/booking-assets/category/cab/03.jpg" },
    ],
  },
  {
    key: "reviews",
    label: "Reviews",
    description: "Approved public customer review snippets and ratings.",
    aliases: ["testimonials", "ratings"],
    fields: [
      { key: "publicId", label: "Review public ID", type: "text", required: false, example: "review_1" },
      { key: "reviewerName", label: "Reviewer", type: "text", required: true, example: "Rahul" },
      { key: "rating", label: "Rating", type: "number", required: true, example: "5" },
      { key: "reviewText", label: "Review text", type: "text", required: true, example: "Clean cab and quick confirmation." },
      { key: "routeTitle", label: "Related route", type: "text", required: false, example: "Ahmedabad to Vadodara" },
      { key: "cabTitle", label: "Related cab", type: "text", required: false, example: "Sedan cab" },
      { key: "reviewImageUrl", label: "Reviewer image", type: "image", required: false, example: "" },
      { key: "verified", label: "Verified trip", type: "boolean", required: false, example: "true" },
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
      { key: "publicId", label: "FAQ public ID", type: "text", required: false, example: "faq_airport_1" },
      { key: "question", label: "Question", type: "text", required: true, example: "Can I book airport pickup?" },
      { key: "answer", label: "Answer", type: "text", required: true, example: "Yes, airport pickup is available." },
      { key: "category", label: "FAQ category", type: "text", required: false, example: "Airport" },
      { key: "relatedType", label: "Related page type", type: "text", required: false, example: "route" },
      { key: "relatedPublicId", label: "Related record ID", type: "text", required: false, example: "demo-route-1" },
      { key: "sortOrder", label: "Display order", type: "number", required: false, example: "1" },
      { key: "published", label: "Published", type: "boolean", required: false, example: "true" },
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
    aliases: ["servicePages", "serviceDetails", "serviceOptions"],
    fields: [
      { key: "publicId", label: "Service public ID", type: "text", required: false, example: "service_airport" },
      { key: "slug", label: "Service page slug", type: "text", required: true, example: "airport-transfer" },
      { key: "title", label: "Service title", type: "text", required: true, example: "Airport transfer" },
      { key: "description", label: "Description", type: "text", required: false, example: "Pickup and drop support." },
      { key: "serviceType", label: "Service type", type: "text", required: false, example: "airport" },
      { key: "price", label: "Price hint", type: "text", required: false, example: "From Rs. 1,299" },
      { key: "imageUrl", label: "Service image", type: "image", required: false, example: "" },
      { key: "features", label: "Service features", type: "json", required: false, example: "[\"24x7 pickup\",\"Flight tracking\"]" },
      { key: "included", label: "Included", type: "json", required: false, example: "[\"Driver\",\"Fuel\"]" },
      { key: "excluded", label: "Not included", type: "json", required: false, example: "[\"Parking\"]" },
      { key: "serviceAreaPublicIds", label: "Service area IDs", type: "json", required: false, example: "[\"demo-area-1\"]" },
      { key: "seoTitle", label: "SEO title", type: "text", required: false, example: "Airport Taxi Service" },
      { key: "seoDescription", label: "SEO description", type: "text", required: false, example: "Book reliable airport pickup and drop." },
      { key: "detailPath", label: "Service detail path", type: "url", required: false, example: "/services/airport-transfer" },
    ],
    previewItems: [
      { publicId: "demo-service-1", slug: "one-way-cab", title: "One-way cab", description: "City to city taxi booking.", serviceType: "oneway", price: "Ask vendor", imageUrl: "/booking-assets/category/cab/01.jpg", features: ["Pay one-way fare", "Doorstep pickup"], included: ["Driver", "Fuel"], excluded: ["Tolls", "Parking"] },
      { publicId: "demo-service-2", slug: "airport-transfer", title: "Airport transfer", description: "Pickup and drop support.", serviceType: "airport", price: "From Rs. 1,299", imageUrl: "/booking-assets/category/cab/02.jpg", features: ["24x7 pickup", "Flight-aware planning"] },
      { publicId: "demo-service-3", slug: "hourly-rental", title: "Hourly rental", description: "Local city package.", serviceType: "rental", price: "From Rs. 1,999", imageUrl: "/booking-assets/category/cab/03.jpg", features: ["Flexible stops", "Multiple packages"] },
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
      { key: "publicId", label: "Media public ID", type: "text", required: false, example: "gallery_fleet_1" },
      { key: "title", label: "Image title", type: "text", required: true, example: "Clean sedan fleet" },
      { key: "imageUrl", label: "Image URL", type: "image", required: true, example: "" },
      { key: "altText", label: "Accessible alt text", type: "text", required: true, example: "Clean sedan ready for city pickup" },
      { key: "description", label: "Caption", type: "text", required: false, example: "AC cab ready for pickup." },
      { key: "category", label: "Gallery category", type: "text", required: false, example: "fleet" },
      { key: "relatedType", label: "Related record type", type: "text", required: false, example: "cab" },
      { key: "relatedPublicId", label: "Related record ID", type: "text", required: false, example: "demo-cab-1" },
      { key: "sortOrder", label: "Display order", type: "number", required: false, example: "1" },
    ],
    previewItems: [
      { publicId: "demo-gallery-1", title: "Cab fleet", altText: "Clean sedan cab in the vendor fleet", description: "Clean, air-conditioned vehicles ready for pickup.", imageUrl: "/booking-assets/category/cab/01.jpg", category: "fleet", relatedType: "cab", relatedPublicId: "demo-cab-1", sortOrder: 1 },
      { publicId: "demo-gallery-2", title: "Outstation trips", altText: "Cab prepared for an outstation route", description: "Private cabs for intercity routes.", imageUrl: "/booking-assets/category/cab/04.jpg", category: "routes", relatedType: "route", relatedPublicId: "demo-route-1", sortOrder: 2 },
    ],
  },
  {
    key: "businessInfo",
    label: "Business & contact",
    description: "Public vendor profile, address, contact channels, and selected website WhatsApp number.",
    aliases: ["business", "vendor", "profile", "contact", "contactInfo", "vendorContact"],
    fields: [
      { key: "publicId", label: "Business public ID", type: "text", required: false, example: "business-info" },
      { key: "title", label: "Business name", type: "text", required: true, example: "Vendero Demo Cabs" },
      { key: "legalName", label: "Legal name", type: "text", required: false, example: "Vendero Demo Cabs Private Limited" },
      { key: "category", label: "Category", type: "text", required: false, example: "Taxi Service" },
      { key: "description", label: "Description", type: "text", required: false, example: "Reliable local and outstation taxi service." },
      { key: "logoUrl", label: "Business logo", type: "image", required: false, example: "" },
      { key: "coverImageUrl", label: "Cover image", type: "image", required: false, example: "" },
      { key: "address", label: "Street address", type: "text", required: false, example: "Alkapuri, Vadodara" },
      { key: "city", label: "City", type: "text", required: false, example: "Vadodara" },
      { key: "state", label: "State", type: "text", required: false, example: "Gujarat" },
      { key: "postalCode", label: "Postal code", type: "text", required: false, example: "390007" },
      { key: "country", label: "Country", type: "text", required: false, example: "India" },
      { key: "location", label: "Display location", type: "text", required: false, example: "Vadodara, Gujarat" },
      { key: "phone", label: "Call number", type: "text", required: false, example: "+91 98765 43210" },
      { key: "email", label: "Contact email", type: "text", required: false, example: "bookings@example.com" },
      { key: "websiteUrl", label: "Website URL", type: "url", required: false, example: "https://cabs.example.com" },
      { key: "whatsappNumber", label: "Selected WhatsApp number", type: "text", required: false, example: "+919876543210" },
      { key: "whatsappPhoneNumberId", label: "Selected WhatsApp connection ID", type: "text", required: false, example: "phone_number_id_1" },
      { key: "whatsappSource", label: "WhatsApp number source", type: "text", required: false, example: "vendor_selected" },
      { key: "availableWhatsAppNumbers", label: "Available WhatsApp numbers", type: "json", required: false, example: "[{\"phoneNumberId\":\"phone_number_id_1\",\"number\":\"+919876543210\",\"label\":\"Bookings\"}]" },
      { key: "whatsappGreeting", label: "WhatsApp greeting", type: "text", required: false, example: "I want to book a cab." },
      { key: "contactHours", label: "Contact hours", type: "text", required: false, example: "Open 24 hours" },
      { key: "mapUrl", label: "Map URL", type: "url", required: false, example: "https://maps.google.com/" },
      { key: "socialLinks", label: "Social links", type: "json", required: false, example: "{\"facebook\":\"https://facebook.com/example\"}" },
    ],
    previewItems: [
      { publicId: "demo-business-1", title: "Vendero Demo Cabs", category: "Taxi Service", description: "Reliable local, airport, and outstation cab support.", logoUrl: "", coverImageUrl: "/booking-assets/bg/cab-hero.jpg", address: "Alkapuri", city: "Vadodara", state: "Gujarat", postalCode: "390007", country: "India", location: "Vadodara, Gujarat", phone: "+91 98765 43210", email: "bookings@example.com", whatsappNumber: "+919876543210", whatsappPhoneNumberId: "demo-phone-number-id", whatsappSource: "vendor_selected", availableWhatsAppNumbers: [{ phoneNumberId: "demo-phone-number-id", number: "+919876543210", label: "Bookings" }], whatsappGreeting: "I want to book a cab.", contactHours: "Open 24 hours" },
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
