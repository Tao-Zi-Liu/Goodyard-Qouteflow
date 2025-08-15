import * as functions from "firebase-functions/v2";
import {CallableRequest} from "firebase-functions/v2/https";

// Define proper types for your data
interface FindSimilarQuotesData {
  productId?: string;
  productSeries?: string;
  // Add other fields as needed
}

interface ExtractRfqData {
  inputText: string;
  // Add other fields as needed
}

// Import your functions (make sure these exist)
async function findSimilarQuotes(data: FindSimilarQuotesData) {
  // Your implementation
  console.log("Finding similar quotes for:", data);
  // Return mock data for now
  return [];
}

async function extractRfqFlow(data: ExtractRfqData) {
  // Your implementation
  console.log("Extracting RFQ from:", data);
  // Return mock data for now
  return {};
}

export const findsimilarquotes = functions.https.onCall(
  async (request: CallableRequest<FindSimilarQuotesData>) => {
    const data = request.data;

    try {
      const similarQuotes = await findSimilarQuotes(data);
      return {result: similarQuotes};
    } catch (error) {
      console.error("Error finding similar quotes:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred while finding similar quotes.",
        error
      );
    }
  }
);

export const extractrfq = functions.https.onCall(
  async (request: CallableRequest<ExtractRfqData>) => {
    const data = request.data;

    try {
      const extractionResult = await extractRfqFlow(data);
      return {result: extractionResult};
    } catch (error) {
      console.error("Error extracting RFQ:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred while extracting the RFQ.",
        error
      );
    }
  }
);