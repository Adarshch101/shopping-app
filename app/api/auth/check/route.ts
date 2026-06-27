import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Response.json({ exists: !!data });
  } catch (error) {
    console.error("Auth check API error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
