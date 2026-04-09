"use client";

import { Upload, X } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { RFQ } from './types';
import type { EditingImages } from './types';
import type { UseFormReturn } from 'react-hook-form';
import { getProductFormConfig, type FormField as ProductFormField } from '@/lib/product-form-configs';

interface ProductEditFormProps {
    rfq: RFQ;
    editForm: UseFormReturn<any>;
    editingImages: EditingImages;
    onAddImages: (productIndex: number, files: FileList | null) => void;
    onRemoveImage: (productIndex: number, imageIndex: number) => void;
    onRemoveNewImage: (productIndex: number, imageIndex: number) => void;
    t: (key: string, params?: any) => string;
}

function ProductFieldsRow({
    productIndex,
    editForm,
    t,
}: {
    productIndex: number;
    editForm: UseFormReturn<any>;
    t: (key: string, params?: any) => string;
}) {
    const productSeries = useWatch({
        control: editForm.control,
        name: `products.${productIndex}.productSeries`,
    });

    const config = getProductFormConfig(productSeries);
    if (!config) return null;

    // 每两个字段一组，放入同一行
    const fields = config.fields.filter((f: ProductFormField) => f.name !== 'sku');
    const pairs: ProductFormField[][] = [];
    const textareaFields: ProductFormField[] = [];

    fields.forEach((f: ProductFormField) => {
        if (f.type === 'textarea') {
            textareaFields.push(f);
        } else {
            const lastPair = pairs[pairs.length - 1];
            if (!lastPair || lastPair.length === 2) {
                pairs.push([f]);
            } else {
                lastPair.push(f);
            }
        }
    });

    return (
        <>
            {pairs.map((pair, pairIndex) => (
                <div key={pairIndex} className="grid grid-cols-2 gap-4">
                    {pair.map((fieldConfig: ProductFormField) => (
                        <FormField
                            key={fieldConfig.name}
                            control={editForm.control}
                            name={`products.${productIndex}.${fieldConfig.name}` as any}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {fieldConfig.required && <span className="text-red-500 mr-1">*</span>}
                                        {t(fieldConfig.label)}
                                    </FormLabel>
                                    <FormControl>
                                        {fieldConfig.type === 'select' ? (
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <SelectTrigger><SelectValue placeholder={fieldConfig.placeholder} /></SelectTrigger>
                                                <SelectContent>
                                                    {fieldConfig.options?.map((opt: string) => (
                                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                {...field}
                                                value={field.value || ''}
                                                placeholder={fieldConfig.placeholder}
                                            />
                                        )}
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
            ))}
            {textareaFields.map((fieldConfig: ProductFormField) => (
                <FormField
                    key={fieldConfig.name}
                    control={editForm.control}
                    name={`products.${productIndex}.${fieldConfig.name}` as any}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t(fieldConfig.label)}</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    value={field.value || ''}
                                    placeholder={fieldConfig.placeholder}
                                    rows={4}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ))}
        </>
    );
}

export function ProductEditForm({
    rfq, editForm, editingImages, onAddImages, onRemoveImage, onRemoveNewImage, t
}: ProductEditFormProps) {
    return (
        <Form {...editForm}>
            {rfq.products.map((product, productIndex) => (
                <Card key={product.id}>
                    <CardHeader>
                        <CardTitle>{product.sku || 'N/A'}</CardTitle>
                        <CardDescription>WLID: {product.wlid}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">

                            {/* Product Series & SKU */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.productSeries`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('field_product_series_label')}</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Wig">Wig</SelectItem>
                                                    <SelectItem value="Topper">Topper</SelectItem>
                                                    <SelectItem value="Hair Patch">Hair Patch</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.sku`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('field_sku')}</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Quantity */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.quantity`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('field_quantity_label')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div />
                            </div>

                            {/* Dynamic fields based on product series */}
                            <ProductFieldsRow
                                productIndex={productIndex}
                                editForm={editForm}
                                t={t}
                            />

                            {/* Image Upload */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Product Images</label>
                                    <div className="mt-2">
                                        <div className="flex items-center justify-center w-full">
                                            <label htmlFor={`image-upload-${productIndex}`} className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                                    <p className="mb-2 text-sm text-muted-foreground">
                                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Max 5 images, 3MB each</p>
                                                </div>
                                                <Input
                                                    id={`image-upload-${productIndex}`}
                                                    type="file"
                                                    className="hidden"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        onAddImages(productIndex, e.target.files);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                        </div>

                                        {/* Existing images */}
                                        {editingImages[productIndex]?.existing?.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-sm text-muted-foreground mb-2">Current Images:</p>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {editingImages[productIndex].existing.map((imageUrl, imgIndex) => (
                                                        <div key={imgIndex} className="relative group">
                                                            <img src={imageUrl} alt={`Product ${imgIndex + 1}`} className="w-full h-20 object-cover rounded-lg border" />
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="icon"
                                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => onRemoveImage(productIndex, imgIndex)}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* New images to upload */}
                                        {editingImages[productIndex]?.new?.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-sm text-muted-foreground mb-2">New Images to Upload:</p>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {editingImages[productIndex].new.map((file, imgIndex) => (
                                                        <div key={imgIndex} className="relative group">
                                                            <img src={URL.createObjectURL(file)} alt={`New ${imgIndex + 1}`} className="w-full h-20 object-cover rounded-lg border" />
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="icon"
                                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => onRemoveNewImage(productIndex, imgIndex)}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </CardContent>
                </Card>
            ))}
        </Form>
    );
}