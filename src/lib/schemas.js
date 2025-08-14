"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rfqFormSchema = void 0;
const zod_1 = require("zod");
const productSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    wlid: zod_1.z.string().min(1, 'WLID is required'),
    productSeries: zod_1.z.enum(['Synthetic Product', 'Wig', 'Hair Extension', 'Topper', 'Toupee']),
    sku: zod_1.z.string().min(1, 'SKU is required'),
    hairFiber: zod_1.z.string().min(1, 'Hair Fiber is required'),
    cap: zod_1.z.string().min(1, 'Cap is required'),
    capSize: zod_1.z.string().min(1, 'Cap Size is required'),
    length: zod_1.z.string().min(1, 'Length is required'),
    density: zod_1.z.string().min(1, 'Density is required'),
    color: zod_1.z.string().min(1, 'Color is required'),
    curlStyle: zod_1.z.string().min(1, 'Curls are required'),
    images: zod_1.z.any(), // Keeping it simple for now
});
exports.rfqFormSchema = zod_1.z.object({
    customerType: zod_1.z.string(),
    customerEmail: zod_1.z.string().email('Invalid email address'),
    assignedPurchaserIds: zod_1.z.array(zod_1.z.string()).min(1, 'At least one purchaser must be assigned'),
    products: zod_1.z.array(productSchema).min(1, 'At least one product is required'),
});
//# sourceMappingURL=schemas.js.map