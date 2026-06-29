import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { mapProduct } from '@/lib/products-mapper';
import { Product } from '@/lib/products-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return Response.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // 1. Fetch all messages in the session, ordered from earliest to latest
    const { data: messages, error: dbError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (dbError) {
      throw dbError;
    }

    // 2. Fetch only required product columns from the database (optimizing specs away)
    const { data: rawProducts } = await supabase
      .from('products')
      .select('id, name, description, price, category, image, rating_rate, rating_count, features, stock');

    const products = (rawProducts || [])
      .map(mapProduct)
      .filter((p): p is Product => p !== null);

    // 3. Structure messages for frontend consumption
    const formattedMessages = (messages || []).map((msg) => {
      let recommendedProducts: Product[] = [];
      const metadata = msg.metadata;
      
      if (metadata && Array.isArray(metadata.recommendedProductIds)) {
        recommendedProducts = products.filter((p) =>
          metadata.recommendedProductIds.includes(p.id)
        );
      }

      return {
        id: msg.id,
        sender: msg.sender as 'user' | 'bot',
        text: msg.message,
        products: recommendedProducts,
        timestamp: new Date(msg.created_at)
      };
    });

    return Response.json(formattedMessages);
  } catch (error) {
    console.error("Chat history GET error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return Response.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Delete all chat logs matching the current session ID
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      throw error;
    }

    return Response.json({ success: true, message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error("Chat history DELETE error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
