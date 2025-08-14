'use server';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSimilarQuotes = findSimilarQuotes;
/**
 * @fileOverview An AI flow to find similar historical quotes.
 *
 * - findSimilarQuotes - A function that finds historical quotes for similar products.
 * - ProductInputSchema - The input Zod schema for the product.
 * - QuoteOutputSchema - The output Zod schema for the quotes.
 */
const genkit_1 = require("@/ai/genkit");
const genkit_2 = require("genkit");
const data_1 = require("@/lib/data");
// Use the existing product schema from the main app, making fields optional for partial matching.
const ProductInputSchema = genkit_2.z.object({
    id: genkit_2.z.string().optional(),
    wlid: genkit_2.z.string().optional(),
    productSeries: genkit_2.z.enum(['Synthetic Product', 'Wig', 'Hair Extension', 'Topper', 'Toupee']),
    sku: genkit_2.z.string().optional(),
    hairFiber: genkit_2.z.string().optional(),
    cap: genkit_2.z.string().optional(),
    capSize: genkit_2.z.string().optional(),
    length: genkit_2.z.string().optional(),
    density: genkit_2.z.string().optional(),
    color: genkit_2.z.string().optional(),
    curlStyle: genkit_2.z.string().optional(),
    images: genkit_2.z.any().optional(),
}).partial();
const QuoteSchema = genkit_2.z.object({
    rfqId: genkit_2.z.string(),
    productId: genkit_2.z.string(),
    purchaserId: genkit_2.z.string(),
    price: genkit_2.z.number(),
    deliveryDate: genkit_2.z.string(),
    quoteTime: genkit_2.z.string(),
    status: genkit_2.z.enum(['Pending Acceptance', 'Accepted']),
});
const QuoteOutputSchema = genkit_2.z.array(QuoteSchema);
const findSimilarQuotesFlow = genkit_1.ai.defineFlow({
    name: 'findSimilarQuotesFlow',
    inputSchema: ProductInputSchema,
    outputSchema: QuoteOutputSchema,
}, async (productInput) => {
    const similarQuotes = [];
    const fieldsToCompare = ['hairFiber', 'cap', 'capSize', 'length', 'density', 'color', 'curlStyle'];
    for (const rfq of data_1.MOCK_RFQS) {
        for (const historicalProduct of rfq.products) {
            // Must be in the same product series
            if (historicalProduct.productSeries !== productInput.productSeries) {
                continue;
            }
            let matchingFields = 0;
            for (const field of fieldsToCompare) {
                const productInputValue = productInput[field];
                const historicalProductValue = historicalProduct[field];
                // Explicitly check if both values exist and are strings
                if (typeof productInputValue === 'string' && typeof historicalProductValue === 'string') {
                    if (productInputValue === historicalProductValue) {
                        matchingFields++;
                    }
                }
            }
            // If 5 or more fields match, consider it similar
            if (matchingFields >= 5) {
                const quotesForProduct = data_1.MOCK_RFQS
                    .flatMap((r) => r.quotes)
                    .filter((q) => q.productId === historicalProduct.id);
                similarQuotes.push(...quotesForProduct);
            }
        }
    }
    // Sort by quote time descending to get the most recent
    similarQuotes.sort((a, b) => new Date(b.quoteTime).getTime() - new Date(a.quoteTime).getTime());
    // Return the top 3 unique quotes
    const uniqueQuotes = Array.from(new Map(similarQuotes.map(q => [q.rfqId + q.productId + q.purchaserId, q])).values());
    return uniqueQuotes.slice(0, 3);
});
async function findSimilarQuotes(input) {
    return findSimilarQuotesFlow(input);
}
//# sourceMappingURL=find-similar-quotes-flow.js.map