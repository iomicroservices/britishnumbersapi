import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = context.env.MOBILE_DATABASE_BASE_URL;
const supabaseKey = context.env.MOBILE_DATABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function handleRequest(request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  // Extracting query parameters
  const type = params.get('type') || 'number';
  const match = params.get('match') || null;
  const range = params.get('range') || '0-99';
  const price_lte = params.get('price_lte') || null;
  const price_gte = params.get('price_gte') || null;
  const search = params.get('search') || null;

  // Building the query
  let query = supabase.from('mobile_numbers').select("*");

  if (type) {
    query = query.eq('type', type);
  }
  if (match) {
    query = query.eq('match', match);
  }
  if (range) {
    // Assuming range is a specific field, you might need to adjust the logic here
    query = query.eq('range', range);
  }
  if (price_lte) {
    query = query.lte('price', price_lte);
  }
  if (price_gte) {
    query = query.gte('price', price_gte);
  }
  if (search) {
    // Assuming 'search' applies to a text field like 'description'. Adjust field name as necessary.
    query = query.ilike('description', `%${search}%`);
  }

  try {
    let { data: mobile_numbers, error } = await query;

    if (error) throw error;

    return new Response(JSON.stringify(mobile_numbers), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

