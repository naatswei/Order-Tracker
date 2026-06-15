import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET || "hubtel_order_tracker_secret_super_key_2026";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("12h") // 12 hours shift max
        .sign(key);
}

export async function decrypt(input: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ["HS256"],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function setStaffSession(staffId: string, name: string) {
    const expires = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours
    const session = await encrypt({ staffId, name, expires });

    (await cookies()).set("staff_session", session, {
        expires,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });
}

export async function getStaffSession() {
    const session = (await cookies()).get("staff_session")?.value;
    if (!session) return null;
    return await decrypt(session);
}

export async function clearStaffSession() {
    (await cookies()).set("staff_session", "", {
        expires: new Date(0),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });
}
