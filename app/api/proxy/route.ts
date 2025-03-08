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
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
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
    console.log(`Proxy GET success, data length: ${JSON.stringify(data).length} characters`);
    
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=60' // Cache for 60 seconds
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
    console.log('Request body preview:', JSON.stringify(body).substring(0, 200) + '...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error(`Target API POST returned status: ${response.status} - ${response.statusText}`);
      try {
        // Try to get the error message from the response
        const errorData = await response.text();
        console.error('Error response:', errorData);
        
        return new Response(JSON.stringify({ 
          error: `Target API returned status: ${response.status}`,
          message: response.statusText,
          details: errorData
        }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (parseError) {
        return new Response(JSON.stringify({ 
          error: `Target API returned status: ${response.status}`,
          message: response.statusText
        }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const data = await response.json();
    console.log(`Proxy POST success, response preview:`, JSON.stringify(data).substring(0, 200) + '...');
    
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Proxy POST error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch from the target URL',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
