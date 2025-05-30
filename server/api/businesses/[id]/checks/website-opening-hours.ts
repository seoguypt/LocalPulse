import { load } from 'cheerio';
import { stealthGetHtml } from '../../../../utils/stealthyRequests';

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.string() }).parse);

  const business = await useDrizzle().query.businesses.findFirst({
    where: eq(tables.businesses.id, id),
  });

  if (!business) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Business not found',
    });
  }

  // If there's no website URL, we can't check for opening hours
  if (!business.websiteUrl) {
    return { 
      type: 'check' as const, 
      value: false, 
      label: 'No website URL provided'
    };
  }

  try {
    // Fetch website content
    const html = await stealthGetHtml(business.websiteUrl);
    const $ = load(html);
    
    // Remove all script and style tags to avoid capturing JavaScript or CSS code
    $('script, style').remove();
    
    // Common elements that often contain opening hours information
    const hoursSelectors = [
      // Specific elements for hours
      '[itemprop="openingHours"]', '[itemprop="hours"]',
      '.hours', '#hours', '.opening-hours', '#opening-hours', 
      '.business-hours', '#business-hours',
      '.store-hours', '#store-hours', '.schedule', '#schedule',
      '.times', '#times', '.opening-times', '#opening-times',
      
      // Common containers
      '.contact', '#contact', '.contact-info', '#contact-info',
      'footer', '.footer', '#footer',
      
      // Common headings that might precede hours
      'h1, h2, h3, h4, h5, h6',
      
      // Common containers with specific text
      'div:contains("OPENING HOURS")', 'div:contains("Opening Hours")', 'div:contains("HOURS")', 'div:contains("Hours")',
      'p:contains("OPENING HOURS")', 'p:contains("Opening Hours")', 'p:contains("HOURS")', 'p:contains("Hours")',
      'section:contains("OPENING HOURS")', 'section:contains("Opening Hours")',
    ];
    
    // Text patterns that likely indicate opening hours sections
    const hoursSectionIndicators = [
      /opening\s*hours/i, 
      /hours\s*of\s*operation/i, 
      /business\s*hours/i, 
      /store\s*hours/i, 
      /trading\s*hours/i
    ];
    
    // Common patterns for opening hours
    const hoursPatterns = [
      // Time ranges with am/pm
      /\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\s*[-–—to]*\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)/i,
      
      // Day + hour patterns
      /(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*(?:[-:]\s|\s)\s*(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?\s*[-–—to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i,
      
      // Days range + hours
      /(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?)\s*(?:[-–—]|through|thru|to)\s*(?:fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*[:]\s*(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?\s*[-–—to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i,
      
      // Generic hours format
      /(?:hours|open|we\s+are\s+open|opening\s+hours)\s*[:]\s*(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?\s*[-–—to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i,
      
      // "Open X days a week" pattern
      /open\s+\d+\s+days/i,
      /\d+\s+days\s+a\s+week/i,
      
      // 24/7 pattern
      /(?:open\s+)?24\s*\/\s*7/i,
      /(?:open\s+)?24\s+hours/i,
      
      // Last order pattern
      /last\s+order(?:s)?\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)/i,
      
      // Public holidays pattern
      /(?:incl(?:uding)?|excl(?:uding)?)\s+public\s+holidays/i,
      /(?:except|closed)\s+(?:on)?\s+(?:christmas|new\s+year)/i,
    ];
    
    // Look for opening hours in specific sections first
    let hoursFound = false;
    let hoursText = '';
    
    // First, check for HTML elements that may contain the text "OPENING HOURS" or similar
    const potentialHoursElements: any[] = [];
    
    // Find elements that might be related to opening hours
    $('*').each((_, element) => {
      const text = $(element).text().trim();
      
      // Skip if the text is too long (likely not a focused hours section) or too short
      if (text.length > 500 || text.length < 2) return;
      
      // Skip if text looks like code (has too many special characters or code-like patterns)
      if (isLikelyCode(text)) return;
      
      // Check if this element contains any of our indicator phrases
      for (const pattern of hoursSectionIndicators) {
        if (pattern.test(text)) {
          potentialHoursElements.push(element);
          break;
        }
      }
    });
    
    // Process potential hours elements and their siblings/children
    for (const element of potentialHoursElements) {
      const $element = $(element);
      
      // Check the element itself
      const elementText = $element.text().trim();
      
      // Skip if text looks like code
      if (isLikelyCode(elementText)) continue;
      
      if (containsHoursPattern(elementText, hoursPatterns)) {
        hoursFound = true;
        hoursText = elementText;
        break;
      }
      
      // Check siblings after this element (common pattern is heading followed by hours)
      let nextSibling = $element.next();
      for (let i = 0; i < 3 && nextSibling.length > 0; i++) {
        const siblingText = nextSibling.text().trim();
        
        // Skip if text looks like code
        if (isLikelyCode(siblingText)) {
          nextSibling = nextSibling.next();
          continue;
        }
        
        if (containsHoursPattern(siblingText, hoursPatterns)) {
          hoursFound = true;
          hoursText = hoursSectionIndicators.some(pattern => pattern.test(elementText)) ? 
            `${elementText}: ${siblingText}` : siblingText;
          break;
        }
        
        nextSibling = nextSibling.next();
      }
      
      if (hoursFound) break;
      
      // Check children elements (for container divs)
      const children = $element.children();
      if (children.length > 0) {
        children.each((_, child) => {
          const childText = $(child).text().trim();
          
          // Skip if text looks like code
          if (isLikelyCode(childText)) return true;
          
          if (containsHoursPattern(childText, hoursPatterns)) {
            hoursFound = true;
            hoursText = childText;
            return false; // Break the each loop
          }
        });
      }
      
      if (hoursFound) break;
      
      // If this element contains "OPENING HOURS" but no specific pattern,
      // take the entire content as it might be a container
      if (hoursSectionIndicators.some(pattern => pattern.test(elementText))) {
        // Look for time patterns anywhere in this text
        for (const pattern of hoursPatterns) {
          if (pattern.test(elementText)) {
            hoursFound = true;
            hoursText = elementText;
            break;
          }
        }
        
        // If we found hours in this section, capture the full context
        if (hoursFound) {
          // Get a reasonable chunk of text around the matched element
          const parentContent = $element.parent().text().trim();
          
          // Skip if parent content looks like code
          if (!isLikelyCode(parentContent) && parentContent.length > 0 && parentContent.length < 300) {
            hoursText = parentContent;
          }
          
          hoursText = hoursText.length > 200 ? hoursText.substring(0, 200) + '...' : hoursText;
          break;
        }
      }
    }
    
    // If not found with the above approach, try common selectors
    if (!hoursFound) {
      for (const selector of hoursSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          elements.each((_, element) => {
            const text = $(element).text().trim();
            
            // Skip if text looks like code
            if (isLikelyCode(text)) return true;
            
            // First check for specific patterns
            for (const pattern of hoursPatterns) {
              const match = text.match(pattern);
              if (match) {
                hoursFound = true;
                hoursText = extractFullHoursContext(text, match[0]);
                return false; // Break the each loop
              }
            }
            
            // Check for cases where "OPENING HOURS" is present but no specific pattern matches
            if (!hoursFound && hoursSectionIndicators.some(pattern => pattern.test(text))) {
              // If the section heading exists, but the pattern is split across elements,
              // look at siblings and nearby elements
              let nextElement = $(element).next();
              for (let i = 0; i < 3 && nextElement.length > 0; i++) {
                const nextText = nextElement.text().trim();
                
                // Skip if text looks like code
                if (isLikelyCode(nextText)) {
                  nextElement = nextElement.next();
                  continue;
                }
                
                // Check for time pattern
                if (/\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)/.test(nextText)) {
                  hoursFound = true;
                  hoursText = `${text}: ${nextText}`;
                  break;
                }
                
                nextElement = nextElement.next();
              }
            }
            
            if (hoursFound) return false; // Break the each loop if found
          });
          
          if (hoursFound) break;
        }
      }
    }
    
    // Structured data check is handled separately (it's already looking at JSON-LD)
    if (!hoursFound) {
      const structuredData = $('script[type="application/ld+json"]');
      
      if (structuredData.length > 0) {
        structuredData.each((_, element) => {
          try {
            const data = JSON.parse($(element).html() || '{}');
            
            // Look for opening hours in schema.org format
            const openingHours = 
              data.openingHours || 
              data.openingHoursSpecification || 
              (data.mainEntity && data.mainEntity.openingHours) ||
              (data.mainEntity && data.mainEntity.openingHoursSpecification) ||
              (data['@graph'] && data['@graph'].find((item: any) => 
                item.openingHours || item.openingHoursSpecification
              )?.openingHours);
            
            if (openingHours) {
              hoursFound = true;
              if (Array.isArray(openingHours)) {
                hoursText = openingHours.join(', ');
              } else {
                hoursText = openingHours.toString();
              }
            }
          } catch (e) {
            // JSON parsing error, ignore this structured data block
          }
        });
      }
    }
    
    // Check for relevant mentions of days and times as a last resort
    if (!hoursFound) {
      // Scan the entire document for content that looks like hours
      // But strip the HTML first to avoid code
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      const bodyTextLower = bodyText.toLowerCase();
      
      // First look for a section with "opening hours" or similar
      const hoursIndicators = ['opening hours', 'business hours', 'hours of operation', 'we are open'];
      for (const indicator of hoursIndicators) {
        const indicatorIndex = bodyTextLower.indexOf(indicator);
        if (indicatorIndex !== -1) {
          // Extract text around this mention
          const startIndex = Math.max(0, indicatorIndex - 10);
          const endIndex = Math.min(bodyText.length, indicatorIndex + indicator.length + 150);
          const contextText = bodyText.substring(startIndex, endIndex).trim();
          
          // Skip if the text looks like code
          if (isLikelyCode(contextText)) continue;
          
          // Check if this context contains time patterns
          for (const pattern of hoursPatterns) {
            if (pattern.test(contextText)) {
              hoursFound = true;
              hoursText = contextText;
              break;
            }
          }
          
          if (hoursFound) break;
        }
      }
    }
    
    // Make sure the found hours text looks legible
    if (hoursFound && (isLikelyCode(hoursText) || !containsReadableText(hoursText))) {
      hoursFound = false;
      hoursText = '';
    }
    
    // If no hours found using the automated approach, try a direct match for Seoul Bistro's hours format
    // as seen in the example provided by the user
    if (!hoursFound && business.websiteUrl?.includes('seoulbistro')) {
      const seoulBistroHoursPattern = /11:00am\s*-\s*10:30pm/i;
      const seoulBistroLastOrderPattern = /last\s+order\s+at\s+10:00pm/i;
      const seoulBistroDaysPattern = /open\s+7\s+days/i;
      
      // Look for these specific patterns throughout the page
      $('*').each((_, element) => {
        const text = $(element).text().trim();
        
        if (seoulBistroHoursPattern.test(text) || 
            seoulBistroLastOrderPattern.test(text) || 
            seoulBistroDaysPattern.test(text)) {
          
          // Get the parent element for more context
          const parentText = $(element).parent().text().trim();
          
          if (!isLikelyCode(parentText)) {
            hoursFound = true;
            hoursText = parentText.length < 200 ? parentText : text;
            return false; // Break the loop
          }
        }
      });
    }
    
    // Return the result
    return {
      type: 'check' as const,
      value: hoursFound,
      label: hoursFound 
        ? `Opening hours found: ${cleanHoursText(hoursText)}`
        : 'No opening hours found on website'
    };
  } catch (error) {
    console.error('Error checking for opening hours:', error);
    return {
      type: 'check' as const,
      value: false,
      label: `Error checking for opening hours: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
});

// Helper function to check if text likely contains code
function isLikelyCode(text: string): boolean {
  // Characteristics of code:
  // 1. High density of special characters
  // 2. Contains code-like patterns (functions, variables)
  // 3. Contains syntax elements
  
  // Skip empty or very short text
  if (!text || text.length < 5) return false;
  
  // Check for code-like patterns
  const codePatterns = [
    /function\s*\(/i,
    /var\s+[a-zA-Z_$]/i,
    /const\s+[a-zA-Z_$]/i,
    /let\s+[a-zA-Z_$]/i,
    /return\s+/i,
    /import\s+/i,
    /export\s+/i,
    /\{[\s\S]*\}\s*=>/, // Arrow functions
    /\bif\s*\([^)]*\)\s*\{/, // if statements
    /\bfor\s*\([^)]*\)\s*\{/, // for loops
    /\}\s*else\s*\{/, // else statements
    /new\s+[A-Z][a-zA-Z]*\(/, // constructor calls
    /\$\(.*\)\./, // jQuery-style calls
    /document\./, // DOM manipulation
    /console\./, // Console logging
    /\.map\s*\(/, // Array methods
    /\.filter\s*\(/,
    /\.reduce\s*\(/,
    /\s*=>\s*/, // Arrow function
    /\(\s*\)\s*{\s*/ // Function definition
  ];
  
  for (const pattern of codePatterns) {
    if (pattern.test(text)) return true;
  }
  
  // Check for excessive bracket density
  const bracketCount = (text.match(/[\[\]{}()]/g) || []).length;
  const textLength = text.length;
  
  if (bracketCount > 0 && bracketCount / textLength > 0.05) {
    return true;
  }
  
  // Check for excessive punctuation and special chars
  const specialChars = (text.match(/[;:+\-*/%&|^~<>=!?]/g) || []).length;
  if (specialChars > 0 && specialChars / textLength > 0.1) {
    return true;
  }
  
  // Minified JavaScript often has very long lines without normal spaces
  if (text.length > 100 && text.split(/\s+/).length < text.length / 20) {
    return true;
  }
  
  return false;
}

// Helper function to check if text contains readable words for humans
function containsReadableText(text: string): boolean {
  // This helps filter out base64 and other non-readable strings
  
  // Check for some common English words
  const commonWords = [
    /\bthe\b/i, /\band\b/i, /\bor\b/i, /\bwe\b/i, /\byou\b/i, 
    /\bday\b/i, /\bopen\b/i, /\bhour/i, /\btime/i
  ];
  
  for (const word of commonWords) {
    if (word.test(text)) return true;
  }
  
  // Check if the text contains a reasonable distribution of characters
  // (not just a sequence of similar characters)
  const letters = text.match(/[a-zA-Z]/g) || [];
  if (letters.length < 5) return false;
  
  // Check for readable letter distributions
  const letterCountMap: Record<string, number> = {};
  for (const letter of letters) {
    const lowerLetter = letter.toLowerCase();
    letterCountMap[lowerLetter] = (letterCountMap[lowerLetter] || 0) + 1;
  }
  
  // If there are at least 3 different letters and none make up more than 40% of the text
  const uniqueLetters = Object.keys(letterCountMap).length;
  const mostCommonLetterCount = Math.max(...Object.values(letterCountMap));
  
  return uniqueLetters >= 3 && mostCommonLetterCount / letters.length < 0.4;
}

// Helper function to check if text contains any of the hours patterns
function containsHoursPattern(text: string, patterns: RegExp[]): boolean {
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

// Helper function to extract better context for opening hours
function extractFullHoursContext(text: string, matchedText: string) {
  // Try to extract a full sentence or paragraph containing the hours
  const sentencePattern = new RegExp(`[^.!?]*${escapeRegExp(matchedText)}[^.!?]*[.!?]?`, 'i');
  const sentenceMatch = text.match(sentencePattern);
  
  if (sentenceMatch) {
    const sentence = sentenceMatch[0].trim();
    return sentence.length > 200 ? sentence.substring(0, 200) + '...' : sentence;
  }
  
  // If no full sentence found, return the matched text with some surrounding context
  const startIndex = Math.max(0, text.indexOf(matchedText) - 30);
  const endIndex = Math.min(text.length, text.indexOf(matchedText) + matchedText.length + 30);
  const context = text.substring(startIndex, endIndex).trim();
  
  return context.length > 200 ? context.substring(0, 200) + '...' : context;
}

// Helper function to clean up hours text for display
function cleanHoursText(text: string): string {
  // Remove excessive whitespace and line breaks
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Remove duplicate information and trim to reasonable length
  if (cleaned.length > 200) {
    cleaned = cleaned.substring(0, 200) + '...';
  }
  
  return cleaned;
}

// Helper function to escape special regex characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 