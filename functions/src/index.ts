import * as functions from "firebase-functions/v2";
import {CallableRequest} from "firebase-functions/v2/https";
import {findSimilarQuotes} from "@/ai/flows/find-similar-quotes-flow";
import {extractRfqFlow} from "@/ai/flows/extract-rfq-flow";

export const findsimilarquotes = functions.https.onCall(
  async (request: CallableRequest<any>) => {
    // Access data and context from the request object
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
  async (request: CallableRequest<any>) => {
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
