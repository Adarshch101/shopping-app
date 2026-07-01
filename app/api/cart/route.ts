import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { mapProduct, type SupabaseProduct } from '@/lib/products-mapper';
import { CartItem } from '@/lib/products-data';

// Helper to retrieve mapped cart items
async function getCartItems(userId: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from('carts')
    .select('id, quantity, created_at, products (id, name, description, price, category, image, rating_rate, rating_count, stock)')
    .eq('user_id', userId);
    
  if (error) {
    throw error;
  }
  
  return (data || []).map((d) => {
    const item = d as unknown as { id: string; quantity: number; created_at: string; products: SupabaseProduct | null };
    const product = mapProduct(item.products);
    if (!product) return null;
    return {
      id: item.id,
      product,
      quantity: item.quantity,
      created_at: item.created_at
    };
  }).filter((item): item is CartItem => item !== null);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cart = await getCartItems(userId);
    return Response.json(cart);
  } catch (error) {
    console.error("Cart GET error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, quantity = 1 } = await request.json();
    if (!productId) {
      return Response.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // 1. Fetch product to check stock limits
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (productError || !productData) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = mapProduct(productData);
    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    // 2. Check if product already exists in cart
    const { data: existing } = await supabase
      .from('carts')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();

    const targetQuantity = (existing ? existing.quantity : 0) + quantity;
    if (targetQuantity > product.stock) {
      return Response.json(
        { error: `Only ${product.stock} units are in stock. You have ${existing ? existing.quantity : 0} in your cart.` },
        { status: 400 }
      );
    }

    // 3. Insert or update cart item
    if (existing) {
      const { error: updateError } = await supabase
        .from('carts')
        .update({ quantity: targetQuantity })
        .eq('id', existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('carts')
        .insert({ user_id: userId, product_id: productId, quantity });
      if (insertError) throw insertError;
    }

    const cart = await getCartItems(userId);
    return Response.json(cart);
  } catch (error) {
    console.error("Cart POST error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, quantity } = await request.json();
    if (!productId || quantity === undefined) {
      return Response.json({ error: 'Product ID and quantity are required' }, { status: 400 });
    }

    // 1. If quantity is 0 or less, remove item from cart
    if (quantity <= 0) {
      const { error: deleteError } = await supabase
        .from('carts')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
      if (deleteError) throw deleteError;

      const cart = await getCartItems(userId);
      return Response.json(cart);
    }

    // 2. Fetch product stock limits
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (productError || !productData) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = mapProduct(productData);
    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    if (quantity > product.stock) {
      return Response.json(
        { error: `Only ${product.stock} units are in stock.` },
        { status: 400 }
      );
    }

    // 3. Update quantity
    const { error: updateError } = await supabase
      .from('carts')
      .update({ quantity })
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (updateError) throw updateError;

    const cart = await getCartItems(userId);
    return Response.json(cart);
  } catch (error) {
    console.error("Cart PUT error", error);
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

    if (productId) {
      const { error: deleteError } = await supabase
        .from('carts')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
      if (deleteError) throw deleteError;
    } else {
      const { error: clearError } = await supabase
        .from('carts')
        .delete()
        .eq('user_id', userId);
      if (clearError) throw clearError;
    }

    const cart = await getCartItems(userId);
    return Response.json(cart);
  } catch (error) {
    console.error("Cart DELETE error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
