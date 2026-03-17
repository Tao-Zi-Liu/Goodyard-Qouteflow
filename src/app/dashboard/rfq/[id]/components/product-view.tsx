"use client";

import { Eye, X } from 'lucide-react';
import { TranslateButton } from '@/components/translate-button';
import { getProductFormConfig } from '@/lib/product-form-configs';
import type { Product } from './types';
import type { TranslatedFields } from './types';

interface ProductViewProps {
    product: Product;
    translatedFields: TranslatedFields;
    onTranslate: (productId: string, fieldName: string, translatedText: string) => void;
    onImageClick: (url: string) => void;
    t: (key: string, params?: any) => string;
}

export function ProductView({ product, translatedFields, onTranslate, onImageClick, t }: ProductViewProps) {
    const config = getProductFormConfig(product.productSeries);
    const fields = config ? config.fields.filter(f => f.name !== 'sku') : [];
    const nonTextareaFields = fields.filter(f => f.type !== 'textarea');
    const textareaFields = fields.filter(f => f.type === 'textarea');

    // Group non-textarea fields into pairs for 2-column layout
    const pairs: typeof nonTextareaFields[] = [];
    for (let i = 0; i < nonTextareaFields.length; i += 2) {
        pairs.push(nonTextareaFields.slice(i, i + 2));
    }

    return (
        <div>
            {/* Product Images */}
            {product.images && product.images.length > 0 && (
                <div className="mb-6">
                    <span className="text-sm text-muted-foreground">{t('product_images')}:</span>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {product.images.map((imageUrl: string, index: number) => (
                            <div
                                key={index}
                                className="relative group cursor-pointer"
                                onClick={() => onImageClick(imageUrl)}
                            >
                                <img
                                    src={imageUrl}
                                    alt={`Product ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border hover:opacity-75 transition-opacity"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-black/50 rounded-full p-2">
                                        <Eye className="h-4 w-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Fields */}
            <div className="grid grid-cols-1 gap-y-4 text-sm mb-6">
                {/* Product Series + SKU */}
                <div className="grid grid-cols-2 gap-x-8">
                    <div>
                        <span className="text-muted-foreground">{t('field_product_series')}:</span>
                        <p className="font-medium">{product.productSeries}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">{t('field_sku')}:</span>
                        <p className="font-medium">{product.sku || 'N/A'}</p>
                    </div>
                </div>

                {/* Quantity */}
                <div className="grid grid-cols-2 gap-x-8">
                    <div>
                        <span className={`text-muted-foreground ${(product.quantity || 1) > 1 ? 'font-bold text-red-600' : ''}`}>
                            {t('field_quantity')}:
                        </span>
                        <p className={`font-medium ${(product.quantity || 1) > 1 ? 'font-bold text-red-600' : ''}`}>
                            {product.quantity || 1}
                        </p>
                    </div>
                </div>

                {/* Dynamic fields from product-form-configs, in pairs */}
                {pairs.map((pair, pairIndex) => (
                    <div key={pairIndex} className="grid grid-cols-2 gap-x-8">
                        {pair.map((fieldConfig) => {
                            const fieldValue = (product as any)[fieldConfig.name];
                            const translatedValue = translatedFields[product.id]?.[fieldConfig.name];
                            const displayValue = translatedValue || fieldValue || 'N/A';
                            return (
                                <div key={fieldConfig.name}>
                                    <span className="text-muted-foreground">{t(fieldConfig.label)}:</span>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium flex-1">{displayValue}</p>
                                        {fieldValue && (
                                            <TranslateButton
                                                text={fieldValue}
                                                onTranslate={(translatedText) =>
                                                    onTranslate(product.id, fieldConfig.name, translatedText)
                                                }
                                                className="h-6 w-6"
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}

                {/* Textarea fields (e.g. Special Notes) */}
                {textareaFields.map((fieldConfig) => {
                    const fieldValue = (product as any)[fieldConfig.name];
                    const translatedValue = translatedFields[product.id]?.[fieldConfig.name];
                    if (!fieldValue) return null;
                    return (
                        <div key={fieldConfig.name} className="col-span-2 mt-2">
                            <span className="text-muted-foreground">{t(fieldConfig.label)}:</span>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="font-medium flex-1 whitespace-pre-wrap break-all bg-muted/40 rounded-md px-3 py-2 text-sm">
                                    {translatedValue || fieldValue}
                                </p>
                                <TranslateButton
                                    text={fieldValue}
                                    onTranslate={(translatedText) =>
                                        onTranslate(product.id, fieldConfig.name, translatedText)
                                    }
                                    className="h-6 w-6"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
