function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}

function authenticateAdminSecret(adminSecret, env) {
    const expectedSecret = env.ADMIN_SECRET;
    if (!isNonEmptyString(expectedSecret) || expectedSecret.trim().length < 16) {
        throw new Error("ADMIN_NOT_CONFIGURED");
    }
    if (!isNonEmptyString(adminSecret) || adminSecret !== expectedSecret) {
        throw new Error("FORBIDDEN");
    }
}

function getAirtableConfig(env) {
    const apiUrl = env.AIRTABLE_URL || "https://api.airtable.com/v0";
    const apiKey = env.AIRTABLE_ACCESS_TOKEN;
    const baseId = env.AIRTABLE_BASE_ID;
    const tableId = env.AIRTABLE_TABLE_ID;

    if (!isNonEmptyString(apiUrl)) throw new Error("AIRTABLE_URL_NOT_CONFIGURED");
    if (!isNonEmptyString(apiKey)) throw new Error("AIRTABLE_ACCESS_TOKEN_NOT_CONFIGURED");
    if (!isNonEmptyString(baseId)) throw new Error("AIRTABLE_BASE_ID_NOT_CONFIGURED");
    if (!isNonEmptyString(tableId)) throw new Error("AIRTABLE_TABLE_ID_NOT_CONFIGURED");

    return { apiUrl, apiKey, baseId, tableId };
}

function getRequestType(requestValue) {
    return requestValue.length === 6 ? "Last 6" : "Last 7";
}

export async function submitCustomFormToAirtable(formData, adminSecret, env) {
    authenticateAdminSecret(adminSecret, env);
    const { apiUrl, apiKey, baseId, tableId } = getAirtableConfig(env);
    const requestUrl = `${apiUrl.replace(/\/$/, "")}/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`;
    const requestValue = String(formData.request || "");

    const payload = {
        records: [
            {
                fields: {
                    Request: requestValue,
                    "Last Six": requestValue.slice(-6),
                    Type: getRequestType(requestValue),
                    Name: formData.name,
                    Contact: formData.contact || "",
                    email: formData.email,
                    Source: formData.source,
                    Date: new Date().toISOString(),
                },
            },
        ],
    };

    const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error("AIRTABLE_WRITE_FAILED");
    }

    const result = await response.json();
    return {
        id: result?.records?.[0]?.id ?? null,
    };
}
