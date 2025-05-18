export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({ id: z.coerce.number() }).parse);

  const business = await useDrizzle().query.businesses.findFirst({
    where: eq(tables.businesses.id, id),
  });

  if (!business) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Business not found',
    });
  }

  const response = await $fetch(`/api/google/places/getPlace?id=${business.placeId}`);
  
  // Get the business name, prioritize from Google, fallback to database
  // Convert displayName to string if it's an object with text property
  let businessName = '';
  if (response[0]?.displayName) {
    if (typeof response[0].displayName === 'string') {
      businessName = response[0].displayName;
    } else if (response[0].displayName.text) {
      businessName = response[0].displayName.text;
    }
  } else if (business.name) {
    businessName = business.name;
  }
  
  // Check for forbidden characters
  const hasForbiddenChars = /[\|\-:()]/.test(businessName);
  
  // Check for excessive words (more than 5 words indicates potential keyword stuffing)
  const wordCount = businessName.split(/\s+/).filter(Boolean).length;
  const hasExcessiveWords = wordCount > 5;
  
  // The check passes only if both conditions are met
  const isClean = !hasForbiddenChars && !hasExcessiveWords;
  
  // Provide reason for failure
  let label = null;
  if (!isClean) {
    if (hasForbiddenChars && hasExcessiveWords) {
      label = `Contains forbidden characters and has ${wordCount} words (max 5 recommended)`;
    } else if (hasForbiddenChars) {
      label = 'Contains forbidden characters like |, -, :, or ()';
    } else {
      label = `Has ${wordCount} words (max 5 recommended)`;
    }
  }

  return { type: 'check' as const, value: isClean, label };
}); 