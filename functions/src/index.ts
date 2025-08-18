import * as functions from "firebase-functions/v2";
import {CallableRequest} from "firebase-functions/v2/https";

// Import the new admin functions
export {createUser} from "./create-user";

// Temporary placeholder for the AI functions - we'll fix these later
export const findsimilarquotes = functions.https.onCall(
  async (request: CallableRequest<any>) => {
    // Temporarily return empty result until we fix the AI imports
    return {result: []};
  }
);

export const extractrfq = functions.https.onCall(
  async (request: CallableRequest<any>) => {
    // Temporarily return empty result until we fix the AI imports
    return {result: {}};
  }
);
