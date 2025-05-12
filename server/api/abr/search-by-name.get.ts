import { Parser } from 'xml2js';

// Define schema for search results
export const abnSearchByNameResultSchema = z.object({
  name: z.string(),
  ABN: z.string(),
  postcode: z.string().nullable(),
  stateCode: z.string().nullable(),
  score: z.number().optional(),
});

const fetchAbrData = defineCachedFunction(async (businessName: string, abrGuid: string) => {
  return $fetch(`https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/ABRSearchByNameAdvancedSimpleProtocol2017?name=${encodeURIComponent(businessName)}&postcode=&legalName=&tradingName=&businessName=&activeABNsOnly=Y&NSW=&SA=&ACT=&VIC=&WA=&NT=&QLD=&TAS=&authenticationGuid=${abrGuid}&searchWidth=narrow&minimumScore=95&maxSearchResults=`, {
    responseType: 'text',
  });
}, {
  name: 'fetchAbrName',
  maxAge: 60 * 60, // Cache for 1 hour (in seconds) 
});

export default defineEventHandler(async (event) => {
  const { businessName } = await getValidatedQuery(event, z.object({
    businessName: z.string().min(1, 'Business name is required'),
  }).parse);

  if (!businessName || typeof businessName !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Business name is required',
    });
  }

  const { abrGuid } = useRuntimeConfig(event);

  // Fetch XML data from ABR API
  const xmlResponse = await fetchAbrData(businessName, abrGuid);
  
  // Parse XML to JS object using xml2js
  const parser = new Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(String(xmlResponse));
  
  // Extract search results from XML structure
  const searchResults = result?.ABRPayloadSearchResults?.response?.searchResultsList?.searchResultsRecord || [];
  
  // Ensure searchResults is an array (xml2js returns a single object if there's only one result)
  const resultsArray = Array.isArray(searchResults) ? searchResults : [searchResults];
  
  // Transform results into the requested format
  const formattedResults: AustralianBusinessRegistarSearchResult[] = resultsArray.map(record => {
    const nameInfo = record.businessName || record.mainTradingName || record.legalName || record.mainName || {};
    const name = nameInfo.organisationName || nameInfo.fullName || '';
    const score = nameInfo.score ? parseInt(nameInfo.score, 10) : undefined;
    
    return abnSearchByNameResultSchema.parse({
      name,
      ABN: record.ABN?.identifierValue || '',
      postcode: record.mainBusinessPhysicalAddress?.postcode || null,
      stateCode: record.mainBusinessPhysicalAddress?.stateCode || null,
      score,
    });
  });
  
  // Sort by score in descending order if available
  formattedResults.sort((a, b) => {
    if (a.score !== undefined && b.score !== undefined) {
      return b.score - a.score;
    }
    return 0;
  });

  return formattedResults;
});