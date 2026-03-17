"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ImageModalProps {
    selectedImage: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ImageModal({ selectedImage, isOpen, onClose }: ImageModalProps) {
    if (!selectedImage) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>Product Image</DialogTitle>
                </DialogHeader>
                <div className="relative">
                    <img
                        src={selectedImage}
                        alt="Product image"
                        className="w-full h-full object-contain"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
