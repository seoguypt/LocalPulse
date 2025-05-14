import { defineEventHandler, getValidatedQuery } from "h3";
import { z } from "zod";
import { load } from "cheerio";
import { stealthFetch } from "../utils/stealthFetch";

// Schema for validating the URL query parameter
const MetaQuerySchema = z.object({
  url: z.string().url("Invalid URL format")
});

/**
 * Extract metadata (title and description) from HTML content
 */
function extractMeta(html: string) {
  const $ = load(html);
  
  return {
    title: $('title').text().trim(),
    description: $('meta[name="description"]').attr('content') ?? ''
  };
}

export default defineEventHandler(async (event) => {
  try {
    // Validate the URL query parameter
    const query = await getValidatedQuery(event, MetaQuerySchema.parse);
    const url = query.url;
    
    // Fetch the HTML content stealthily
    const html = await stealthFetch(url);
    
    // Extract and return metadata
    const metadata = extractMeta(html);
    
    // If both title and description are empty, consider it a valid request but no content
    if (!metadata.title && !metadata.description) {
      return {
        statusCode: 204,
        message: "No metadata found"
      };
    }
    
    return {
      url,
      ...metadata,
    };
  } catch (error) {
    // Handle validation errors (H3 handles these automatically)
    if (error instanceof z.ZodError) {
      throw error;
    }
    
    // Handle fetch errors
    if (error instanceof Error && error.message.includes("Failed to fetch URL")) {
      return {
        statusCode: 502,
        message: "Failed to fetch content from the provided URL",
        error: error.message
      };
    }
    
    // Handle other errors
    return {
      statusCode: 500,
      message: "An error occurred while processing the request",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}); 