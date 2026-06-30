import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error("Error: .env file not found at " + envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    env[key] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const apiKey = env['GROQ_API_KEY'];

if (!supabaseUrl || !supabaseAnonKey || !apiKey) {
  console.error("Error: Missing credentials in .env. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and GROQ_API_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "models/gemini-embedding-2",
      content: {
        parts: [{ text }]
      },
      outputDimensionality: 768
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Embedding API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const embedding = data.embedding?.values;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Invalid embedding response from Gemini API");
  }

  return embedding;
}

async function run() {
  console.log("Fetching products from Supabase...");
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name, category, description, features');

  if (fetchError) {
    console.error("Error fetching products:", fetchError);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log("No products found in the database.");
    return;
  }

  console.log(`Found ${products.length} products. Generating embeddings...`);

  for (const product of products) {
    const textToEmbed = `Name: ${product.name}\nCategory: ${product.category}\nDescription: ${product.description}\nFeatures: ${(product.features || []).join(', ')}`;
    console.log(`Generating embedding for Product ID ${product.id}: "${product.name}"...`);

    try {
      const embedding = await getEmbedding(textToEmbed);
      
      console.log(`Uploading embedding for Product ID ${product.id} (dimension size: ${embedding.length})...`);
      const { error: updateError } = await supabase
        .from('products')
        .update({ embedding })
        .eq('id', product.id);

      if (updateError) {
        console.error(`Error updating embedding for Product ID ${product.id}:`, updateError);
      } else {
        console.log(`Successfully updated embedding for Product ID ${product.id}!`);
      }
    } catch (err: any) {
      console.error(`Failed to process Product ID ${product.id}:`, err.message);
    }
  }

  console.log("All products processed.");
}

run();
