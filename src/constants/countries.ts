export interface CountryConfig {
    name: string;
    code: string;
    flag: string;
    minLength: number;
    maxLength: number;
    placeholder: string;
}

export const COUNTRIES: CountryConfig[] = [
    { name: "Ghana", code: "+233", flag: "🇬🇭", minLength: 9, maxLength: 9, placeholder: "e.g. 54 870 6430" },
    { name: "Nigeria", code: "+234", flag: "🇳🇬", minLength: 10, maxLength: 10, placeholder: "e.g. 80 1234 5678" },
    { name: "United States", code: "+1", flag: "🇺🇸", minLength: 10, maxLength: 10, placeholder: "e.g. 202 555 0199" },
    { name: "United Kingdom", code: "+44", flag: "🇬🇧", minLength: 10, maxLength: 10, placeholder: "e.g. 7911 123456" },
    { name: "Kenya", code: "+254", flag: "🇰🇪", minLength: 9, maxLength: 9, placeholder: "e.g. 712 345678" },
    { name: "South Africa", code: "+27", flag: "🇿🇦", minLength: 9, maxLength: 9, placeholder: "e.g. 82 123 4567" },
    { name: "Canada", code: "+1", flag: "🇨🇦", minLength: 10, maxLength: 10, placeholder: "e.g. 416 555 0199" },
    { name: "Germany", code: "+49", flag: "🇩🇪", minLength: 10, maxLength: 11, placeholder: "e.g. 170 1234567" },
    { name: "France", code: "+33", flag: "🇫🇷", minLength: 9, maxLength: 9, placeholder: "e.g. 6 1234 5678" },
    { name: "India", code: "+91", flag: "🇮🇳", minLength: 10, maxLength: 10, placeholder: "e.g. 98765 43210" },
    { name: "China", code: "+86", flag: "🇨🇳", minLength: 11, maxLength: 11, placeholder: "e.g. 138 1234 5678" },
    { name: "Japan", code: "+81", flag: "🇯🇵", minLength: 10, maxLength: 10, placeholder: "e.g. 90 1234 5678" },
    { name: "Australia", code: "+61", flag: "🇦🇺", minLength: 9, maxLength: 9, placeholder: "e.g. 412 345 678" },
    { name: "Brazil", code: "+55", flag: "🇧🇷", minLength: 11, maxLength: 11, placeholder: "e.g. 11 98765 4321" },
    { name: "United Arab Emirates", code: "+971", flag: "🇦🇪", minLength: 9, maxLength: 9, placeholder: "e.g. 50 123 4567" },
    { name: "Saudi Arabia", code: "+966", flag: "🇸🇦", minLength: 9, maxLength: 9, placeholder: "e.g. 50 123 4567" },
    { name: "Singapore", code: "+65", flag: "🇸🇬", minLength: 8, maxLength: 8, placeholder: "e.g. 8123 4567" },
];

export function getCountryByCode(code: string): CountryConfig {
    return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
}

export function parsePhoneInput(rawPhone: string, fallbackCode: string = "+233"): { countryCode: string; phoneLocal: string } {
    if (!rawPhone || typeof rawPhone !== "string") {
        return { countryCode: fallbackCode, phoneLocal: "" };
    }

    const trimmed = rawPhone.trim();

    // Check if phone starts with a known country code
    for (const c of COUNTRIES) {
        if (trimmed.startsWith(c.code)) {
            const localPart = trimmed.slice(c.code.length).replace(/^0+/, "").replace(/\D/g, "");
            return { countryCode: c.code, phoneLocal: localPart };
        }
    }

    // Default fallback
    const localPart = trimmed.replace(/^0+/, "").replace(/\D/g, "");
    return { countryCode: fallbackCode, phoneLocal: localPart };
}

export function formatFullPhone(countryCode: string, phoneLocal: string): string {
    const cleanLocal = phoneLocal.replace(/^0+/, "").replace(/\D/g, "");
    if (!cleanLocal) return "";
    return `${countryCode}${cleanLocal}`;
}
