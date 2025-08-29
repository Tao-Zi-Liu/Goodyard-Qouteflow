// src/lib/product-form-configs.ts
import { z } from 'zod';
import type { ProductSeries } from './types';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number';
  required: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
}

export interface ProductFormConfig {
  series: ProductSeries;
  fields: FormField[];
  schema: z.ZodObject<any>;
}

// Define field configurations for each product series
export const PRODUCT_FORM_CONFIGS: Record<string, ProductFormConfig> = {
  'Wig': {
    series: 'Wig',
    fields: [
      { name: 'sku', label: 'SKU', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
      { name: 'hairFiber', label: 'Hair Fiber', type: 'select', required: true, 
        options: ['Remy Human Hair', 'Virgin Human Hair', 'Synthetic Fiber', 'Heat Friendly Synthetic'] },
      { name: 'wigCapConstruction', label: 'Wig Cap Construction', type: 'select', required: true,
        options: ['Lace Front', 'Full Lace', 'Monofilament', 'Basic Cap', 'Hand Tied', '360 Lace'] },
      { name: 'capSize', label: 'Cap Size', type: 'select', required: true,
        options: ['Petite', 'Average', 'Large', 'Custom'] },
      { name: 'length', label: 'Length', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
      { name: 'density', label: 'Hair Density', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
      { name: 'color', label: 'Color', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
      { name: 'curlStyle', label: 'Curl Style', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
    ],
    schema: z.object({
      sku: z.string().min(1, 'SKU is required'),
      hairFiber: z.string().min(1, 'Hair Fiber is required'),
      wigCapConstruction: z.string().min(1, 'Wig Cap Construction is required'),
      capSize: z.string().min(1, 'Cap Size is required'),
      length: z.string().min(1, 'Length is required'),
      density: z.string().min(1, 'Hair Density is required'),
      color: z.string().min(1, 'Color is required'),
      curlStyle: z.string().min(1, 'Curl Style is required'),
    })
  },

  'Topper': {
    series: 'Topper',
    fields: [
      { name: 'sku', label: 'SKU', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
      { name: 'hairFiber', label: 'Hair Fiber', type: 'select', required: true,
        options: ['Human Hair', 'Heat Friendly Synthetic', 'Synthetic Fiber'] },
      { name: 'cap', label: 'Base Construction', type: 'select', required: true,
        options: ['Monofilament', 'Silk Top', 'Lace Top', 'Basic Base'] },
      { name: 'baseSize', label: 'Base Size', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
      { name: 'length', label: 'Length', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
      { name: 'density', label: 'Hair Density', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
      { name: 'color', label: 'Color', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
      { name: 'curlStyle', label: 'Curl Style', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
    ],
    schema: z.object({
      sku: z.string().min(1, 'SKU is required'),
      hairFiber: z.string().min(1, 'Hair Fiber is required'),
      cap: z.string().min(1, 'Base Construction is required'),
      baseSize: z.string().min(1, 'Base Size is required'),
      length: z.string().min(1, 'Length is required'),
      density: z.string().min(1, 'Hair Density is required'),
      color: z.string().min(1, 'Color is required'),
      curlStyle: z.string().min(1, 'Curl Style is required'),
    })
  }
};

// Helper functions
export function getProductFormConfig(series: string): ProductFormConfig | null {
  return PRODUCT_FORM_CONFIGS[series] || null;
}

export function getAvailableProductSeries(): string[] {
  return Object.keys(PRODUCT_FORM_CONFIGS);
}