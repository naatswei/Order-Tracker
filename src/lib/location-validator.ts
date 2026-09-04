// Recognized cities, districts, and business hubs for location suggestions and verification
export const RECOGNIZED_LOCATIONS = [
    // Ghana - Greater Accra
    "Accra, Ghana",
    "East Legon, Accra",
    "Cantonments, Accra",
    "Osu, Accra",
    "Spintex Road, Accra",
    "Airport Residential Area, Accra",
    "Dzorwulu, Accra",
    "Labone, Accra",
    "Ridge, Accra",
    "Abelemkpe, Accra",
    "Roman Ridge, Accra",
    "Madina, Accra",
    "Adenta, Accra",
    "Dansoman, Accra",
    "Achimota, Accra",
    "Tesano, Accra",
    "Teshie, Accra",
    "Nungua, Accra",
    "Sakumono, Greater Accra",
    "Tema, Greater Accra",
    "Kasoa, Central/Greater Accra",
    // Ghana - Other Regions
    "Kumasi, Ashanti Region",
    "Adum, Kumasi",
    "Ahodwo, Kumasi",
    "KNUST Campus, Kumasi",
    "Asokwa, Kumasi",
    "Takoradi, Western Region",
    "Sekondi, Western Region",
    "Cape Coast, Central Region",
    "Tamale, Northern Region",
    "Sunyani, Bono Region",
    "Ho, Volta Region",
    "Koforidua, Eastern Region",
    "Wa, Upper West Region",
    "Bolgatanga, Upper East Region",
    "Techiman, Bono East Region",
    // West Africa & International Business Hubs
    "Lagos, Nigeria",
    "Ikeja, Lagos, Nigeria",
    "Victoria Island, Lagos",
    "Lekki, Lagos",
    "Abuja, FCT, Nigeria",
    "Port Harcourt, Nigeria",
    "Ibadan, Nigeria",
    "London, United Kingdom",
    "Manchester, United Kingdom",
    "New York, NY, USA",
    "Atlanta, GA, USA",
    "Toronto, ON, Canada",
    "Nairobi, Kenya",
    "Johannesburg, South Africa",
    "Dubai, United Arab Emirates",
];

const BANNED_NON_LOCATION_WORDS = new Set([
    "name",
    "my name",
    "me",
    "john",
    "jane",
    "admin",
    "test",
    "user",
    "none",
    "na",
    "n/a",
    "no",
    "null",
    "undefined",
    "location",
    "address",
    "here",
    "there",
    "somewhere",
    "abc",
    "xyz",
    "123",
]);

export interface LocationValidationResult {
    isValid: boolean;
    reason?: string;
}

export function validateLocation(location: string, companyName?: string): LocationValidationResult {
    const trimmed = (location || "").trim();

    if (!trimmed) {
        return { isValid: false, reason: "Location is required." };
    }

    if (trimmed.length < 3) {
        return { isValid: false, reason: "Location must be at least 3 characters long." };
    }

    const lower = trimmed.toLowerCase();

    // Check against generic non-location words
    if (BANNED_NON_LOCATION_WORDS.has(lower)) {
        return { isValid: false, reason: "Please enter a recognized city, district, or street address." };
    }

    // Must contain letters (not just digits/symbols)
    if (!/[a-zA-Z]/.test(trimmed)) {
        return { isValid: false, reason: "Location must contain valid city or street name letters." };
    }

    // Check if location is accidentally identical to company name
    if (companyName && companyName.trim().length > 0) {
        const cleanCompany = companyName.trim().toLowerCase();
        if (lower === cleanCompany) {
            return { isValid: false, reason: "Location cannot be identical to your company name." };
        }
    }

    return { isValid: true };
}

export function getLocationSuggestions(query: string): string[] {
    const trimmed = (query || "").trim().toLowerCase();
    if (!trimmed) return RECOGNIZED_LOCATIONS.slice(0, 8);

    return RECOGNIZED_LOCATIONS.filter((loc) =>
        loc.toLowerCase().includes(trimmed)
    ).slice(0, 10);
}
