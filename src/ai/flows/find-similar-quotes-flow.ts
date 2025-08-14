/**
 * @fileOverview An AI flow to find similar historical quotes.
 */

import { z } from 'zod';
// You'll need to create these files or fix the imports
// import { ai } from '../genkit'; // Adjust path as needed
// import { MOCK_RFQS } from '../../lib/data'; // Adjust path as needed
// import type { Product, Quote, RFQ } from '../../lib/types'; // Adjust path as needed

// Temporary types until you provide the actual type definitions
interface Product {
  id: string;
  wlid?: string;
  productSeries: 'Synthetic Product' | 'Wig' | 'Hair Extension' | 'Topper' | 'Toupee';
  sku?: string;
  hairFiber?: string;
  cap?: string;
  capSize?: string;
  length?: string;
  density?: string;
  color?: string;
  curlStyle?: string;
  images?: any;
}

interface Quote {
  rfqId: string;
  productId: string;
  purchaserId: string;
  price: number;
  deliveryDate: string;
  quoteTime: string;
  status: 'Pending Acceptance' | 'Accepted';
}

interface RFQ {
  products: Product[];
  quotes: Quote[];
}

// Temporary mock data - replace with actual import
const MOCK_RFQS: RFQ[] = [];

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

// Simplified version without AI flow - you can add AI back later
export async function findSimilarQuotes(productInput: ProductInput): Promise<QuoteOutput> {
    const similarQuotes: Quote[] = [];
    
    const fieldsToCompare: (keyof Omit<Product, 'id' | 'wlid' | 'productSeries' | 'sku' | 'images'>)[] = ['hairFiber', 'cap', 'capSize', 'length', 'density', 'color', 'curlStyle'];

    for (const rfq of MOCK_RFQS) {
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
                const quotesForProduct = MOCK_RFQS
                .flatMap((r: RFQ) => r.quotes)
                .filter((q: Quote) => q.productId === historicalProduct.id);
                
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