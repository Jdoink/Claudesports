// app/api/proxy/route.ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Proxying GET request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': 'https://overtimemarketsv2.xyz',
        'Referer': 'https://overtimemarketsv2.xyz/',
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!response.ok) {
      console.error(`Target API returned status: ${response.status} - ${response.statusText}`);
      return new Response(JSON.stringify({ 
        error: `Target API returned status: ${response.status}`,
        message: response.statusText 
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log(`Proxy GET success, data snippet:`, JSON.stringify(data).substring(0, 200) + '...');
    
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=60', // Cache for 60 seconds
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Proxy GET error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch from the target URL',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the request body
    const body = await request.json();
    
    console.log(`Proxying POST request to: ${url}`);
    console.log('Request body:', JSON.stringify(body));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': 'https://overtimemarketsv2.xyz',
        'Referer': 'https://overtimemarketsv2.xyz/'
      },
      body: JSON.stringify(body)
    });

    // Try to get response text regardless of status
    let responseText = '';
    try {
      responseText = await response.text();
    } catch (textError) {
      console.error('Error getting response text:', textError);
    }

    if (!response.ok) {
      console.error(`Target API POST returned status: ${response.status} - ${response.statusText}`);
      console.error('Error response:', responseText);
      
      return new Response(JSON.stringify({ 
        error: `Target API returned status: ${response.status}`,
        message: response.statusText,
        responseText: responseText
      }), {
        status: 500, // Return 500 to our client to prevent cascading errors
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    let data = {};
    try {
      // Try to parse the response as JSON
      if (responseText) {
        data = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Error parsing response as JSON:', parseError);
      console.error('Raw response:', responseText);
      
      // If we can't parse as JSON, return the raw text
      return new Response(JSON.stringify({ 
        error: 'Failed to parse response as JSON',
        rawResponse: responseText
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`Proxy POST success, response:`, JSON.stringify(data).substring(0, 200) + '...');
    
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Proxy POST error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process POST request',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204, // No content
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    }
  });
}
