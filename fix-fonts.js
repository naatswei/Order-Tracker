const fs = require('fs');

const files = [
    "src/components/backoffice-header.tsx",
    "src/app/track/[id]/page.tsx",
    "src/app/track/page.tsx",
    "src/app/onboarding/subscription/page.tsx",
    "src/app/onboarding/profile/page.tsx",
    "src/app/onboarding/organization/page.tsx",
    "src/app/onboarding/business-type/page.tsx",
    "src/app/(auth)/sign-up/[[...sign-up]]/page.tsx",
    "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx"
];

// In backoffice-header, track/[id], onboarding pages
const pattern1 = /<div className="flex items-center gap-1\.5">\s*<span className="text-\[#CE0003\] font-black text-2xl tracking-tighter">O<\/span>\s*<span className="text-\[#191A43\] font-light text-xl tracking-\[0\.2em\] uppercase">Tracker<\/span>\s*<\/div>/g;
const replacement1 = `<div className="flex items-center text-xl font-bold tracking-tight">\n                            <span className="text-[#CE0003]">O</span>\n                            <span className="text-[#191A43]">Tracker</span>\n                        </div>`;

// In track/page.tsx
const pattern2 = /<div className="flex items-center gap-1\.5">\s*<span className="text-\[#CE0003\] font-black text-2xl tracking-tighter">O<\/span>\s*<span className="text-white\/90 font-light text-xl tracking-\[0\.2em\]">Tracker<\/span>\s*<\/div>/g;
const replacement2 = `<div className="flex items-center text-2xl font-bold tracking-tight">\n                        <span className="text-[#CE0003]">O</span>\n                        <span className="text-white">Tracker</span>\n                    </div>`;

// In sign in / sign up (white panel)
const pattern3 = /<div className="flex items-center gap-2">\s*<span className="text-\[#CE0003\] font-black text-6xl tracking-tighter">O<\/span>\s*<span className="text-white\/90 font-light text-5xl tracking-\[0\.2em\] uppercase">Tracker<\/span>\s*<\/div>/g;
const replacement3 = `<div className="flex items-center text-5xl font-bold tracking-tight">\n                        <span className="text-[#CE0003]">O</span>\n                        <span className="text-white">Tracker</span>\n                    </div>`;

// In sign in / sign up (mobile panel)
const pattern4 = /<div className="flex items-center gap-1\.5">\s*<span className="text-\[#CE0003\] font-black text-4xl sm:text-5xl tracking-tighter">O<\/span>\s*<span className="text-\[#191A43\] font-light text-3xl sm:text-4xl tracking-\[0\.2em\] uppercase">Tracker<\/span>\s*<\/div>/g;
const replacement4 = `<div className="flex items-center text-3xl sm:text-4xl font-bold tracking-tight text-[#191A43]">\n                            <span className="text-[#CE0003]">O</span>\n                            <span className="text-[#191A43]">Tracker</span>\n                        </div>`;

files.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        content = content.replace(pattern1, replacement1);
        content = content.replace(pattern2, replacement2);
        content = content.replace(pattern3, replacement3);
        content = content.replace(pattern4, replacement4);
        fs.writeFileSync(f, content);
    }
});
console.log('done');
