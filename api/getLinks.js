// api/getLinks.js
// Vercel Serverless Function to securely proxy requests to NocoDB and handle pagination.

export default async function handler(request, response) {
  const { NOCODB_API_URL, NOCODB_XC_TOKEN } = process.env;

  if (!NOCODB_API_URL || !NOCODB_XC_TOKEN) {
    return response.status(500).json({ error: "Server configuration error. Missing NocoDB environment variables." });
  }

  try {
    const allRecords = [];
    let isLastPage = false;
    let offset = 0;
    const limit = 100; // Fetch 100 records per page, a reasonable size.

    // Base URL, we will manage query params ourselves.
    const baseUrl = NOCODB_API_URL.split('?')[0];
    const originalUrl = new URL(NOCODB_API_URL);

    while (!isLastPage) {
      const url = new URL(baseUrl);
      // Preserve original query params like 'where' or 'viewId'
      originalUrl.searchParams.forEach((value, key) => {
        if (key !== 'limit' && key !== 'offset') {
          url.searchParams.set(key, value);
        }
      });
      // Set pagination params for the current request
      url.searchParams.set('limit', limit);
      url.searchParams.set('offset', offset);

      const apiResponse = await fetch(url.toString(), {
        headers: {
          "xc-token": NOCODB_XC_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`Error from NocoDB API: ${apiResponse.status} ${errorText}`);
        throw new Error(`Error from NocoDB: ${apiResponse.statusText}`);
      }

      const pageData = await apiResponse.json();
      
      if (pageData && pageData.list) {
        allRecords.push(...pageData.list);
      }

      if (pageData && pageData.pageInfo) {
        isLastPage = pageData.pageInfo.isLastPage;
        offset += limit;
      } else {
        // If pageInfo is not present, assume it's a single page response and break.
        isLastPage = true;
      }
    }
    
    // Set cache headers to improve performance and reduce API calls on Vercel.
    response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=86400');
    
    // Return data in the same format as the original API, but with the complete list.
    return response.status(200).json({ list: allRecords });

  } catch (error) {
    console.error('Error fetching from NocoDB via proxy:', error);
    return response.status(500).json({ error: 'The server failed to fetch data.' });
  }
}
