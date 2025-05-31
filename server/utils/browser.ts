import { HTTPResponse } from '@cloudflare/puppeteer';

export const getBrowserHtml = defineCachedFunction(async (url: string): Promise<string> => {
  const { page } = await hubBrowser()
  await page.setCacheEnabled(false)

  await page.goto(url, { waitUntil: 'networkidle0' })

  const html = await page.content();

  await page.close();

  return html;
}, {
  name: 'getBrowserHtml',
  maxAge: 1000 * 60 * 60, // 1 hour
})

export const getBrowserResponse = defineCachedFunction(async (url: string): Promise<ReturnType<typeof serializeResponse>> => {
  const { page } = await hubBrowser()
  await page.setCacheEnabled(false)

  const response = await page.goto(url, { waitUntil: 'load' })
  if (!response) throw new Error(`Failed to fetch ${url}`)

  const serializedResponse = await serializeResponse(response);

  await page.close();

  return serializedResponse;
}, {
  name: 'getBrowserResponse',
  maxAge: 1000 * 60 * 60, // 1 hour
})

async function serializeResponse(response: HTTPResponse) {
  // pull out headers into a plain object
  const headers: Record<string,string> = {};
  for (const [key, value] of Object.entries(response.headers())) {
    headers[key] = value;
  }

  // Check if response is a redirect (status codes 300-399)
  const isRedirect = response.status() >= 300 && response.status() < 400;
  
  // Only try to get the body for non-redirect responses
  const body = isRedirect ? '' : await response.text();

  return {
    status: response.status(),            // e.g. 200, 404
    statusText: response.statusText(),    // e.g. "OK", "Not Found"
    url: response.url(),
    ok: response.ok(),
    headers,
    body,
  };
}
