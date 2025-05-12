import { Parser } from 'xml2js';
import { createError } from 'h3';
import { z } from 'zod';

export const abnSearchByAbnResultSchema = z.object({
  abn: z.string(),
  isCurrent: z.boolean(),
  effectiveFrom: z.string(),
  type: z.string(),
  businessNames: z.array(z.string()),
  legalName: z.object({
    firstName: z.string(),
    middleName: z.string().nullable(),
    familyName: z.string(),
  }).nullable(),
  state: z.string().nullable(),
  postcode: z.string().nullable(),
});

export type AbnSearchResult = z.infer<typeof abnSearchByAbnResultSchema>;

const fetchAbrData = defineCachedFunction(async (abn: string, abrGuid: string) => {
  const url = `https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/SearchByABNv202001?searchString=${encodeURIComponent(abn)}&authenticationGuid=${abrGuid}&includeHistoricalDetails=N`
  logger.info(`Fetching ABR data for ABN: ${abn} from ${url}`);
  return $fetch(url, {
    responseType: 'text',
  });
}, {
  name: 'fetchAbrABN',
  maxAge: 60 * 60, // Cache for 1 hour (in seconds) 
});

export default defineEventHandler(async (event) => {
  const { abn } = await getValidatedQuery(event, z.object({
    abn: z.string().min(11, 'ABN must be 11 digits').max(11, 'ABN must be 11 digits'),
  }).parse);

  const { abrGuid } = useRuntimeConfig(event);

  // Fetch XML data from ABR API
  const xmlResponse = await fetchAbrData(abn, abrGuid);
  
  // Parse XML to JSON
  const parser = new Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlResponse as string);
  
  // Check for exceptions
  if (result.ABRPayloadSearchResults.response.exception) {
    const { exceptionDescription, exceptionCode } = result.ABRPayloadSearchResults.response.exception;
    throw createError({
      statusCode: 400,
      message: exceptionDescription,
      data: {
        code: exceptionCode,
        abn
      }
    });
  }

  // Extract business entity data
  const businessEntity = result.ABRPayloadSearchResults.response.businessEntity202001;
  
  // Helper function to get business names
  const getBusinessNames = (entity: any): string[] => {
    const names: string[] = [];
    
    // Handle company structure
    if (entity.mainName) {
      names.push(entity.mainName.organisationName);
    }
    if (entity.mainTradingName) {
      names.push(entity.mainTradingName.organisationName);
    }
    if (entity.otherTradingName) {
      if (Array.isArray(entity.otherTradingName)) {
        names.push(...entity.otherTradingName.map((name: any) => name.organisationName));
      } else {
        names.push(entity.otherTradingName.organisationName);
      }
    }
    
    // Handle individual/sole trader structure
    if (entity.businessName) {
      if (Array.isArray(entity.businessName)) {
        names.push(...entity.businessName.map((name: any) => name.organisationName));
      } else {
        names.push(entity.businessName.organisationName);
      }
    }
    
    return names;
  };

  // Helper function to get legal name
  const getLegalName = (entity: any) => {
    if (entity.legalName) {
      return {
        firstName: entity.legalName.givenName,
        middleName: entity.legalName.otherGivenName || null,
        familyName: entity.legalName.familyName
      };
    }
    return null;
  };

  const response: AbnSearchResult = {
    abn: businessEntity.ABN.identifierValue,
    isCurrent: businessEntity.ABN.isCurrentIndicator === 'Y',
    effectiveFrom: businessEntity.entityStatus.effectiveFrom,
    type: businessEntity.entityType.entityTypeCode,
    businessNames: getBusinessNames(businessEntity),
    legalName: getLegalName(businessEntity),
    state: businessEntity.mainBusinessPhysicalAddress?.stateCode || null,
    postcode: businessEntity.mainBusinessPhysicalAddress?.postcode || null
  };

  // Validate the response against the schema
  return abnSearchByAbnResultSchema.parse(response);
});