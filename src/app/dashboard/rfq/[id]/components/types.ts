import type { RFQ, Quote, RFQStatus, Product, User } from '@/lib/types';

export type { RFQ, Quote, RFQStatus, Product, User };

export type EditingImages = {
    [productIndex: number]: {
        existing: string[];
        new: File[];
    };
};

export type TranslatedFields = {
    [productId: string]: {
        [fieldName: string]: string;
    };
};
