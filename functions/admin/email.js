function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

export function createNeverBounceValidator(adminSecret, apiKey, baseUrl) {
    if (!isNonEmptyString(adminSecret) || adminSecret.trim().length < 16) {
        throw new Error("ADMIN_NOT_CONFIGURED");
    }
    if (!isNonEmptyString(apiKey)) {
        throw new Error("NEVERBOUNCE_API_KEY_NOT_CONFIGURED");
    }
    if (!isNonEmptyString(baseUrl)) {
        throw new Error("NEVERBOUNCE_URL_NOT_CONFIGURED");
    }

    return async function validateEmailWithNeverBounce(email) {
        if (!isNonEmptyString(email)) {
            throw new Error("EMAIL_REQUIRED");
        }

        const verifyUrl = new URL(baseUrl);
        verifyUrl.searchParams.set("key", apiKey);
        verifyUrl.searchParams.set("email", email.trim());

        const response = await fetch(verifyUrl.toString(), { method: "GET" });
        if (!response.ok) {
            throw new Error("NEVERBOUNCE_REQUEST_FAILED");
        }

        const payload = await response.json();
        return {
            result: payload?.result ?? null,
            suggested_correction: payload?.suggested_correction ?? null,
        };
    };
}
