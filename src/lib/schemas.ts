
import { z } from 'zod';

const productSchema = z.object({
  id: z.string().optional(),
  wlid: z.string().min(1, 'WLID is required'),
  productSeries: z.enum(['Synthetic Product', 'Wig', 'Hair Extension', 'Topper', 'Toupee']),
  sku: z.string().min(1, 'SKU is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'), 
  images: z.any(), 
  imageFiles: z.any().optional(),
  
  hairFiber: z.string().optional(),
  cap: z.string().optional(),
  capSize: z.string().optional(),
  length: z.string().optional(),
  density: z.string().optional(),
  color: z.string().optional(),
  curlStyle: z.string().optional(),
  wigCapConstruction: z.string().optional(),
  baseSize: z.string().optional(),
  extensionType: z.string().optional(),
  weight: z.string().optional(),
  baseType: z.string().optional(),
  productType: z.string().optional(),
  fiberType: z.string().optional(),
});
export const rfqFormSchema = z.object({
  customerType: z.string(),
  customerEmail: z.string().email('Invalid email address'),
  assignedPurchaserIds: z.array(z.string()).min(1, 'At least one purchaser must be assigned'),
  products: z.array(productSchema).min(1, 'At least one product is required'),
});

