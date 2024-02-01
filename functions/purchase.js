// /functions/purchase.js
export async function onRequestPost(context) {
    const { request, env } = context;
    
    // Parsing JSON body from the request
    const data = await request.json();
    const { email, numbers } = data;

    // Validate the input
    if (typeof email !== 'string' || !Array.isArray(numbers) || numbers.some(num => typeof num !== 'string')) {
        return new Response('Invalid input', { status: 400 });
    }

    // Prepare the data to be sent to the webhook
    const webhookData = JSON.stringify({ email, numbers });

    // Define the destination URL for the webhook
    const webhookUrl = context.env.PURCHASE_WEBHOOK_BASE_URL; // Environment variable for the base URL;

    try {
        // Send the data to the webhook
        const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: webhookData
        });

        // Check if the webhook response is OK
        if (!webhookResponse.ok) {
            throw new Error(`Webhook error: ${webhookResponse.status}`);
        }

        // Return a success response
        return new Response('Purchase data sent successfully', { status: 200 });
    } catch (error) {
        return new Response(`Error in purchase endpoint: ${error.message}`, { status: 500 });
    }
}
