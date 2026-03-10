// Endpoint for custom numberform submissions.

import { createNeverBounceValidator } from "../../../../admin/email.js";
import { submitCustomFormToAirtable } from "./database.js";

const jsonHeaders = { "Content-Type": "application/json" };

function redirectBaseBySource(source) {
    const normalized = String(source || "").trim().toLowerCase();
    if (normalized === "british") return "https://britishnumbers.com/custom-numbers";
    if (normalized === "create") return "https://createnumbers.com";
    return "https://plus447.co.uk";
}

function buildRedirectResponse(source, status) {
    const base = redirectBaseBySource(source);
    const location = `${base}?status=${encodeURIComponent(status)}`;
    return new Response(null, {
        status: 302,
        headers: { Location: location },
    });
}

function capitalizeWords(value) {
    return value
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

function sanitizeIncoming(body, queryParams) {
    const fromBody = (key) => (body && Object.prototype.hasOwnProperty.call(body, key) ? body[key] : undefined);
    const fromQuery = (key) => queryParams.get(key);
    const pick = (key) => {
        const v = fromBody(key);
        return v !== undefined ? v : fromQuery(key);
    };

    const rawRequest = pick("request");
    const rawEmail = pick("email");
    const rawName = pick("name");
    const rawContact = pick("contact");
    const rawSource = pick("source");
    const rawToken = pick("authenticity_token");

    const request = rawRequest == null ? "" : String(rawRequest).replace(/\s+/g, "");
    const email = rawEmail == null ? "" : String(rawEmail).trim();
    const name = rawName == null ? "" : capitalizeWords(String(rawName));
    const contact = rawContact == null ? "" : String(rawContact).replace(/\s+/g, "");
    const source = rawSource == null ? "" : String(rawSource).trim();
    const authenticityToken = rawToken == null ? "" : String(rawToken).trim();

    return {
        request,
        email,
        name,
        contact,
        source,
        authenticityToken,
    };
}

function validateParams(params) {
    const errors = [];

    if (!params.request) {
        errors.push("request: is required.");
    } else {
        if (params.request.length < 6 || params.request.length > 7) {
            errors.push("request: length must be between 6 and 7 characters.");
        }
        if (!/^\d+$/.test(params.request)) {
            errors.push("request: must contain numbers only.");
        }
    }

    if (!params.email) {
        errors.push("email: is required.");
    } else {
        if (params.email.length > 100) {
            errors.push("email: maximum length is 100 characters.");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email)) {
            errors.push("email: must be a valid email format.");
        }
    }

    if (!params.name) {
        errors.push("name: is required.");
    } else if (params.name.length > 100) {
        errors.push("name: maximum length is 100 characters.");
    }

    if (params.contact) {
        if (params.contact.length > 20) {
            errors.push("contact: maximum length is 20 characters.");
        }
        if (!/^\+?[0-9]+$/.test(params.contact)) {
            errors.push("contact: only numbers are allowed, with optional leading +.");
        }
    }

    if (!params.source) {
        errors.push("source: is required.");
    } else {
        if (params.source.length > 20) {
            errors.push("source: maximum length is 20 characters.");
        }
        if (!/^[a-zA-Z0-9]+$/.test(params.source)) {
            errors.push("source: only letters and numbers are allowed.");
        }
    }

    if (!params.authenticityToken) {
        errors.push("authentication failed.");
    }

    return errors;
}

async function parsePostBody(request, url) {
    const query = url.searchParams;
    const contentType = (request.headers.get("Content-Type") || "")
        .split(";")[0]
        .trim()
        .toLowerCase();

    if (!contentType) {
        const rawBody = await request.text();
        if (rawBody && rawBody.includes("=")) {
            const bodyParams = new URLSearchParams(rawBody);
            const bodyObject = Object.fromEntries(bodyParams.entries());
            return sanitizeIncoming(bodyObject, query);
        }
        return sanitizeIncoming(null, query);
    }

    if (contentType === "application/x-www-form-urlencoded") {
        const bodyText = await request.text();
        const bodyParams = new URLSearchParams(bodyText);
        const bodyObject = Object.fromEntries(bodyParams.entries());
        return sanitizeIncoming(bodyObject, query);
    }

    if (contentType === "text/plain") {
        return sanitizeIncoming(null, query);
    }

    if (contentType !== "application/json") return null;

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("INVALID_JSON_BODY");
    }

    return sanitizeIncoming(body, query);
}

