import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { mapProduct } from '@/lib/products-mapper';
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

    const { shippingAddress, couponCode } = await request.json();
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
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // 3b. Verify Coupon
    let discount = 0;
    if (couponCode) {
      const FALLBACK_COUPONS = [
        { code: 'SAVE10', discount_percent: 10.00, discount_amount: 0.00, min_order_amount: 0.00 },
        { code: 'WELCOME50', discount_percent: 0.00, discount_amount: 50.00, min_order_amount: 300.00 },
        { code: 'FREESHIP', discount_percent: 0.00, discount_amount: 99.00, min_order_amount: 500.00 }
      ];

      let coupon = null;
      try {
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', couponCode.toUpperCase().trim())
          .eq('active', true)
          .maybeSingle();
        if (!error && data) {
          coupon = data;
        }
      } catch (dbErr) {
        console.warn("DB Coupons query failed, falling back to local verification", dbErr);
      }

      if (!coupon) {
        coupon = FALLBACK_COUPONS.find(c => c.code === couponCode.toUpperCase().trim());
      }

      if (coupon) {
        if (subtotal >= Number(coupon.min_order_amount)) {
          if (Number(coupon.discount_percent) > 0) {
            discount = Number(((subtotal * Number(coupon.discount_percent)) / 100).toFixed(2));
          } else if (Number(coupon.discount_amount) > 0) {
            discount = Math.min(Number(coupon.discount_amount), subtotal);
          }
        }
      }
    }

    const subtotalWithDiscount = Math.max(0, subtotal - discount);
    const tax = Number((subtotalWithDiscount * 0.01).toFixed(2));
    const totalAmount = Number((subtotalWithDiscount + tax).toFixed(2));

    const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Insert order in Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        user_id: userId,
        items: orderItems,
        total_amount: totalAmount,
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
