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

// Initialize query with base conditions
let query = supabase.from('mobile_numbers').select("*").eq('available', true);

  // Apply search condition based on the 'match' parameter
  if (search) {
    if (match === 'exact') {
      // Use 'eq' for exact match on a specific field, assuming 'description' as the field to search
      query = query.eq('description', search);
    } else {
      // Use 'ilike' for case-insensitive partial match
      query = query.ilike('description', `%${search}%`);
    }
  }
  
  // Apply price filters if provided
  if (price_lte) {
    query = query.lte('price', price_lte);
  }
  if (price_gte) {
    query = query.gte('price', price_gte);
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

