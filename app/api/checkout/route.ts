import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { mapProduct } from '@/lib/products-mapper';
import { CartItem, Order } from '@/lib/products-data';

// Helper to retrieve mapped cart items
async function getCartItems(userId: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from('carts')
    .select('id, quantity, created_at, products (id, name, description, price, category, image, rating_rate, rating_count, stock)')
    .eq('user_id', userId);
    
  if (error) {
    throw error;
  }
  
  return (data || [])
    .map((item: any) => {
      const product = mapProduct(item.products);
      if (!product) return null;
      return {
        id: item.id,
        product,
        quantity: item.quantity,
        created_at: item.created_at
      };
    })
    .filter((item): item is CartItem => item !== null);
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shippingAddress } = await request.json();
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.phone) {
      return Response.json({ error: 'Invalid or incomplete shipping address' }, { status: 400 });
    }

    // 1. Fetch user's cart items
    const cart = await getCartItems(userId);
    if (cart.length === 0) {
      return Response.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // 2. Map cart items to order items format
    const orderItems = cart.map(item => ({
      product_id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.image
    }));

    // 3. Compute total amount
    const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Insert order in Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        user_id: userId,
        items: orderItems,
        total_amount: Number(totalAmount.toFixed(2)),
        shipping_address: shippingAddress,
        status: "Processing"
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Error placing order in Supabase", orderError);
      return Response.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // 5. Clear the user's cart
    const { error: clearCartError } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId);

    if (clearCartError) {
      console.error("Error clearing user cart post-checkout", clearCartError);
    }

    return Response.json(order);
  } catch (error) {
    console.error("Checkout POST error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return Response.json(data || []);
  } catch (error) {
    console.error("Checkout GET error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
