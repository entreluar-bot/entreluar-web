export const resumoRapidoSchema = {
  type: "object",
  properties: {
    whatIs: { type: "string" },
    usedFor: { type: "string" },
    noticed: { type: "string" },
    pro: { type: "string" },
    caution: { type: "string" },
    repurchase: { type: "string" },
    duration: { type: "string" },
  },
  required: ["whatIs", "usedFor", "noticed", "pro", "caution", "repurchase", "duration"],
  additionalProperties: false,
};

export const tagSuggestionSchema = {
  type: "object",
  properties: {
    suggestedTagSlugs: { type: "array", items: { type: "string" }, maxItems: 8 },
  },
  required: ["suggestedTagSlugs"],
  additionalProperties: false,
};

export const pollSuggestionSchema = {
  type: "object",
  properties: {
    question: { type: "string" },
    options: { type: "array", items: { type: "string" }, maxItems: 4 },
  },
  required: ["question", "options"],
  additionalProperties: false,
};

export const postSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    text: { type: "string" },
    imagePrompt: { type: "string" },
    openingStyle: { type: "string" },
    structureStyle: { type: "string" },
    closingStyle: { type: "string" },
    notablePhrases: { type: "array", items: { type: "string" }, maxItems: 3 },
    resumoRapido: resumoRapidoSchema,
  },
  required: ["title", "text", "imagePrompt", "openingStyle", "structureStyle", "closingStyle", "notablePhrases", "resumoRapido"],
  additionalProperties: false,
};

export const productSchema = {
  type: "object",
  properties: {
    productName: { type: "string" },
    productReview: { type: "string" },
    blogTitle: { type: "string" },
    blogPost: { type: "string" },
    identificationConfidence: { type: "string", enum: ["alta", "media", "baixa"] },
    evidenceLevel: { type: "string", enum: ["forte", "moderada", "inicial", "nao_verificada", "nao_aplicavel"] },
    experienceStatus: { type: "string", enum: ["testado", "impressao_inicial", "pesquisado", "nao_informado"] },
    researchSummary: { type: "string" },
    openingStyle: { type: "string" },
    structureStyle: { type: "string" },
    notablePhrases: { type: "array", items: { type: "string" }, maxItems: 3 },
    resumoRapido: resumoRapidoSchema,
    resumoRapidoArtigo: resumoRapidoSchema,
    suggestedTagSlugs: { type: "array", items: { type: "string" }, maxItems: 8 },
    suggestedPoll: pollSuggestionSchema,
  },
  required: ["productName", "productReview", "blogTitle", "blogPost", "identificationConfidence", "evidenceLevel", "experienceStatus", "researchSummary", "openingStyle", "structureStyle", "notablePhrases", "resumoRapido", "resumoRapidoArtigo", "suggestedTagSlugs", "suggestedPoll"],
  additionalProperties: false,
};

export const accessorySchema = {
  ...productSchema,
  properties: {
    ...productSchema.properties,
    inputDetailsUsed: { type: "array", items: { type: "string" }, maxItems: 4 },
    humorApplied: { type: "boolean" },
  },
  required: [...productSchema.required, "inputDetailsUsed", "humorApplied"],
};

export const quoteBatchSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      minItems: 15,
      maxItems: 15,
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          theme: { type: "string", enum: ["humor_cotidiano", "liberdade", "corpo", "menopausa", "motivacao"] },
        },
        required: ["text", "theme"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

export const newsletterSchema = {
  type: "object",
  properties: {
    subject: { type: "string" }, preheader: { type: "string" }, headline: { type: "string" },
    bodyHtml: { type: "string" }, ctaText: { type: "string" }, ctaUrl: { type: "string" },
    openingStyle: { type: "string" }, notablePhrases: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
  required: ["subject", "preheader", "headline", "bodyHtml", "ctaText", "ctaUrl", "openingStyle", "notablePhrases"],
  additionalProperties: false,
};
