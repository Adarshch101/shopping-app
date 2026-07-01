-- =============================================================
-- ShopNow AI Chatbot Database Enhancements
-- Run this script in the Supabase SQL Editor (https://supabase.com)
-- =============================================================

-- 1. Enable Vector Extension for Semantic Search
create extension if not exists vector;

-- 2. Add Embedding Column to Products
alter table public.products add column if not exists embedding vector(768);

-- 3. Create Vector Search Function
create or replace function match_products (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id text,
  name text,
  description text,
  price numeric,
  category text,
  image text,
  rating_rate numeric,
  rating_count int,
  features text[],
  specs jsonb,
  stock int,
  similarity float
)
language sql stable
as $$
  select
    products.id,
    products.name,
    products.description,
    products.price,
    products.category,
    products.image,
    products.rating_rate,
    products.rating_count,
    products.features,
    products.specs,
    products.stock,
    1 - (products.embedding <=> query_embedding) as similarity
  from products
  where 1 - (products.embedding <=> query_embedding) > match_threshold
  order by products.embedding <=> query_embedding
  limit match_count;
$$;

-- 4. Add Preferences Column to User Profiles
alter table public.profiles add column if not exists preferences jsonb default '{}'::jsonb;

-- 5. Create Coupons Table
create table if not exists public.coupons (
  code text primary key,
  discount_percent numeric(5, 2) default 0,
  discount_amount numeric(10, 2) default 0,
  min_order_amount numeric(10, 2) default 0,
  description text,
  active boolean default true
);

-- Seed Initial Coupons
insert into public.coupons (code, discount_percent, discount_amount, min_order_amount, description, active) values
('SAVE10', 10.00, 0.00, 0.00, '10% off on all items', true),
('WELCOME50', 0.00, 50.00, 300.00, '₹50 off on orders above ₹300', true),
('FREESHIP', 0.00, 99.00, 500.00, 'Free shipping (₹99 off) on orders above ₹500', true)
on conflict (code) do nothing;

-- 6. Create storage bucket for user documents (PDF/DOCX)
insert into storage.buckets (id, name, public)
values ('user-documents', 'user-documents', false)
on conflict (id) do nothing;

-- Enable RLS for storage.objects
alter table storage.objects enable row level security;

-- Storage Policy: Allow users to view their own uploaded files
create policy "Allow users to view their own files" on storage.objects
  for select using (
    bucket_id = 'user-documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage Policy: Allow users to upload files to their own folder
create policy "Allow users to upload their own files" on storage.objects
  for insert with check (
    bucket_id = 'user-documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage Policy: Allow users to delete their own files
create policy "Allow users to delete their own files" on storage.objects
  for delete using (
    bucket_id = 'user-documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
