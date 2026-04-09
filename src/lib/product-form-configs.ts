import { z } from 'zod';
import type { ProductSeries } from './types';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'textarea';
  required: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
}

export interface ProductFormConfig {
  series: string;
  fields: FormField[];
  schema: z.ZodObject<any>;
}

// Define field configurations for each product series
export const PRODUCT_FORM_CONFIGS: Record<string, ProductFormConfig> = {
  'Wig': {
    series: 'Wig',
    fields: [
        { name: 'sku', label: 'field_sku', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
        { name: 'hairFiber', label: 'field_hair_fiber', type: 'select', required: false, 
          options: ['Remy Human Hair', 'Virgin Human Hair', 'Synthetic Fiber', 'Heat Friendly Synthetic'] },
        { name: 'cap', label: 'field_wig_cap_construction', type: 'select', required: false,
          options: ['Lace Front', 'Full Lace', 'Monofilament', 'Basic Cap', 'Hand Tied', '360 Lace'], placeholder: 'No such parameter, please fill in /' },
        { name: 'capSize', label: 'field_cap_size', type: 'select', required: false,
          options: ['Petite', 'Average', 'Large', 'Custom'] },
        { name: 'length', label: 'field_length', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'density', label: 'field_density', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'color', label: 'field_color', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'layers', label: 'field_layers', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'hairBangs', label: 'field_hair_bangs', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'specialNotes', label: 'field_special_notes', type: 'textarea', required: false, placeholder: 'Enter any special requirements or additional details...' }
      ],
    schema: z.object({})
  },

  'Topper': {
    series: 'Topper',
    fields: [
        { name: 'sku', label: 'field_sku', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
        { name: 'hairFiber', label: 'field_hair_fiber', type: 'select', required: false,
          options: ['Human Hair', 'Heat Friendly Synthetic', 'Synthetic Fiber'] },
        { name: 'cap', label: 'field_base_construction', type: 'select', required: false,
          options: ['Monofilament', 'Silk Top', 'Lace Top', 'Basic Base'] },
        { name: 'capSize', label: 'field_base_size', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'length', label: 'field_length', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'density', label: 'field_density', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'color', label: 'field_color', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'hairTexture', label: 'field_hair_texture', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'hairPart', label: 'field_hair_part', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'layers', label: 'field_layers', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'hairBangs', label: 'field_hair_bangs', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'specialNotes', label: 'field_special_notes', type: 'textarea', required: false, placeholder: 'Enter any special requirements or additional details...' }
      ],
    schema: z.object({})
  },

  'Hair Patch': {
    series: 'Hair Patch',
    fields: [
        { name: 'sku', label: 'field_sku', type: 'text', required: true, placeholder: 'No such parameter, please fill in /' },
        { name: 'hairFiber', label: 'field_hair_fiber', type: 'select', required: false,
          options: ['Human Hair', 'Heat Friendly Synthetic', 'Synthetic Fiber'] },
        { name: 'cap', label: 'field_base_construction', type: 'select', required: false,
          options: ['Monofilament', 'Silk Top', 'Lace Top', 'Basic Base'] },
        { name: 'capSize', label: 'field_base_size', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'length', label: 'field_length', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'density', label: 'field_density', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'color', label: 'field_color', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'hairTexture', label: 'field_hair_texture', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'hairPart', label: 'field_hair_part', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'layers', label: 'field_layers', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'hairBangs', label: 'field_hair_bangs', type: 'text', required: false, placeholder: 'No such parameter, please fill in /' },
        { name: 'specialNotes', label: 'field_special_notes', type: 'textarea', required: false, placeholder: 'Enter any special requirements or additional details...' }
      ],
    schema: z.object({})
  },
};

// Helper functions
export function getProductFormConfig(series: string): ProductFormConfig | null {
  return PRODUCT_FORM_CONFIGS[series] || null;
}

export function getAvailableProductSeries(): string[] {
  return Object.keys(PRODUCT_FORM_CONFIGS);
}
