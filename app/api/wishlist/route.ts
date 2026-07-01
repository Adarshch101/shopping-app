import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { mapProduct, type SupabaseProduct } from '@/lib/products-mapper';
import { Product } from '@/lib/products-data';

// Helper to retrieve mapped wishlist products
async function getWishlistItems(userId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('wishlists')
    .select('products (id, name, description, price, category, image, rating_rate, rating_count, stock)')
    .eq('user_id', userId);
    
  if (error) {
    throw error;
  }
  
  return (data || [])
    .map((d) => {
      const item = d as unknown as { products: SupabaseProduct | null };
      return mapProduct(item.products);
    })
    .filter((p): p is Product => p !== null);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wishlist = await getWishlistItems(userId);
    return Response.json(wishlist);
  } catch (error) {
    console.error("Wishlist GET error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Check if syncing multiple items
    if (body.productIds && Array.isArray(body.productIds)) {
      if (body.productIds.length > 0) {
        const rows = body.productIds.map((id: string) => ({ user_id: userId, product_id: id }));
        const { error } = await supabase
          .from('wishlists')
          .upsert(rows, { onConflict: 'user_id,product_id' });
        if (error) throw error;
      }
      const wishlist = await getWishlistItems(userId);
      return Response.json(wishlist);
    }
    
    // Otherwise add a single product ID
    const { productId } = body;
    if (!productId) {
      return Response.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('wishlists')
      .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' });
      
    if (error) throw error;

    const wishlist = await getWishlistItems(userId);
    return Response.json(wishlist);
  } catch (error) {
    console.error("Wishlist POST error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');

    if (!productId) {
      return Response.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
      
    if (error) throw error;

    const wishlist = await getWishlistItems(userId);
    return Response.json(wishlist);
  } catch (error) {
    console.error("Wishlist DELETE error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
