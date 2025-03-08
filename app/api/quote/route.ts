// app/api/quote/route.ts - Updated with correct API format
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Extract the request body
    const body = await request.json();
    
    // Get the network ID from the request or use a default
    const networkId = body.networkId || 10; // Default to Optimism if not specified
    
    // Correct endpoint for quotes based on the documentation
    const apiUrl = `https://overtimemarketsv2.xyz/overtime-v2/networks/${networkId}/quote`;
    
    console.log('Sending quote request to:', apiUrl);
    console.log('Quote request data:', JSON.stringify(body.tradeData, null, 2));
    
    // Make the request to the Overtime Markets API with the correct body format
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
    console.log('Quote API response:', JSON.stringify(data, null, 2));
    
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