async function sendToCreateNewRequestWebhook(params, env) {
    const webhookBaseUrl = env.CREATE_NEW_REQUEST_WEBHOOK;
    if (!webhookBaseUrl) {
        console.error("CREATE_NEW_REQUEST_WEBHOOK is not configured.");
        return;
    }

    const webhookUrl = new URL(webhookBaseUrl);
    webhookUrl.searchParams.set("request", params.request || "");
    webhookUrl.searchParams.set("email", params.email || "");
    webhookUrl.searchParams.set("name", params.name || "");
    webhookUrl.searchParams.set("contact", params.contact || "");
    webhookUrl.searchParams.set("source", params.source || "");
    webhookUrl.searchParams.set("authenticity_token", params.authenticityToken || "");

    const response = await fetch(webhookUrl.toString(), { method: "GET" });
    if (!response.ok) {
        throw new Error(`CREATE_NEW_REQUEST_WEBHOOK_FAILED_${response.status}`);
    }
}

async function processFormSubmission(context, params) {
    const validationErrors = validateParams(params);
    if (validationErrors.length > 0) {
        return new Response(
            JSON.stringify({
                status: 400,
                error: "INVALID_PARAMS",
                message: validationErrors,
            }),
            { status: 400, headers: jsonHeaders }
        );
    }

    let emailValidation;
    try {
        const validateEmail = createNeverBounceValidator(
            context.env.ADMIN_SECRET,
            context.env.NEVERBOUNCE_API_KEY,
            context.env.NEVERBOUNCE_URL
        );
        emailValidation = await validateEmail(params.email);
    } catch (error) {
        return new Response(
            JSON.stringify({
                status: 502,
                error: "BAD_GATEWAY",
                message: "Unable to validate email right now. Please try again.",
            }),
            { status: 502, headers: jsonHeaders }
        );
    }

    if (emailValidation.result !== "valid") {
        return buildRedirectResponse(params.source, "invalid_email");
    }

    const successResponse = buildRedirectResponse(params.source, "success");
    const persistTask = submitCustomFormToAirtable(
        params,
        context.env.ADMIN_SECRET,
        context.env
    ).catch(async (error) => {
        console.error("Airtable submission failed:", error);
        try {
            await sendToCreateNewRequestWebhook(params, context.env);
        } catch (webhookError) {
            console.error("Fallback webhook submission failed:", webhookError);
        }
    });

    if (typeof context.waitUntil === "function") {
        context.waitUntil(persistTask);
    }

    return successResponse;
}

export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    if ([...url.searchParams.keys()].length === 0) {
        return new Response(
            JSON.stringify({
                status: 405,
                error: "METHOD_NOT_ALLOWED",
                message: "Use POST or provide query params with GET for custom form submissions.",
            }),
            { status: 405, headers: jsonHeaders }
        );
    }

    const params = sanitizeIncoming(null, url.searchParams);
    return processFormSubmission(context, params);
}

export async function onRequestPost(context) {
    const url = new URL(context.request.url);

    let params;
    try {
        params = await parsePostBody(context.request, url);
    } catch (error) {
        return new Response(
            JSON.stringify({
                status: 400,
                error: "INVALID_BODY",
                message: "Invalid JSON body.",
            }),
            { status: 400, headers: jsonHeaders }
        );
    }

    if (!params) {
        return new Response(
            JSON.stringify({
                status: 415,
                error: "UNSUPPORTED_MEDIA_TYPE",
                message: "Content-Type must be application/json or omitted for query-based POST.",
            }),
            { status: 415, headers: jsonHeaders }
        );
    }

    return processFormSubmission(context, params);
}