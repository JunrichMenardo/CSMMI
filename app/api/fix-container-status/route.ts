import { fixContainerStatuses } from '@/lib/fixContainerStatus';

export async function POST(request: Request) {
  try {
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.SEED_API_KEY || 'seed-key-123'}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await fixContainerStatuses();

    return Response.json({
      success: true,
      message: 'Container statuses have been fixed based on automatic logic',
    });
  } catch (error) {
    console.error('Error fixing container statuses:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
