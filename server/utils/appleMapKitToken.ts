import { SignJWT, importPKCS8 } from 'jose'
interface TokenCache {
  accessToken: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

function base64ToUtf8(base64: string) {
  const binaryString = atob(base64);
  const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}

export async function generateAppleMapKitToken(): Promise<string> {
  const config = useRuntimeConfig()
  
  // Check if we have environment variables for generating tokens
  const teamId = config.appleMapkitTeamId
  const keyId = config.appleMapkitKeyId
  const privateKey = config.appleMapkitPrivateKey ? base64ToUtf8(config.appleMapkitPrivateKey) : undefined
  
  if (!teamId || !keyId || !privateKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing Apple MapKit configuration',
    })
  }
  
  // Check if we have a valid cached access token
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now + 60000) { // 1 minute buffer
    return tokenCache.accessToken
  }
  
  // Generate authorization token (JWT)
  const issuedAt = Math.floor(now / 1000)
  const expiresAt = issuedAt + (60 * 60) // 1 hour from now
  
  const payload = {
    iss: teamId,
    iat: issuedAt,
    exp: expiresAt,
  }
  
  const header = {
    kid: keyId,
    typ: 'JWT',
    alg: 'ES256',
  }
  
  try {
    // Generate JWT authorization token
    const authorizationToken = await new SignJWT(payload)
      .setProtectedHeader(header)
      .sign(await importPKCS8(privateKey, 'ES256'))
    
    // Exchange authorization token for access token
    const tokenData = await $fetch('https://maps-api.apple.com/v1/token', {
      headers: {
        'Authorization': `Bearer ${authorizationToken}`,
      },
    })
    
    if (!tokenData.accessToken) {
      throw createError({
        statusCode: 500,
        statusMessage: 'No access token received from Apple Maps API',
      })
    }
    
    // Cache the access token (assume it expires in 50 minutes to be safe)
    tokenCache = {
      accessToken: tokenData.accessToken,
      expiresAt: now + (50 * 60 * 1000), // 50 minutes from now in milliseconds
    }
    
    return tokenData.accessToken
  } catch (error) {
    console.error('Failed to generate Apple MapKit access token:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate Apple MapKit access token'
    })
  }
} 