import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { mapProduct } from '@/lib/products-mapper';
import { Product } from '@/lib/products-data';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return Response.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const userId = request.headers.get('x-user-id') || null;

    // 1. Log the user's message to the database
    const { error: userInsertError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        session_id: sessionId,
        sender: 'user',
        message: message
      });

    if (userInsertError) {
      console.error("Error inserting user message to DB", userInsertError);
    }

    // 2. Fetch only required product columns from the database (optimizing specs away)
    const { data: rawProducts, error: dbError } = await supabase
      .from('products')
      .select('id, name, description, price, category, image, rating_rate, rating_count, features, stock');

    if (dbError) {
      console.error("Database query error in chat API", dbError);
    }

    const products = (rawProducts || [])
      .map(mapProduct)
      .filter((p): p is Product => p !== null);

    const apiKey = process.env.GEMINI_API_KEY;
    let replyText = "";
    let recommendedIds: string[] = [];
    let suggestions: string[] = [];
    let usedGemini = false;

    // 3. Format product catalog context for Gemini
    const productCatalogContext = products
      .map(
        (p) =>
          `- ID: ${p.id}\n  Name: ${p.name}\n  Category: ${p.category}\n  Price: ₹${p.price}\n  Stock: ${p.stock} units\n  Features: ${p.features.join(', ')}\n  Description: ${p.description}`
      )
      .join('\n\n');

    // 4. System instructions for FAQs and conversational guidelines
    const systemInstruction = `You are "ShopNow Assist", a premium, friendly e-commerce shopping assistant for the ShopNow store. 
Your goal is to help users find products, answer questions, and assist in shopping.

FAQ Knowledge:
- Return & Refund Policy: We offer a 30-day return policy on all unused products in original packaging. Refunds are processed within 5-7 business days to the original payment method.
- Shipping & Delivery: Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Free standard shipping is provided on all orders above ₹1000. For orders below ₹1000, a flat shipping fee of ₹99 is applied.
- Order Tracking: Customers receive a tracking number via email once the order is shipped. Order status can also be viewed in the "Checkout" or "Orders" panel when logged in.
- Support Contact: Email: support@shopnow.com | Toll-free: 1800-SHOP-NOW.

Product Catalog (with current stock and price in INR):
${productCatalogContext}

Instructions:
- Always reply in a concise, friendly, and helpful tone. Format your answers nicely with bullet points where appropriate.
- Under NO circumstances suggest products that are not in the Product Catalog above.
- If the user is looking for products (e.g. asking for recommendations, looking for categories like footwear/electronics/accessories/lifestyle, or asking for items under a specific price, or searching by keyword), list their IDs in the "recommendedProductIds" array. Otherwise, keep it empty [].
- If a user asks "show me footwears" or similar, include the ID of footwear items ("7") in "recommendedProductIds".
- Suggest 2-3 logical quick-reply follow-up options for the user in the "suggestions" array. Keep these options short (under 4 words).
- You are provided with a multi-turn chat history. Make sure to refer to previous turns for context (e.g. if the user previously searched for footwear, and then asks "are they in stock?", you should know "they" refers to the footwear item you recommended in the previous turn).
- Output MUST be valid JSON matching the schema.`;

    if (apiKey) {
      try {
        // 5. Retrieve the last 2 messages from the database for contextual history (newest first, then reversed)
        const { data: rawHistory } = await supabase
          .from('chat_messages')
          .select('sender, message')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(2);

        const historyLogs = rawHistory ? [...rawHistory].reverse() : [];

        // Map DB logs to Gemini's multi-turn contents schema
        const contents = (historyLogs && historyLogs.length > 0)
          ? historyLogs.map((h) => ({
              role: h.sender === 'user' ? 'user' : 'model',
              parts: [{ text: h.message }]
            }))
          : [{
              role: 'user',
              parts: [{ text: message }]
            }];

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  reply: { type: 'STRING' },
                  recommendedProductIds: {
                    type: 'ARRAY',
                    items: { type: 'STRING' }
                  },
                  suggestions: {
                    type: 'ARRAY',
                    items: { type: 'STRING' }
                  }
                },
                required: ['reply', 'recommendedProductIds', 'suggestions']
              }
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            replyText = parsed.reply;
            recommendedIds = parsed.recommendedProductIds || [];
            suggestions = parsed.suggestions || [];
            usedGemini = true;
          }
          console.log("im using gemini url");
        } else {
          console.error("Gemini API returned error status:", response.status, await response.text());
        }
      } catch (err) {
        console.error("Gemini API call failed, falling back to rule-based matching", err);
      }
    }

    // 6. Fallback Rule-Based Matching Engine
    if (!usedGemini) {
      const lowercaseMsg = message.toLowerCase();

      // FAQ checks
      if (lowercaseMsg.includes('return') || lowercaseMsg.includes('refund') || lowercaseMsg.includes('exchange')) {
        replyText = "We offer a 30-day return policy on all unused products in their original packaging. Refunds are processed within 5-7 business days to your original payment method.";
        suggestions = ["Track my order", "Delivery charges?", "Show electronics"];
      } else if (lowercaseMsg.includes('shipping') || lowercaseMsg.includes('delivery') || lowercaseMsg.includes('charge') || lowercaseMsg.includes('delivery fee')) {
        replyText = "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Free standard shipping is provided on orders above ₹1000; otherwise, a flat fee of ₹99 applies.";
        suggestions = ["Return policy", "Support contact", "Show footwear"];
      } else if (lowercaseMsg.includes('track') || lowercaseMsg.includes('status') || lowercaseMsg.includes('where is my order')) {
        replyText = "Once shipped, you will receive an email with your tracking number. You can also monitor your order status in the 'Checkout' or 'Orders' page after logging in.";
        suggestions = ["Return policy", "Shipping charges", "Show all items"];
      } else if (lowercaseMsg.includes('contact') || lowercaseMsg.includes('support') || lowercaseMsg.includes('email') || lowercaseMsg.includes('phone') || lowercaseMsg.includes('help')) {
        replyText = "You can contact our support team via email at support@shopnow.com or by calling our toll-free line: 1800-SHOP-NOW. We are available 24/7!";
        suggestions = ["Best sellers", "Shipping policy"];
      } else {
        // Product category checks
        let matchedCategory = "";
        if (lowercaseMsg.includes('footwear') || lowercaseMsg.includes('shoe') || lowercaseMsg.includes('sneaker') || lowercaseMsg.includes('sandal') || lowercaseMsg.includes('running')) {
          matchedCategory = "Footwear";
        } else if (lowercaseMsg.includes('electronic') || lowercaseMsg.includes('headphone') || lowercaseMsg.includes('keyboard') || lowercaseMsg.includes('hub') || lowercaseMsg.includes('gadget') || lowercaseMsg.includes('anc')) {
          matchedCategory = "Electronics";
        } else if (lowercaseMsg.includes('accessor') || lowercaseMsg.includes('watch') || lowercaseMsg.includes('backpack') || lowercaseMsg.includes('bag') || lowercaseMsg.includes('chronograph')) {
          matchedCategory = "Accessories";
        } else if (lowercaseMsg.includes('lifestyle') || lowercaseMsg.includes('coffee') || lowercaseMsg.includes('bottle') || lowercaseMsg.includes('cup') || lowercaseMsg.includes('mug') || lowercaseMsg.includes('water')) {
          matchedCategory = "Lifestyle";
        }

        if (matchedCategory) {
          const matched = products.filter(p => p.category === matchedCategory);
          recommendedIds = matched.map(p => p.id);
          replyText = `Here are the items in our **${matchedCategory}** category:`;
          suggestions = ["Show electronics", "Return policy", "Shipping times"];
        } else {
          // Generic search by keyword in name/description
          const words = lowercaseMsg.split(/\s+/).filter(w => w.length > 2);
          const matched = products.filter(p =>
            words.some(word =>
              p.name.toLowerCase().includes(word) ||
              p.description.toLowerCase().includes(word) ||
              p.category.toLowerCase().includes(word)
            )
          );

          if (matched.length > 0) {
            recommendedIds = matched.map(p => p.id);
            replyText = `I found some products matching your query:`;
            suggestions = ["Shipping policy", "Return policy"];
          } else {
            replyText = "Hello! I am ShopNow Assist. I can help you search for products (e.g. 'show me footwear' or 'do you have headphones?') and answer FAQs about shipping, returns, and tracking. What can I do for you today?";
            suggestions = ["Show footwear", "Return policy", "Shipping charges"];
          }
        }
      }
    }

    // 7. Log the bot's reply and recommendations to the database
    const { error: botInsertError } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        session_id: sessionId,
        sender: 'bot',
        message: replyText,
        metadata: {
          recommendedProductIds: recommendedIds
        }
      });

    if (botInsertError) {
      console.error("Error inserting bot message to DB", botInsertError);
    }

    // 8. Build final list of recommended products
    const recommendedProducts = products.filter(p => recommendedIds.includes(p.id));

    return Response.json({
      reply: replyText,
      products: recommendedProducts,
      suggestions: suggestions
    });
  } catch (error) {
    console.error("Chatbot API endpoint error", error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
