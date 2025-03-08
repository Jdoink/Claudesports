// app/api/quote/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Extract the request body
    const body = await request.json();
    
    // Get the network ID from the request or use a default
    const networkId = body.networkId || 8453; // Default to Base if not specified
    
    // Construct the URL for the Overtime Markets API
    const apiUrl = `https://api.overtimemarkets.xyz/v2/networks/${networkId}/quote`;
    
    console.log('Sending request to:', apiUrl);
    console.log('Request body:', JSON.stringify(body.tradeData, null, 2));
    
    // Make the request to the Overtime Markets API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body.tradeData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from Overtime API: ${response.status}`, errorText);
      return NextResponse.json(
        { error: `Failed to get quote: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }
    
    // Parse and return the response
    const data = await response.json();
    console.log('Response from Overtime API:', JSON.stringify(data, null, 2));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Quote proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to process quote request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// We also need to handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
  });
}
