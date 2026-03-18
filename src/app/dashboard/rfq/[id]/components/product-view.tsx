"use client";

import { Eye } from 'lucide-react';
import { getProductFormConfig } from '@/lib/product-form-configs';
import type { Product } from './types';

type SupportedLanguage = 'en' | 'zh' | 'de';

interface ProductTranslations {
    [fieldName: string]: {
        en?: string;
        zh?: string;
        de?: string;
    };
}

interface ProductViewProps {
    product: Product;
    onImageClick: (url: string) => void;
    t: (key: string, params?: any) => string;
    language?: string;
    productTranslations?: ProductTranslations;
}

export function ProductView({ product, onImageClick, t, language = 'en', productTranslations }: ProductViewProps) {
    const config = getProductFormConfig(product.productSeries);
    const fields = config ? config.fields.filter(f => f.name !== 'sku') : [];
    const nonTextareaFields = fields.filter(f => f.type !== 'textarea');
    const textareaFields = fields.filter(f => f.type === 'textarea');

    const pairs: typeof nonTextareaFields[] = [];
    for (let i = 0; i < nonTextareaFields.length; i += 2) {
        pairs.push(nonTextareaFields.slice(i, i + 2));
    }

    // 获取某字段的译文，若与原文相同或不存在则返回 null
    const getTranslation = (fieldName: string, originalValue: string): string | null => {
        const translation = productTranslations?.[fieldName]?.[language as SupportedLanguage];
        if (!translation || translation === originalValue) return null;
        return translation;
    };

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
                        <p className="font-medium">{product.sku || t('value_default')}</p>
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

                {/* Dynamic fields in pairs */}
                {pairs.map((pair, pairIndex) => (
                    <div key={pairIndex} className="grid grid-cols-2 gap-x-8">
                        {pair.map((fieldConfig) => {
                            const fieldValue = (product as any)[fieldConfig.name];
                            const translation = fieldValue ? getTranslation(fieldConfig.name, fieldValue) : null;
                            return (
                                <div key={fieldConfig.name}>
                                    <span className="text-muted-foreground">{t(fieldConfig.label)}:</span>
                                    <p className="font-medium">{fieldValue || t('value_default')}</p>
                                    {translation && (
                                        <p className="text-xs text-muted-foreground italic mt-0.5 bg-muted/60 rounded px-2 py-0.5">
                                            {translation}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}

                {/* Textarea fields (e.g. Special Notes) */}
                {textareaFields.map((fieldConfig) => {
                    const fieldValue = (product as any)[fieldConfig.name];
                    if (!fieldValue) return null;
                    const translation = getTranslation(fieldConfig.name, fieldValue);
                    return (
                        <div key={fieldConfig.name} className="col-span-2 mt-2">
                            <span className="text-muted-foreground">{t(fieldConfig.label)}:</span>
                            <p className="font-medium whitespace-pre-wrap break-all bg-muted/40 rounded-md px-3 py-2 text-sm mt-1">
                                {fieldValue}
                            </p>
                            {translation && (
                                <p className="text-xs text-muted-foreground italic mt-1 bg-muted/60 rounded px-2 py-1 whitespace-pre-wrap">
                                    {translation}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}