
import { z } from 'zod';

const productSchema = z.object({
  id: z.string().optional(),
  wlid: z.string().min(1, 'WLID is required'),
  productSeries: z.enum(['Synthetic Product', 'Wig', 'Hair Extension', 'Topper', 'Toupee']),
  sku: z.string().min(1, 'SKU is required'),
  hairFiber: z.string().min(1, 'Hair Fiber is required'),
  cap: z.string().min(1, 'Cap is required'),
  capSize: z.string().min(1, 'Cap Size is required'),
  length: z.string().min(1, 'Length is required'),
  density: z.string().min(1, 'Density is required'),
  color: z.string().min(1, 'Color is required'),
  curlStyle: z.string().min(1, 'Curls are required'),
  images: z.any(), // Keeping it simple for now
  imageFiles: z.any().optional(),
});
export const rfqFormSchema = z.object({
  customerType: z.string(),
  customerEmail: z.string().email('Invalid email address'),
  assignedPurchaserIds: z.array(z.string()).min(1, 'At least one purchaser must be assigned'),
  products: z.array(productSchema).min(1, 'At least one product is required'),
});

