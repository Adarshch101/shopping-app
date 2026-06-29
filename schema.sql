-- ==========================================
-- ShopNow Database Schema Definition
-- Run this script in the Supabase SQL Editor
-- ==========================================

-- Drop existing tables and triggers if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.orders cascade;
drop table if exists public.carts cascade;
drop table if exists public.wishlists cascade;
drop table if exists public.profiles cascade;
drop table if exists public.products cascade;

-- 1. Create Products Table
create table public.products (
  id text primary key,
  name text not null,
  description text not null,
  price numeric(10, 2) not null,
  category text not null,
  image text not null,
  rating_rate numeric(3, 2) not null,
  rating_count integer not null,
  features text[] not null,
  specs jsonb not null,
  stock integer not null default 0
);

-- Enable RLS for Products
alter table public.products enable row level security;

-- Policy: Allow read access to products for everyone
create policy "Allow read access to products for everyone" on public.products
  for select using (true);


-- 2. Create Profiles Table (user details matched to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  created_at timestamptz default now()
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

-- Policy: Allow public select access to profiles (to check email presence in login check)
create policy "Allow public select access to profiles" on public.profiles
  for select using (true);


-- Trigger function to automatically insert profile row when a new user signs up in Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute trigger function
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 3. Create Wishlists Table
create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  product_id text references public.products on delete cascade not null,
  created_at timestamptz default now(),
  unique (user_id, product_id)
);

-- Enable RLS for Wishlists
alter table public.wishlists enable row level security;

-- Policies for Wishlists (Backend-for-Frontend API handles scoping by user_id)
create policy "Allow all access to wishlists for anyone" on public.wishlists
  for all using (true) with check (true);


-- 4. Create Carts Table
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  product_id text references public.products on delete cascade not null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz default now(),
  unique (user_id, product_id)
);

-- Enable RLS for Carts
alter table public.carts enable row level security;

-- Policies for Carts (Backend-for-Frontend API handles scoping by user_id)
create policy "Allow all access to carts for anyone" on public.carts
  for all using (true) with check (true);


-- 5. Create Orders Table
create table public.orders (
  id text primary key, -- Custom Order ID (e.g. ORD-XXXXXX)
  user_id uuid references auth.users on delete cascade not null,
  items jsonb not null, -- Array of items ordered
  total_amount numeric(10, 2) not null,
  shipping_address jsonb not null,
  status text not null default 'Processing',
  created_at timestamptz default now()
);

-- Enable RLS for Orders
alter table public.orders enable row level security;

-- Policies for Orders (Backend-for-Frontend API handles scoping by user_id)
create policy "Allow all access to orders for anyone" on public.orders
  for all using (true) with check (true);


-- ==========================================
-- Database Indexes for Performance Tuning
-- ==========================================

-- 1. Indexing Products Table
-- For category filtering (e.g. category matching)
create index if not exists idx_products_category on public.products(category);

-- For price sorting (e.g. price asc/desc)
create index if not exists idx_products_price on public.products(price);

-- For rating sorting (e.g. rate desc)
create index if not exists idx_products_rating_rate on public.products(rating_rate desc);

-- For full substring pattern searches (using pg_trgm extension for GIN trgm matching)
create extension if not exists pg_trgm;
create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create index if not exists idx_products_desc_trgm on public.products using gin (description gin_trgm_ops);


-- 2. Indexing Cart & Wishlist Tables
-- For user-scoped lookups
create index if not exists idx_carts_user_id on public.carts(user_id);
create index if not exists idx_wishlists_user_id on public.wishlists(user_id);


-- 3. Indexing Orders Table
-- For user-scoped orders listed by date desc
create index if not exists idx_orders_user_created on public.orders(user_id, created_at desc);


