"use client";

import { useEffect, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getProductFormConfig,
  type FormField as ProductFormField,
} from '@/lib/product-form-configs';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProductSeries, RFQ, Quote } from '@/lib/types';

const productSeriesOptions: ProductSeries[] = ['Wig', 'Topper', 'Hair Patch'];

const wlidPrefixMap: Record<ProductSeries, string> = {
  Wig: 'FTCV',
  'Hair Extension': 'FTCE',
  Topper: 'FTCP',
  Toupee: 'FTCU',
  'Synthetic Product': 'FTCS',
  'Hair Patch': 'FTCP',
};

const wlidStartMap: Partial<Record<ProductSeries, number>> = {
  Wig: 937,     // 新单从 FTCV0938 开始
  Topper: 1770, // 新单从 FTCP1771 开始
};

export const generateWlid = async (productSeries: ProductSeries): Promise<string> => {
  const prefix = wlidPrefixMap[productSeries];
  let maxSuffix = 0;
  try {
    const rfqsSnapshot = await getDocs(collection(db, 'rfqs'));
    rfqsSnapshot.forEach(doc => {
      const rfqData = doc.data() as RFQ;
      if (rfqData.products) {
        rfqData.products.forEach(product => {
          if (product.wlid && product.wlid.startsWith(prefix)) {
            const suffix = parseInt(product.wlid.substring(prefix.length), 10);
            if (!isNaN(suffix) && suffix > maxSuffix) maxSuffix = suffix;
          }
        });
      }
    });
  } catch (error) {
    console.error('Error generating WLID:', error);
  }
  const minSuffix = wlidStartMap[productSeries] ?? 0;
  if (maxSuffix < minSuffix) maxSuffix = minSuffix;
  return `${prefix}${(maxSuffix + 1).toString().padStart(4, '0')}`;
};

interface ProductRowProps {
  index: number;
  control: any;
  remove: (index: number) => void;
  setValue: any;
  onSimilarQuotesFound: (quotes: Quote[]) => void;
  updateProductImages: (productId: string, files: File[]) => void;
  productId: string;
  t: (key: string) => string;
}

export function ProductRow({
  index,
  control,
  remove,
  setValue,
  updateProductImages,
  productId,
  t,
}: ProductRowProps) {
  const productData = useWatch({ control, name: `products.${index}` });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (productData?.productSeries) {
      generateWlid(productData.productSeries).then(newWlid => {
        setValue(`products.${index}.wlid`, newWlid, { shouldValidate: true });
      });
    }
  }, [productData?.productSeries, index, setValue]);

  const removeImage = (imageIndex: number) => {
    const updated = selectedImages.filter((_, i) => i !== imageIndex);
    setSelectedImages(updated);
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== imageIndex));
    setValue(`products.${index}.imageFiles`, updated);
    updateProductImages(productId, updated);
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive hidden"
        onClick={() => remove(index)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Product Series */}
      <div className="grid sm:grid-cols-1 gap-4">
        <FormField
          control={control}
          name={`products.${index}.productSeries`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('field_product_series_label')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {productSeriesOptions.map(series => (
                    <SelectItem key={series} value={series}>
                      {series}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* WLID + SKU */}
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name={`products.${index}.wlid`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('field_wlid')}</FormLabel>
              <FormControl>
                <Input {...field} readOnly className="bg-muted/50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`products.${index}.sku`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <span className="text-red-500 mr-1">*</span>SKU
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Quantity */}
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name={`products.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  value={field.value || 1}
                  onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div />
      </div>

      {/* Dynamic fields from config */}
      <div className="space-y-4">
        {productData?.productSeries &&
          (() => {
            const config = getProductFormConfig(productData.productSeries);
            if (config) {
              return config.fields
                .filter((fc: ProductFormField) => fc.name !== 'sku')
                .map((fieldConfig: ProductFormField) => (
                  <FormField
                    key={fieldConfig.name}
                    control={control}
                    name={`products.${index}.${fieldConfig.name}` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor={`product-${index}-${fieldConfig.name}`}>
                          {fieldConfig.required && (
                            <span className="text-red-500 mr-1">*</span>
                          )}
                          {t(fieldConfig.label)}
                        </FormLabel>
                        <FormControl>
                          <div>
                            {fieldConfig.type === 'textarea' ? (
                              <div className="space-y-2">
                                <textarea
                                  {...field}
                                  id={`product-${index}-${fieldConfig.name}`}
                                  value={field.value || ''}
                                  placeholder={fieldConfig.placeholder}
                                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical"
                                  rows={4}
                                  maxLength={500}
                                />
                                <div className="text-xs text-muted-foreground text-right">
                                  {(field.value || '').length}/500 characters
                                </div>
                              </div>
                            ) : (
                              <Input
                                {...field}
                                id={`product-${index}-${fieldConfig.name}`}
                                value={field.value || ''}
                                placeholder={fieldConfig.placeholder}
                                className="placeholder:text-muted-foreground/60"
                              />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ));
            }
            return (
              <div className="text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="font-medium">Configuration Pending</p>
                <p className="text-sm">
                  Form fields for &quot;{productData.productSeries}&quot; are currently being
                  configured. Please select Wig or Topper for now.
                </p>
              </div>
            );
          })()}
      </div>

      {/* Image Upload */}
      <FormField
        control={control}
        name={`products.${index}.imageFiles`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Images</FormLabel>
            <FormControl>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor={`dropzone-file-${index}`}
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Each image is limited to 3MB, and a maximum of 5 images can be uploaded
                      </p>
                    </div>
                    <Input
                      id={`dropzone-file-${index}`}
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        if (files.length + selectedImages.length > 5) {
                          alert('Maximum 5 images allowed per product');
                          return;
                        }
                        const newFiles = [...selectedImages, ...files];
                        setSelectedImages(newFiles);
                        setImagePreviewUrls(prev => [
                          ...prev,
                          ...files.map(f => URL.createObjectURL(f)),
                        ]);
                        field.onChange(newFiles);
                        updateProductImages(productId, newFiles);
                      }}
                    />
                  </label>
                </div>
                {imagePreviewUrls.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {imagePreviewUrls.map((url, imgIndex) => (
                      <div key={imgIndex} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${imgIndex + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(imgIndex)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
