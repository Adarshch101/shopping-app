export const dynamic = 'force-dynamic';

export async function GET() {
  // Chat messages are stored in client-side session, database is not queried
  return Response.json([]);
}

export async function DELETE() {
  // Chat messages are cleared client-side, database is not modified
  return Response.json({ success: true, message: 'Chat history cleared successfully' });
}
