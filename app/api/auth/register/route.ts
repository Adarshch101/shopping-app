import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { id, email } = await request.json();

    if (!id || !email) {
      return Response.json({ error: 'ID and email are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id, email })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return Response.json(data);
  } catch (error) {
    console.error("Auth register API error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
