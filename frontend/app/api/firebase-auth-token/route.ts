import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Construct the Cloud Function URL
    // We use the project ID from env vars, defaulting to the one we saw in the context
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'serverless-tek89';
    const region = 'europe-west1';
    const functionName = 'createFirebaseToken';
    const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

    console.log(`Proxying auth request to: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Cloud Function error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `Cloud Function failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in auth proxy:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
