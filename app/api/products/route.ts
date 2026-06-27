import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { mapProduct } from '@/lib/products-mapper';
import { Product } from '@/lib/products-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const featured = searchParams.get('featured') === 'true';
    
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const sortBy = searchParams.get('sortBy') || undefined;

    // 1. Featured Products Query
    if (featured) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('rating_rate', { ascending: false })
        .limit(4);
        
      if (error) {
        throw error;
      }
      
      const list = (data || []).map(mapProduct).filter((p): p is Product => p !== null);
      return Response.json(list);
    }

    // 2. Paginated Products Query
    if (pageParam || limitParam) {
      const page = Math.max(1, parseInt(pageParam || '1', 10));
      const limit = Math.max(1, parseInt(limitParam || '9', 10));
      
      let query = supabase
        .from('products')
        .select('id, name, description, price, category, image, rating_rate, rating_count, stock', { count: 'exact' });
      
      if (category && category !== 'All') {
        query = query.eq('category', category);
      }
      
      if (search) {
        const words = search.trim().split(/\s+/).filter(Boolean);
        for (const word of words) {
          query = query.or(`name.ilike.%${word}%,description.ilike.%${word}%`);
        }
      }

      if (sortBy === 'price-asc') {
        query = query.order('price', { ascending: true });
      } else if (sortBy === 'price-desc') {
        query = query.order('price', { ascending: false });
      } else if (sortBy === 'rating') {
        query = query.order('rating_rate', { ascending: false });
      }
      
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      
      const { data, count, error } = await query;
      
      if (error) {
        throw error;
      }
      
      const productsList = (data || []).map(mapProduct).filter((p): p is Product => p !== null);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return Response.json({
        products: productsList,
        total,
        page,
        totalPages
      });
    }

    // 3. Flat List Products Query (backward compatibility)
    let query = supabase
      .from('products')
      .select('id, name, description, price, category, image, rating_rate, rating_count, stock');
    
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    
    let list = (data || []).map(mapProduct).filter((p): p is Product => p !== null);
    
    if (search) {
      const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter(p => {
        return words.every(word => 
          p.name.toLowerCase().includes(word) || p.description.toLowerCase().includes(word)
        );
      });
    }
    
    return Response.json(list);
  } catch (error) {
    console.error("Products API error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
