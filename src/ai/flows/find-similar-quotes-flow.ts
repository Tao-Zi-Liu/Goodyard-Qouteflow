'use server';
/**
 * @fileOverview An AI flow to find similar historical quotes.
 *
 * - findSimilarQuotes - A function that finds historical quotes for similar products.
 * - ProductInputSchema - The input Zod schema for the product.
 * - QuoteOutputSchema - The output Zod schema for the quotes.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MOCK_RFQS } from '@/lib/data';
import type { Product, Quote } from '@/lib/types';

// Use the existing product schema from the main app, making fields optional for partial matching.
const ProductInputSchema = z.object({
  id: z.string().optional(),
  wlid: z.string().optional(),
  productSeries: z.enum(['Synthetic Product', 'Wig', 'Hair Extension', 'Topper', 'Toupee']),
  sku: z.string().optional(),
  hairFiber: z.string().optional(),
  cap: z.string().optional(),
  capSize: z.string().optional(),
  length: z.string().optional(),
  density: z.string().optional(),
  color: z.string().optional(),
  curlStyle: z.string().optional(),
  images: z.any().optional(),
}).partial();
export type ProductInput = z.infer<typeof ProductInputSchema>;

const QuoteSchema = z.object({
    rfqId: z.string(),
    productId: z.string(),
    purchaserId: z.string(),
    price: z.number(),
    deliveryDate: z.string(),
    quoteTime: z.string(),
    status: z.enum(['Pending Acceptance', 'Accepted']),
});

const QuoteOutputSchema = z.array(QuoteSchema);
export type QuoteOutput = z.infer<typeof QuoteOutputSchema>;


const findSimilarQuotesFlow = ai.defineFlow(
  {
    name: 'findSimilarQuotesFlow',
    inputSchema: ProductInputSchema,
    outputSchema: QuoteOutputSchema,
  },
  async (productInput) => {
    const similarQuotes: Quote[] = [];
    
    const fieldsToCompare: (keyof Product)[] = ['hairFiber', 'cap', 'capSize', 'length', 'density', 'color', 'curlStyle'];

    for (const rfq of MOCK_RFQS) {
        for (const historicalProduct of rfq.products) {
            // Must be in the same product series
            if (historicalProduct.productSeries !== productInput.productSeries) {
                continue;
            }

            let matchingFields = 0;
            for (const field of fieldsToCompare) {
                if (productInput[field] && historicalProduct[field] && productInput[field] === historicalProduct[field]) {
                    matchingFields++;
                }
            }

            // If 5 or more fields match, consider it similar
            if (matchingFields >= 5) {
                const quotesForProduct = MOCK_RFQS
                    .flatMap(r => r.quotes)
                    .filter(q => q.productId === historicalProduct.id);
                
                similarQuotes.push(...quotesForProduct);
            }
        }
    }

    // Sort by quote time descending to get the most recent
    similarQuotes.sort((a, b) => new Date(b.quoteTime).getTime() - new Date(a.quoteTime).getTime());
    
    // Return the top 3 unique quotes
    const uniqueQuotes = Array.from(new Map(similarQuotes.map(q => [q.rfqId + q.productId + q.purchaserId, q])).values());

    return uniqueQuotes.slice(0, 3);
  }
);


export async function findSimilarQuotes(input: ProductInput): Promise<QuoteOutput> {
  return findSimilarQuotesFlow(input);
}
