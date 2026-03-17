"use client";

import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { RFQ } from './types';
import type { EditingImages } from './types';
import type { UseFormReturn } from 'react-hook-form';

interface ProductEditFormProps {
    rfq: RFQ;
    editForm: UseFormReturn<any>;
    editingImages: EditingImages;
    onAddImages: (productIndex: number, files: FileList | null) => void;
    onRemoveImage: (productIndex: number, imageIndex: number) => void;
    onRemoveNewImage: (productIndex: number, imageIndex: number) => void;
    t: (key: string, params?: any) => string;
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
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.productSeries`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Product Series</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                            <FormLabel>SKU</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.quantity`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantity</FormLabel>
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
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.hairFiber`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Hair Fiber</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.cap`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cap</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.capSize`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cap Size</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.length`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Length</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.density`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Density</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.color`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Color</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editForm.control}
                                    name={`products.${productIndex}.curlStyle`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Curl Style</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

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
