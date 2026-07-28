import "server-only";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
    const raw = process.env.COMPANY_SMTP_ENCRYPTION_KEY;

    if (!raw) {
        throw new Error(
            "COMPANY_SMTP_ENCRYPTION_KEY is missing from the server environment. Generate one with `openssl rand -base64 32` and add it to .env.local, then restart npm run dev.",
        );
    }

    const key = Buffer.from(raw, "base64");

    if (key.length !== 32) {
        throw new Error(
            "COMPANY_SMTP_ENCRYPTION_KEY must decode to exactly 32 bytes. Generate one with `openssl rand -base64 32`.",
        );
    }

    return key;
}

export function encryptSmtpPassword(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [iv, authTag, encrypted]
        .map((part) => part.toString("base64"))
        .join(".");
}

export function decryptSmtpPassword(payload: string): string {
    const [ivPart, tagPart, dataPart] = payload.split(".");

    if (!ivPart || !tagPart || !dataPart) {
        throw new Error("Stored SMTP password is malformed.");
    }

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getKey(),
        Buffer.from(ivPart, "base64"),
    );

    decipher.setAuthTag(Buffer.from(tagPart, "base64"));

    return Buffer.concat([
        decipher.update(Buffer.from(dataPart, "base64")),
        decipher.final(),
    ]).toString("utf8");
}
