export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "Electronics" | "Accessories" | "Lifestyle" | "Footwear" | "Home & Kitchen" | "Fitness" | "Books" | "Beauty";
  image: string;
  rating: {
    rate: number;
    count: number;
  };
  features: string[];
  specs: Record<string, string>;
  stock: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  created_at: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  shipping_address: {
    fullName: string;
    addressLine1: string;
    city: string;
    postalCode: string;
    phone: string;
  };
  status: string;
  created_at: string;
}


