export const PRICING_PLANS = [
    {
        id: "1-month",
        name: "1 Month Access",
        description: "Perfect for short-term projects",
        price: 149,
        durationDays: 30,
        features: [
            "Unlimited team members",
            "Unlimited orders",
            "Branded tracking page",
            "Customer messaging inbox",
            "Staff performance tracking",
            "Priority support"
        ],
        buttonText: "Get 1 Month",
        buttonVariant: "secondary" as const,
        glowColor: "bg-blue-400/20",
    },
    {
        id: "3-months",
        name: "3 Months Access",
        description: "Our most popular choice",
        price: 299,
        durationDays: 90,
        features: [
            "Everything included",
            "Unlimited team members",
            "Unlimited orders",
            "Branded tracking page",
            "Save GHS 148 vs monthly",
            "Priority support"
        ],
        buttonText: "Get 3 Months",
        buttonVariant: "orange" as const,
        glowColor: "bg-[#CE0003]/20",
        popular: true,
    },
    {
        id: "1-year",
        name: "1 Year Access",
        description: "Maximum savings for pros",
        price: 850,
        durationDays: 365,
        features: [
            "Everything included",
            "Unlimited team members",
            "Unlimited orders",
            "Save GHS 938 vs monthly",
            "Dedicated account manager",
            "Priority support"
        ],
        buttonText: "Get 1 Year",
        buttonVariant: "black" as const,
        glowColor: "bg-purple-400/20",
    }
];

export const FREE_TRIAL_PLAN = {
    id: "free-trial",
    name: "Free Trial",
    description: "Try everything for 14 days",
    price: 0,
    durationDays: 14,
    features: [
        "Full application access",
        "Unlimited team members",
        "Up to 20 orders",
        "Branded tracking page",
        "Standard dashboard",
        "Email support"
    ],
    buttonText: "Start 14-Day Free Trial",
    buttonVariant: "secondary" as const,
    glowColor: "bg-pink-400/20",
};
