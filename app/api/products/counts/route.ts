import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;

    const categories = ['Electronics', 'Accessories', 'Lifestyle', 'Footwear', 'Home & Kitchen', 'Fitness', 'Books', 'Beauty'];

    // 1. Fetch total count of all products matching search (uses head query)
    let allQuery = supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (search) {
      const words = search.trim().split(/\s+/).filter(Boolean);
      for (const word of words) {
        allQuery = allQuery.or(`name.ilike.%${word}%,description.ilike.%${word}%`);
      }
    }

    const { count: allCount, error: allError } = await allQuery;

    if (allError) {
      throw allError;
    }

    // 2. Fetch exact counts for each category in parallel matching search (uses index count scans)
    const countPromises = categories.map(async (cat) => {
      let catQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category', cat);
        
      if (search) {
        const words = search.trim().split(/\s+/).filter(Boolean);
        for (const word of words) {
          catQuery = catQuery.or(`name.ilike.%${word}%,description.ilike.%${word}%`);
        }
      }

      const { count, error } = await catQuery;
        
      if (error) {
        throw error;
      }
      
      return { category: cat, count: count || 0 };
    });

    const results = await Promise.all(countPromises);

    const counts: Record<string, number> = {
      All: allCount || 0
    };

    for (const res of results) {
      counts[res.category] = res.count;
    }

    return Response.json(counts);
  } catch (error) {
    console.error("Error fetching category counts via exact count queries", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
