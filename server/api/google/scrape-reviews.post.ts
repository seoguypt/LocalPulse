import puppeteer from 'puppeteer'

interface ReviewWithReply {
  author: string
  rating: number
  text: string
  date: string
  ownerReply?: {
    text: string
    date: string
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { placeId } = body

  if (!placeId) {
    throw createError({
      statusCode: 400,
      message: 'placeId is required'
    })
  }

  let browser
  try {
    // Launch browser with anti-detection settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080'
      ]
    })

    const page = await browser.newPage()
    
    // Hide automation indicators
    await page.evaluateOnNewDocument(() => {
      // Override the navigator.webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      })
      
      // Mock plugins and languages
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      })
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      })
    })
    
    // Set viewport and user agent to look like a real browser
    await page.setViewport({ width: 1920, height: 1080 })
    
    // Use a more recent Chrome user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    
    // Set additional headers to look more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    })

    // Navigate to Google Maps place
    // Using the standard place URL format with English language parameter
    const url = `https://www.google.com/maps/place/?q=place_id:${placeId}&hl=en`
    console.log('Navigating to:', url)
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    })

    // Wait longer for page to fully load and render
    console.log('Waiting for page to fully load...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Check for and accept terms/consent popup (appears in some regions)
    try {
      console.log('Checking for consent/terms popup...')
      
      // Look for "Accept all" or "Acceptă tot" button (multiple languages)
      const acceptButtons = await page.$$('button')
      let foundConsent = false
      for (const button of acceptButtons) {
        const text = await page.evaluate(el => el.textContent?.toLowerCase(), button)
        // Check for accept/agree in multiple languages
        if (text?.includes('accept') || text?.includes('acceptă') || text?.includes('agree') || 
            text?.includes('consimț') || text?.includes('aceptar') || text?.includes('akzeptieren')) {
          console.log(`Found consent button with text: "${text}", clicking...`)
          await button.click()
          await new Promise(resolve => setTimeout(resolve, 2000))
          foundConsent = true
          break
        }
      }
      
      if (foundConsent) {
        console.log('Consent accepted, page should now be accessible')
      }
      
      // Alternative: Look for form with consent buttons
      const forms = await page.$$('form')
      for (const form of forms) {
        const formText = await page.evaluate(el => el.textContent?.toLowerCase(), form)
        if (formText?.includes('cookie') || formText?.includes('consent') || formText?.includes('acces')) {
          const buttons = await form.$$('button')
          if (buttons.length > 0) {
            console.log('Found consent form, clicking first button...')
            await buttons[buttons.length - 1].click() // Usually "Accept all" is last
            await new Promise(resolve => setTimeout(resolve, 2000))
            break
          }
        }
      }
    } catch (e) {
      console.log('No consent popup found or error handling it:', e)
    }
    
    // Wait for reviews section to load
    await page.waitForSelector('[role="main"]', { timeout: 10000 })
    
    console.log('Page loaded, looking for reviews tab...')
    
    // Click ALL "See original" buttons to show original language instead of translations
    try {
      console.log('Looking for translation buttons...')
      let clickedCount = 0
      
      // Try multiple times to catch dynamically loaded buttons
      for (let attempt = 0; attempt < 2; attempt++) {
        const buttons = await page.$$('button')
        for (const button of buttons) {
          try {
            const text = await page.evaluate(el => el.textContent?.toLowerCase(), button)
            if (text?.includes('original') || text?.includes('origineel') || text?.includes('see original')) {
              await button.click()
              clickedCount++
              await new Promise(resolve => setTimeout(resolve, 300))
            }
          } catch (e) {
            // Button might not be clickable, continue
          }
        }
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      console.log(`Clicked ${clickedCount} "See original" buttons`)
    } catch (e) {
      console.log('Error clicking translation buttons:', e)
    }
    
    // Try to find and click reviews tab - multiple strategies
    try {
      // Strategy 1: Look for Reviews button
      let reviewsButton = await page.$('button[aria-label*="Reviews"]')
      
      // Strategy 2: Look for tab with "Reviews" text
      if (!reviewsButton) {
        const buttons = await page.$$('button')
        for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent, button)
          if (text?.includes('Reviews') || text?.includes('reviews')) {
            reviewsButton = button
            break
          }
        }
      }
      
      // Strategy 3: Look for tabs with review count
      if (!reviewsButton) {
        const tabs = await page.$$('[role="tab"]')
        for (const tab of tabs) {
          const text = await page.evaluate(el => el.textContent, tab)
          if (text?.match(/\d+\s*review/i)) {
            reviewsButton = tab
            break
          }
        }
      }
      
      if (reviewsButton) {
        console.log('Found reviews button, clicking...')
        await reviewsButton.click()
        // Wait longer for reviews to load after clicking
        await new Promise(resolve => setTimeout(resolve, 5000))
        console.log('Clicked reviews tab, waiting for content to load...')
      } else {
        console.log('Reviews button not found, reviews may already be visible')
      }
    } catch (e) {
      console.log('Error finding reviews button:', e)
    }
    
    // Debug: Log page content structure
    const debugInfo = await page.evaluate(() => {
      const main = document.querySelector('[role="main"]')
      return {
        hasMain: !!main,
        mainHTML: main?.innerHTML.substring(0, 500),
        reviewIdElements: document.querySelectorAll('[data-review-id]').length,
        jsactionElements: document.querySelectorAll('div[jsaction*="review"]').length,
        ratingImages: document.querySelectorAll('[role="img"][aria-label*="star"]').length,
        allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(t => t && t.length < 50)
      }
    })
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2))

    // Expand all "More" buttons to get full review text
    try {
      console.log('Expanding truncated reviews...')
      const moreButtons = await page.$$('button')
      let expandedCount = 0
      for (const button of moreButtons) {
        const text = await page.evaluate(el => el.textContent?.toLowerCase(), button)
        if (text?.includes('more') || text?.includes('meer') || text?.includes('plus')) {
          try {
            await button.click()
            expandedCount++
            await new Promise(resolve => setTimeout(resolve, 300))
          } catch (e) {
            // Button might not be clickable, continue
          }
        }
      }
      console.log(`Expanded ${expandedCount} reviews`)
    } catch (e) {
      console.log('Error expanding reviews:', e)
    }
    
    // Scroll to load more reviews (with human-like delays)
    const scrollableDiv = await page.$('[role="main"]')
    if (scrollableDiv) {
      console.log('Scrolling to load more reviews...')
      for (let i = 0; i < 3; i++) {
        await page.evaluate((el: any) => {
          el.scrollTop = el.scrollHeight
        }, scrollableDiv)
        // Random delay between 1-2 seconds to look more human
        const delay = 1000 + Math.random() * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // Extract reviews with replies - using more generic selectors
    // @ts-ignore - Browser context code
    const reviews = await page.evaluate(() => {
      const results: any[] = []
      
      // Find review elements by data-review-id attribute
      let reviewElements = document.querySelectorAll('[data-review-id]')
      
      console.log(`Found ${reviewElements.length} review elements with data-review-id`)
      
      // If still no reviews, try one more approach - look for any div with star ratings
      if (reviewElements.length === 0) {
        const allDivs = document.querySelectorAll('div')
        const potentialReviews: any[] = []
        
        allDivs.forEach((div: any) => {
          const hasRating = div.querySelector('[role="img"][aria-label*="star"]')
          const hasText = div.textContent && div.textContent.length > 100
          if (hasRating && hasText) {
            potentialReviews.push(div)
          }
        })
        
        reviewElements = potentialReviews.slice(0, 10) // Limit to 10 to avoid duplicates
        console.log(`Fallback strategy found ${reviewElements.length} potential reviews`)
      }

      reviewElements.forEach((reviewEl: any, index: number) => {
        try {
          // Get author name - look for buttons or divs with names
          const authorEl = reviewEl.querySelector('button[aria-label]') ||
                          reviewEl.querySelector('div[aria-label]') ||
                          reviewEl.querySelector('a[aria-label]')
          const author = authorEl?.getAttribute('aria-label')?.split(',')[0] || 
                        authorEl?.textContent?.trim() || 
                        `Reviewer ${index + 1}`

          // Get rating
          const ratingEl = reviewEl.querySelector('[role="img"][aria-label*="star"]')
          const ratingText = ratingEl?.getAttribute('aria-label') || ''
          const ratingMatch = ratingText.match(/(\d+)/)
          const rating = ratingMatch ? parseInt(ratingMatch[1]) : 0

          // Get review text - look for the longest text span (usually the review content)
          const textElements = reviewEl.querySelectorAll('span')
          let text = ''
          let maxLength = 0
          
          for (const span of textElements) {
            const spanText = span.textContent?.trim() || ''
            // Skip if it's a star rating, date, button text, or translation notice
            if (spanText.length > maxLength && 
                !spanText.includes('star') && 
                !spanText.includes('ago') &&
                !spanText.toLowerCase().includes('more') &&
                !spanText.toLowerCase().includes('response') &&
                !spanText.includes('Translated by Google') &&
                !spanText.includes('(Translated by Google)') &&
                !spanText.includes('(Original)') &&
                spanText.length > 20) {
              text = spanText
              maxLength = spanText.length
            }
          }
          
          // If still no text, try getting all text from the review element
          if (!text || text.length < 20) {
            const allSpans = Array.from(textElements)
            const longSpans = allSpans
              .map((s: any) => s.textContent?.trim())
              .filter((t: any) => t && t.length > 50 && 
                      !t.includes('Translated by Google') &&
                      !t.includes('(Translated by Google)'))
            if (longSpans.length > 0) {
              text = longSpans[0] as string
            }
          }
          
          // Clean up the text - remove translation markers
          text = text.replace(/\(Translated by Google\)/g, '').trim()
          text = text.replace(/Translated by Google/g, '').trim()
          text = text.replace(/\(Original\)/g, '').trim()

          // Get date - look for relative time text
          const dateElements = reviewEl.querySelectorAll('span')
          let date = ''
          for (const span of dateElements) {
            const spanText = span.textContent?.trim() || ''
            if (spanText.match(/ago|week|month|year|day/i)) {
              date = spanText
              break
            }
          }

          // Check for owner reply - look for "Response from the owner" text
          const allText = reviewEl.textContent || ''
          
          // Debug: Log all text for first review to see structure
          if (index === 0) {
            console.log('First review all text sample:', allText.substring(0, 500))
          }
          
          const hasOwnerReply = allText.toLowerCase().includes('response from the owner') || 
                               allText.toLowerCase().includes('response from') ||
                               allText.toLowerCase().includes('reactie van') || // Dutch
                               allText.toLowerCase().includes('antwoord van') || // Dutch alternative
                               allText.toLowerCase().includes('owner') ||
                               reviewEl.querySelector('[aria-label*="Response"]') ||
                               reviewEl.querySelector('[aria-label*="response"]')
          
          let ownerReply
          if (hasOwnerReply) {
            console.log(`Review ${index + 1}: Owner reply detected in text`)
            
            // Try to extract reply text - get ALL text after "Response from"
            const spans = Array.from(reviewEl.querySelectorAll('span'))
            let foundResponse = false
            let replyText = ''
            let maxReplyLength = 0
            const replyTexts: string[] = []
            
            // First pass: Find the response header and mark its position
            let responseHeaderIndex = -1
            for (let i = 0; i < spans.length; i++) {
              const span = spans[i]
              const text = span.textContent?.trim() || ''
              const lowerText = text.toLowerCase()
              
              // Look for the response header
              if ((lowerText.includes('response from') || lowerText.includes('reactie van') || 
                   lowerText.includes('antwoord van')) && text.length < 100) {
                responseHeaderIndex = i
                console.log(`Found response header at span ${i}: "${text}"`)
                break
              }
            }
            
            // Second pass: Get text AFTER the response header
            if (responseHeaderIndex >= 0) {
              for (let i = responseHeaderIndex + 1; i < spans.length; i++) {
                const span = spans[i]
                const text = span.textContent?.trim() || ''
                const lowerText = text.toLowerCase()
                
                // Skip if it's part of the review (before the reply)
                if (text === author || text.includes('star') || text.includes('ago')) {
                  continue
                }
                
                // This should be the reply text
                if (text.length > 20 && 
                    !lowerText.includes('more') &&
                    !lowerText.includes('less') &&
                    !lowerText.includes('response from') &&
                    !lowerText.includes('reactie van')) {
                  replyTexts.push(text)
                  console.log(`Found reply candidate ${i}: ${text.substring(0, 50)}...`)
                  if (text.length > maxReplyLength) {
                    replyText = text
                    maxReplyLength = text.length
                  }
                }
              }
            }
            
            // Alternative approach: Look for divs/sections that might contain the reply
            if (replyTexts.length === 0) {
              const allDivs = reviewEl.querySelectorAll('div')
              for (const div of allDivs) {
                const divText = div.textContent?.trim() || ''
                const lowerDivText = divText.toLowerCase()
                if ((lowerDivText.includes('response') || lowerDivText.includes('reactie')) && 
                    divText.length > 50 && divText.length < 1000) {
                  // This might be the reply container
                  const divSpans = div.querySelectorAll('span')
                  for (const span of divSpans) {
                    const spanText = span.textContent?.trim() || ''
                    if (spanText.length > 30 && !spanText.toLowerCase().includes('response from')) {
                      replyTexts.push(spanText)
                    }
                  }
                }
              }
            }
            
            // If we found multiple texts, combine them or use the longest
            if (replyTexts.length > 0) {
              // Filter out the review text itself (don't include it as reply)
              const cleanTexts = replyTexts.filter(t => 
                !t.includes('Translated by Google') && 
                t.length > 20 &&
                t !== text // Don't use the review text as reply
              )
              
              if (cleanTexts.length > 0) {
                replyText = cleanTexts.reduce((a, b) => a.length > b.length ? a : b)
              } else if (replyText && replyText !== text) {
                // Clean up reply text - remove translation markers
                replyText = replyText.replace(/\(Translated by Google\)/g, '').trim()
                replyText = replyText.replace(/Translated by Google/g, '').trim()
                replyText = replyText.replace(/\(Original\)/g, '').trim()
              } else {
                replyText = '' // Reset if it's the same as review
              }
              
              if (replyText && replyText.length > 10 && replyText !== text) {
                console.log(`Review ${index + 1}: Extracted reply (${replyText.length} chars): ${replyText.substring(0, 50)}...`)
                ownerReply = {
                  text: replyText,
                  date: ''
                }
              } else {
                console.log(`Review ${index + 1}: Reply detected but extracted text was same as review or invalid. Candidates:`, replyTexts.length)
              }
            } else {
              console.log(`Review ${index + 1}: Reply detected but no candidate texts found`)
            }
          }

          if (text && text.length > 10) {
            const review = {
              author,
              rating,
              text,
              date,
              ...(ownerReply && { ownerReply })
            }
            
            // Debug log for first review
            if (results.length === 0) {
              console.log('First review sample:', {
                author,
                textLength: text.length,
                hasReply: !!ownerReply,
                replyTextLength: ownerReply?.text?.length || 0
              })
            }
            
            results.push(review)
          }
        } catch (err) {
          console.error('Error parsing review:', err)
        }
      })

      return results
    }) as ReviewWithReply[]

    console.log(`Scraped ${reviews.length} reviews (before deduplication)`)
    
    // Remove duplicates based on author + text
    const uniqueReviews = reviews.filter((review, index, self) => 
      index === self.findIndex((r) => 
        r.author === review.author && r.text === review.text
      )
    )
    
    console.log(`After deduplication: ${uniqueReviews.length} unique reviews`)
    
    // Limit to 5 most recent reviews
    const limitedReviews = uniqueReviews.slice(0, 5)
    
    console.log(`Returning ${limitedReviews.length} reviews`)
    
    // If no reviews found, take a screenshot for debugging and return it
    let debugScreenshot = null
    if (limitedReviews.length === 0) {
      try {
        debugScreenshot = await page.screenshot({ encoding: 'base64', fullPage: false })
        console.log('No reviews found. Screenshot captured for debugging')
      } catch (e) {
        console.log('Could not take screenshot:', e)
      }
    }

    return {
      success: true,
      reviews: limitedReviews,
      count: limitedReviews.length,
      ...(debugScreenshot && { debugScreenshot: `data:image/png;base64,${debugScreenshot}` })
    }

  } catch (error: any) {
    console.error('Scraping error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to scrape reviews: ${error.message}`
    })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
})
