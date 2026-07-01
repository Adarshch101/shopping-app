import { Product } from './products-data';

export interface SupabaseProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  rating_rate?: number;
  rating_count?: number;
  features?: string[];
  specs?: Record<string, string> | null;
  stock?: number;
}

export function mapProduct(p: SupabaseProduct | null | undefined): Product | null {
  if (!p) return null;
  // Convert USD to INR (e.g. 1 USD = 83 INR)
  const convertedPrice = Math.round(Number(p.price) * 83);
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: convertedPrice,
    category: p.category as Product['category'],
    image: p.image,
    rating: {
      rate: Number(p.rating_rate),
      count: Number(p.rating_count)
    },
    features: p.features || [],
    specs: p.specs || {},
    stock: p.stock || 0
  };
}
