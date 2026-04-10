export interface Quote {
    id?: string;
    rfqId: string;
    productId: string;
    purchaserId: string;
    
    // Price fields with clear naming
    salesCostPriceRMB: number;        // Original RMB price entered by Purchaser
    salesCostPriceUSD: number;        // RMB ÷ 7.25
    customizedProductPriceUSD: number; // (RMB ÷ 2.7 + 40) × 1.075
    
    deliveryDate: string;
    deliveryDateFrom?: string; 
    deliveryDateTo?: string;
    quoteTime: string;
    status: 'Pending Acceptance' | 'Accepted' | 'Rejected' | 'Abandoned';
    notes?: string;
    abandonmentReason?: string;
    abandonedAt?: string;
  
    // Deprecated fields - keep for backward compatibility, remove later
    price?: number;  // Will be same as salesCostPriceRMB
    priceUSD?: number; // Will be same as salesCostPriceUSD
  }