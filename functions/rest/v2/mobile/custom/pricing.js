// Endpoint to do pricing for custom numbers

function sayHelloWorld() {
    return "Hello World";
}

console.log(sayHelloWorld());

// Enforce admin authentication
//
// The caller must provide:
//   Header: X-Admin-Secret: <ADMIN_SECRET>
//
// This is checked against an env var stored only in Cloudflare.
function requireAdmin(request, env) {
    const expected = env.ADMIN_SECRET;

    // Fail closed if misconfigured
    if (!expected || typeof expected !== 'string' || expected.length < 16) {
        return { ok: false, response: json(500, { error: 'ADMIN_NOT_CONFIGURED' }) };
    }

    const provided = request.headers.get('X-Admin-Secret') || '';
    if (provided !== expected) {
        // Do not leak details
        return { ok: false, response: json(403, { error: 'FORBIDDEN' }) };
    }

    return { ok: true };
}