-- ==========================================
-- Seed Products Data
-- ==========================================
insert into public.products (id, name, description, price, category, image, rating_rate, rating_count, features, specs, stock) values
(
  '1',
  'Aether ANC Wireless Headphones',
  'Experience pure sound with active noise-canceling technology, 40-hour battery life, and ultra-comfortable memory foam earcups.',
  249.99,
  'Electronics',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop',
  4.8,
  128,
  array['Hybrid Active Noise Cancellation (ANC)', 'Up to 40 Hours of Playtime', 'Hi-Res Wireless Audio Certified', 'Multipoint Bluetooth Connection'],
  '{"Drivers": "40mm Dynamic", "Bluetooth Version": "5.2", "Charging Port": "USB-C (Fast Charge supported)", "Weight": "260g"}'::jsonb,
  15
),
(
  '2',
  'Solstice Chronograph Watch',
  'A minimalist design meet luxury timekeeping. Features a brushed steel finish, genuine Italian leather strap, and Japanese quartz movement.',
  189.00,
  'Accessories',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop',
  4.6,
  94,
  array['Scratch-Resistant Sapphire Crystal', 'Water Resistant up to 50 Meters', 'Luminous Hands for Low Light Reading', 'Genuine Italian Leather Quick-Release Strap'],
  '{"Movement": "Japanese Quartz Chronograph", "Case Material": "316L Stainless Steel", "Band Width": "20mm", "Case Diameter": "40mm"}'::jsonb,
  8
),
(
  '3',
  'Apex RGB Mechanical Keyboard',
  'Compact 75% mechanical keyboard featuring hot-swappable tactile switches, pre-lubed stabilizers, and dynamic RGB backlighting.',
  129.99,
  'Electronics',
  'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=600&auto=format&fit=crop',
  4.7,
  215,
  array['Hot-Swappable Switch Sockets', 'Double-shot PBT Keycaps', 'Tri-Mode Connectivity (Wired, 2.4GHz, Bluetooth)', 'Premium Sound Dampening Foam Layers'],
  '{"Form Factor": "75% Layout", "Switches": "Pre-lubed Brown Tactile", "Battery Capacity": "4000mAh", "Backlight": "Per-key RGB"}'::jsonb,
  20
),
(
  '4',
  'Vanguard Leather Backpack',
  'Designed for modern professionals. Fits up to a 16-inch laptop, crafted from premium water-resistant full-grain leather.',
  159.50,
  'Accessories',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop',
  4.9,
  87,
  array['Dedicated Padded 16" Laptop Compartment', 'Hidden Luggage Strap & Anti-theft Pocket', 'Ergonomic Shoulder Straps with Mesh Padding', 'YKK Weatherproof Zippers'],
  '{"Material": "Full-grain Leather", "Capacity": "22 Liters", "Dimensions": "18\" x 12\" x 6\"", "Weight": "1.1 kg"}'::jsonb,
  12
),
(
  '5',
  'Nebula Smart Home Hub',
  'Voice-activated smart display and sound system that brings smart automation and high-fidelity music to any room.',
  99.00,
  'Electronics',
  'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=600&auto=format&fit=crop',
  4.4,
  62,
  array['Voice-Controlled Smart Assistant', 'Immersive 360-Degree Audio', 'Sleek Ambient LED Touch Screen', 'Universal Smart Home Protocol Hub'],
  '{"Speaker Size": "2.5\" Full-Range Driver", "Connectivity": "Wi-Fi 6, Bluetooth 5.0, Zigbee", "Power Source": "DC Wall Adapter", "Microphones": "Far-field Array"}'::jsonb,
  25
),
(
  '6',
  'Luna Ceramic Coffee Set',
  'Beautifully handcrafted matte ceramic cup and saucer set. Designed with double-walled insulation to keep your beverages warm.',
  34.99,
  'Lifestyle',
  'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=600&auto=format&fit=crop',
  4.5,
  148,
  array['Double-Walled Thermal Heat Retention', 'Dishwasher and Microwave Safe', 'Ergonomic Comfort Grip Rim', 'Lead-Free Matte Protective Glaze'],
  '{"Material": "Premium Ceramic", "Capacity": "350 ml (12 oz)", "Included": "1 Mug, 1 Coaster Saucer", "Finish": "Charcoal Black Matte"}'::jsonb,
  45
),
(
  '7',
  'Horizon Running Shoes',
  'Push your limits with responsive foam cushioning, breathable knit mesh uppers, and high-traction carbon rubber outsoles.',
  110.00,
  'Footwear',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop',
  4.7,
  173,
  array['HorizonFlex Responsive Foam Midsole', 'Engineered Breathable Mesh Upper', 'Reinforced Heel Counter for Stability', 'High-Abrasion Carbon Rubber Traction Pads'],
  '{"Heel Drop": "8mm", "Weight": "240g (Size 9)", "Support Type": "Neutral Cushioning", "Lacing System": "Traditional"}'::jsonb,
  14
),
(
  '8',
  'Aero Insulated Water Bottle',
  'Vacuum insulated water bottle that keeps your drinks ice cold for 24 hours or hot for 12 hours. Premium powder-coated finish.',
  29.99,
  'Lifestyle',
  'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=600&auto=format&fit=crop',
  4.9,
  320,
  array['TempGuard Double-Wall Vacuum Insulation', '18/8 Pro-Grade Stainless Steel', 'BPA-Free and Phthalate-Free', 'Leak-Proof Chug Cap Lid'],
  '{"Capacity": "750 ml (24 oz)", "Insulation duration": "24 hrs cold / 12 hrs hot", "Weight": "380g", "Height": "10.4 inches"}'::jsonb,
  50
);

-- ==========================================
-- 6. Create Chat Messages Table for Chatbot History
-- ==========================================
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  session_id text not null,
  sender text not null check (sender in ('user', 'bot')),
  message text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Enable RLS for Chat Messages
alter table public.chat_messages enable row level security;

-- Policy: Allow all operations to chat messages for anyone
create policy "Allow all access to chat messages for anyone" on public.chat_messages
  for all using (true) with check (true);

-- Indexing for lookup performance
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id);
create index if not exists idx_chat_messages_session_id on public.chat_messages(session_id);

