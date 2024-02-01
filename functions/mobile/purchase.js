export async function onRequestPost(context) {
    const { request, env } = context;
    const data = await request.json();
    const { email, numbers } = data;
    if (typeof email !== 'string' || !Array.isArray(numbers) || numbers.some(num => typeof num !== 'string')) {
        return new Response('Invalid input', { status: 400 });
    }
    const webhookData = JSON.stringify({ email, numbers });
    const webhookUrl = context.env.PURCHASE_WEBHOOK_BASE_URL;
    try {
        const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: webhookData
        });
        
        if (!webhookResponse.ok) {
            throw new Error(`Webhook error: ${webhookResponse.status}`);
        }
        return new Response('Purchase data sent successfully', { status: 200 });
    } catch (error) {
        return new Response(`Error in purchase endpoint: ${error.message}`, { status: 500 });
    }
}
