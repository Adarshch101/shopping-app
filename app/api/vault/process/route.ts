import { type NextRequest } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'path';
import { pathToFileURL } from 'url';

export const dynamic = 'force-dynamic';

interface PineconeMetadata {
  fileName: string;
  fileType: string;
  content: string;
  chunkCharacter: number;
  [key: string]: string | number | boolean | string[];
}

// sliding window chunking logic
function splitTextIntoChunks(text: string, chunkSize = 500, chunkOverlap = 100): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  // Cleanup whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;
    
    if (endIndex < cleanText.length) {
      const lastSpace = cleanText.lastIndexOf(' ', endIndex);
      if (lastSpace > startIndex) {
        endIndex = lastSpace;
      }
    }
    
    chunks.push(cleanText.substring(startIndex, endIndex).trim());
    startIndex = endIndex - chunkOverlap;
    
    if (startIndex >= cleanText.length || endIndex >= cleanText.length) break;
  }
  return chunks.filter(c => c.length > 10);
}

// Generate embeddings via Nvidia NIM API
async function generateEmbeddingsInBatches(chunks: string[], apiKey: string): Promise<number[][]> {
  const embeddings: number[][] = [];
  const batchSize = 10; // Process in small batches to avoid payload limits

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    const res = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nvidia/llama-nemotron-embed-1b-v2',
        input: batch,
        encoding_format: 'float',
        input_type: 'passage'
      })
    });

    if (!res.ok) {
      throw new Error(`Nvidia embedding API error: ${res.status} - ${await res.text()}`);
    }

    const body = await res.json();
    const batchEmbeddings = body.data.map((d: { embedding: number[] }) => d.embedding);
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileUrl } = await request.json();
    if (!fileName || typeof fileName !== 'string') {
      return Response.json({ error: 'File name is required' }, { status: 400 });
    }
    if (!fileUrl || typeof fileUrl !== 'string') {
      return Response.json({ error: 'File URL is required' }, { status: 400 });
    }

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized: User ID is required' }, { status: 401 });
    }

    const nemotronApiKey = process.env.NEMOTRON_API_KEY;
    if (!nemotronApiKey) {
      return Response.json({ error: 'NEMOTRON_API_KEY is not configured on the server' }, { status: 500 });
    }

    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const pineconeIndexName = process.env.PINECONE_INDEX;

    if (!pineconeApiKey || !pineconeIndexName) {
      return Response.json({
        error: 'Pinecone configuration is missing. Please set PINECONE_API_KEY and PINECONE_INDEX in your server environment.'
      }, { status: 500 });
    }

    // 1. Download file from signed URL
    let buffer: Buffer;
    let fileSize: number;
    let mimeType: string;
    try {
      const downloadRes = await fetch(fileUrl);
      if (!downloadRes.ok) {
        throw new Error(`Failed to download file from URL: ${downloadRes.statusText}`);
      }
      const arrayBuffer = await downloadRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileSize = buffer.length;
      mimeType = downloadRes.headers.get('content-type') || (fileName.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Signed URL download error:", err);
      return Response.json({ error: `Failed to retrieve file from storage: ${errorMessage}` }, { status: 500 });
    }
    
    // 2. Extract text from file
    let extractedText = '';
    let pdfTitle = '';
    let pdfAuthor = '';
    let pdfSubject = '';
    let pdfKeywords = '';
    let pdfCreator = '';
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      try {
        // Set local worker path to resolve Turbopack/Webpack ESM loader issues in Next.js
        const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
        const workerUrl = pathToFileURL(workerPath).href;
        PDFParse.setWorker(workerUrl);

        const parser = new PDFParse({ data: buffer });
        const parsedPdf = await parser.getText();
        extractedText = parsedPdf.text || '';
        
        try {
          const infoResult = await parser.getInfo();
          if (infoResult?.info) {
            pdfTitle = infoResult.info.Title || '';
            pdfAuthor = infoResult.info.Author || '';
            pdfSubject = infoResult.info.Subject || '';
            pdfKeywords = infoResult.info.Keywords || '';
            pdfCreator = infoResult.info.Creator || '';
          }
        } catch (infoErr) {
          console.warn("Failed to extract PDF document info:", infoErr);
        }

        await parser.destroy();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("PDF extraction error:", err);
        return Response.json({ error: `Failed to parse PDF document: ${errorMessage}` }, { status: 500 });
      }
    } else if (extension === 'docx') {
      try {
        const parsedDocx = await mammoth.extractRawText({ buffer });
        extractedText = parsedDocx.value || '';
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("DOCX extraction error:", err);
        return Response.json({ error: `Failed to parse Word document: ${errorMessage}` }, { status: 500 });
      }
    } else {
      return Response.json({ error: `Unsupported file extension: .${extension}. Only PDF and DOCX are allowed.` }, { status: 400 });
    }

    if (!extractedText.trim()) {
      return Response.json({ error: 'No readable text content could be extracted from this document.' }, { status: 400 });
    }

    // 3. Chunk text into smaller segments
    const chunks = splitTextIntoChunks(extractedText, 600, 120);
    if (chunks.length === 0) {
      return Response.json({ error: 'Extracted text was too short to process into chunks.' }, { status: 400 });
    }

    // 4. Generate embeddings from chunks via Nvidia NIM API (Dimension: 2048)
    let embeddings: number[][];
    try {
      embeddings = await generateEmbeddingsInBatches(chunks, nemotronApiKey);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Embedding generation error:", err);
      return Response.json({ error: `Failed to generate embeddings: ${errorMessage}` }, { status: 520 });
    }

    // 5. Connect to Pinecone and Upsert vectors
    try {
      const pc = new Pinecone({ apiKey: pineconeApiKey });
      const index = pc.index(pineconeIndexName);

      // Prepare upsert payload
      const vectors = chunks.map((chunk, index) => {
        // Sanitize vector ID (Pinecone only permits ASCII characters)
        const sanitizedFileName = encodeURIComponent(fileName).replace(/%/g, '_');
        const vectorId = `${userId}-${sanitizedFileName}-${index}`;

        const metadata: PineconeMetadata = {
          fileName: `${userId}/${fileName}`,
          fileType: extension || '',
          content: chunk.replace(/\s+/g, ' ').trim(),
          chunkCharacter: chunk.length
        };

        return {
          id: vectorId,
          values: embeddings[index],
          metadata
        };
      });

      // Upsert in batches of 50 to stay within Pinecone size limits
      const upsertBatchSize = 50;
      for (let j = 0; j < vectors.length; j += upsertBatchSize) {
        const batch = vectors.slice(j, j + upsertBatchSize);
        await index.upsert({ records: batch });
      }

      console.log(`Successfully stored ${vectors.length} chunks for file ${fileName} into Pinecone.`);
      
      return Response.json({
        success: true,
        message: `Successfully processed document and saved to vector store.`,
        chunksCount: chunks.length
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Pinecone vector store error:", err);
      return Response.json({
        error: `Database connection error: Failed to save to vector store. Details: ${errorMessage}`
      }, { status: 500 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Vault document processing handler error:", error);
    return Response.json({ error: `Internal Server Error: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { fileName } = await request.json();
    if (!fileName || typeof fileName !== 'string') {
      return Response.json({ error: 'File name is required' }, { status: 400 });
    }

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized: User ID is required' }, { status: 401 });
    }

    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const pineconeIndexName = process.env.PINECONE_INDEX;

    if (!pineconeApiKey || !pineconeIndexName) {
      return Response.json({
        error: 'Pinecone is not configured. Please set PINECONE_API_KEY and PINECONE_INDEX.'
      }, { status: 500 });
    }

    const pc = new Pinecone({ apiKey: pineconeApiKey });
    const index = pc.index(pineconeIndexName);

    // Delete vectors matching fileName (user-scoped storage path)
    await index.deleteMany({
      filter: {
        fileName: { '$eq': `${userId}/${fileName}` }
      }
    });

    console.log(`Successfully deleted Pinecone vectors for file ${userId}/${fileName}`);
    return Response.json({ success: true, message: 'Vectors successfully deleted.' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Pinecone delete error:", error);
    return Response.json({ error: `Failed to remove vectors from search index: ${errorMessage}` }, { status: 500 });
  }
}
