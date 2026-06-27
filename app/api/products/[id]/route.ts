import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { mapProduct } from '@/lib/products-mapper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = mapProduct(data);
    return Response.json(product);
  } catch (error) {
    console.error("Product detail API error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
