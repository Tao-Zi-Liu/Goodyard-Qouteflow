'use server';
/**
 * @fileOverview An AI flow to extract structured RFQ data from colloquial text.
 *
 * - extractRfqFormData - A function that processes text to pre-fill an RFQ form.
 * - ExtractRfqDataInput - The input type for the extractRfqFormData function.
 * - ExtractRfqDataOutput - The return type for the extractRfqFormData function.
 */

import { ai } from '@/ai/genkit';
import { rfqFormSchema } from '@/lib/schemas';
import { MOCK_USERS } from '@/lib/data';
import { z } from 'genkit';

const purchasingUsers = MOCK_USERS.filter(u => u.role === 'Purchasing');

const ExtractRfqDataInputSchema = z.object({
  inputText: z.string().describe('The colloquial text from the user describing the RFQ.'),
});
export type ExtractRfqDataInput = z.infer<typeof ExtractRfqDataInputSchema>;

// We use a partial schema for the output, as the AI may not be able to extract all fields.
const ExtractRfqDataOutputSchema = rfqFormSchema.partial();
export type ExtractRfqDataOutput = z.infer<typeof ExtractRfqDataOutputSchema>;


const extractRfqPrompt = ai.definePrompt({
    name: 'extractRfqPrompt',
    input: { schema: ExtractRfqDataInputSchema },
    output: { schema: ExtractRfqDataOutputSchema },
    prompt: `You are an expert at processing Request for Quotation (RFQ) details from text.
    Your task is to extract information from the user's input text and structure it into a JSON object that matches the provided schema.

    Available Purchasers:
    ${purchasingUsers.map(u => `- ${u.name} (id: ${u.id})`).join('\n')}

    Rules:
    - Analyze the inputText to identify customer details, product specifications, and assigned purchasers.
    - Match the assigned purchaser names from the text to the provided list and use their corresponding IDs for the 'assignedPurchaserIds' field.
    - If the user mentions multiple products, create a separate product object for each one in the 'products' array.
    - For any information that is not present in the text, leave the corresponding field out of the output.
    - The 'productSeries' must be one of the following: 'Synthetic Product', 'Wig', 'Hair Extension', 'Topper', 'Toupee'.
    
    User Input Text:
    "{{inputText}}"
    `,
});


const extractRfqFlow = ai.defineFlow(
    {
        name: 'extractRfqFlow',
        inputSchema: ExtractRfqDataInputSchema,
        outputSchema: ExtractRfqDataOutputSchema,
    },
    async (input) => {
        const { output } = await extractRfqPrompt(input);
        return output ?? {};
    }
);

export async function extractRfqFormData(input: ExtractRfqDataInput): Promise<ExtractRfqDataOutput> {
    return extractRfqFlow(input);
}
