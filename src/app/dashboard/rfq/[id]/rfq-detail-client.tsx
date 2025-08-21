"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { ArrowLeft, Edit, CheckCircle, Clock, Send, XCircle, Eye, X, Upload } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { rfqFormSchema } from '@/lib/schemas';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { MOCK_USERS } from '@/lib/data';
import type { RFQ, Quote, RFQStatus, Product } from '@/lib/types';
import { QuoteDialog } from '@/components/quote-dialog';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/use-notifications';

export default function RFQDetailClient() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const { user } = useAuth();
    const { toast } = useToast();
    const { createNotification } = useNotifications();
    const [rfq, setRfq] = useState<RFQ | null>(null);
    const [creator, setCreator] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);
    const [purchasingUsers, setPurchasingUsers] = useState<any[]>([]);
    const [editingImages, setEditingImages] = useState<{[productIndex: number]: {existing: string[], new: File[]}}>({});

    const editForm = useForm({
        resolver: zodResolver(rfqFormSchema),
        defaultValues: {
            customerType: '',
            customerEmail: '',
            assignedPurchaserIds: [],
            products: []
        }
    });
    
    const { fields: editProductFields, append: addEditProduct, remove: removeEditProduct } = useFieldArray({
        control: editForm.control,
        name: 'products',
    });

    useEffect(() => {
        const fetchRfq = async () => {
            if (params.id) {
                const docRef = doc(db, "rfqs", params.id as string);
                const docSnap = await getDoc(docRef);
    
                if (docSnap.exists()) {
                    const rfqData = { 
                        id: docSnap.id, 
                        ...docSnap.data(),
                        quotes: docSnap.data().quotes || []
                    } as RFQ;
                    console.log('📸 RFQ Products with images:', rfqData.products.map(p => ({
                        id: p.id,
                        sku: p.sku,
                        imageCount: p.images?.length || 0,
                        images: p.images
                    })));
                    
                    setRfq(rfqData);
                    
                    const { getDocs, collection } = await import('firebase/firestore');
                    const usersSnapshot = await getDocs(collection(db, 'users'));
                    const users = usersSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setUsers(users);

                    const activePurchasingUsers = users.filter(u => 
                        u.role === 'Purchasing' && u.status === 'Active'
                    );
                    setPurchasingUsers(activePurchasingUsers);
                    
                    const foundCreator = users.find(u => u.id === rfqData.creatorId);
                    setCreator(foundCreator || null);
                } else {
                    toast({
                        variant: "destructive",
                        title: "Not Found",
                        description: "The requested RFQ could not be found.",
                    });
                    router.push('/dashboard');
                }
            }
            setLoading(false);
        };
    
        fetchRfq();
    }, [params.id, router, toast]);

    const getPurchaser = (purchaserId: string) => users.find(u => u.id === purchaserId);

    const getStatusVariant = (status: RFQStatus) => {
        switch (status) {
            case 'Waiting for Quote': return 'secondary';
            case 'Quotation in Progress': return 'default';
            case 'Quotation Completed': return 'outline';
            case 'Archived': return 'destructive';
            default: return 'secondary';
        }
    };

    const handleAcceptQuote = async (productId: string, purchaserId: string) => {
        if (!rfq || !user || user.role !== 'Sales') return;

        try {
            const acceptedQuote = rfq.quotes.find(q => q.productId === productId && q.purchaserId === purchaserId);
            if (!acceptedQuote) throw new Error("Quote not found");

            const updatedQuotes = rfq.quotes.map(q => {
                if (q.productId === productId) {
                    return q.purchaserId === purchaserId
                        ? { ...q, status: 'Accepted' as const }
                        : { ...q, status: 'Rejected' as const };
                }
                return q;
            });

            const allProductsQuoted = rfq.products.every(p =>
                updatedQuotes.some(q => q.productId === p.id && q.status === 'Accepted')
            );
            const newStatus = allProductsQuoted ? 'Quotation Completed' : rfq.status;

            const updatedRfqData = {
                quotes: updatedQuotes,
                status: newStatus
            };

            const docRef = doc(db, "rfqs", rfq.id);
            await updateDoc(docRef, updatedRfqData);

            const updatedRfq = { ...rfq, ...updatedRfqData };
            setRfq(updatedRfq);

            createNotification({
                recipientId: acceptedQuote.purchaserId,
                titleKey: 'notification_quote_accepted_title',
                bodyKey: 'notification_quote_accepted_body',
                bodyParams: { rfqCode: rfq.rfqCode || rfq.code, productName: rfq.products.find(p => p.id === productId)?.sku || '' },
                href: `/dashboard/rfq/${rfq.id}`,
            });

            toast({
                title: "Quote Accepted",
                description: "The quote has been accepted.",
            });
        } catch (error) {
            console.error("Error accepting quote: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to accept the quote.' });
        }
    };

    const handleQuoteSubmit = async (productId: string, price: number, deliveryDate: Date, existingQuote?: Quote) => {
        if (!rfq || !user) return;
        try {
            let updatedQuotes: Quote[];
            const isUpdate = !!existingQuote;

            if (isUpdate) {
                updatedQuotes = rfq.quotes.map(q =>
                    q.productId === productId && q.purchaserId === user.id
                        ? { ...q, price, deliveryDate: deliveryDate.toISOString(), quoteTime: new Date().toISOString() }
                        : q
                );
            } else {
                const newQuote: Quote = {
                    id: `quote-${Date.now()}`,
                    rfqId: rfq.id,
                    productId,
                    purchaserId: user.id,
                    price,
                    deliveryDate: deliveryDate.toISOString(),
                    quoteTime: new Date().toISOString(),
                    status: 'Pending Acceptance',
                    notes: ''
                };
                updatedQuotes = [...rfq.quotes, newQuote];
            }

            const updatedRfqData = {
                quotes: updatedQuotes,
                status: 'Quotation in Progress' as RFQStatus,
            };

            const docRef = doc(db, "rfqs", rfq.id);
            await updateDoc(docRef, updatedRfqData);

            const updatedRfq = { ...rfq, ...updatedRfqData };
            setRfq(updatedRfq);

            createNotification({
                recipientId: rfq.creatorId,
                titleKey: isUpdate ? 'notification_quote_updated_title' : 'notification_new_quote_title',
                bodyKey: isUpdate ? 'notification_quote_updated_body' : 'notification_new_quote_body',
                bodyParams: { purchaserName: user.name, rfqCode: rfq.rfqCode || rfq.code },
                href: `/dashboard/rfq/${rfq.id}`,
            });

            toast({
                title: isUpdate ? "Quote Updated" : "Quote Submitted",
                description: `Your quote for product ${rfq.products.find(p => p.id === productId)?.sku} has been saved.`,
            });
        } catch (error) {
            console.error("Error submitting quote: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit the quote.' });
        }
    };


const handleSaveRfq = async () => {
        if (!rfq || !user) return;
    
        try {
            const formData = editForm.getValues();
            
            const isValid = await editForm.trigger();
            if (!isValid) {
                toast({
                    variant: "destructive",
                    title: "Validation Error",
                    description: "Please check all required fields.",
                });
                return;
            }
    
            // Process images for each product
            const updatedProducts = await Promise.all(
                formData.products.map(async (product, productIndex) => {
                    const imageState = editingImages[productIndex] || { existing: [], new: [] };
                    
                    // Upload new images
                    let newImageUrls: string[] = [];
                    if (imageState.new.length > 0) {
                        const uploadPromises = imageState.new.map(async (file, index) => {
                            try {
                                const fileName = `rfqs/${rfq.id}/${product.id}/${Date.now()}_${index}_${file.name}`;
                                const storageRef = ref(storage, fileName);
                                const snapshot = await uploadBytes(storageRef, file);
                                const downloadURL = await getDownloadURL(snapshot.ref);
                                return downloadURL;
                            } catch (error) {
                                console.error('Error uploading image:', error);
                                return null;
                            }
                        });
    
                        const results = await Promise.all(uploadPromises);
                        newImageUrls = results.filter((url): url is string => url !== null);
                    }
                    
                    // Combine existing images (that weren't deleted) with new uploaded images
                    const finalImages = [...imageState.existing, ...newImageUrls];
                    
                    return {
                        ...product,
                        images: finalImages
                    };
                })
            );
    
            const updatedRfqData = {
                customerType: formData.customerType,
                customerEmail: formData.customerEmail,
                assignedPurchaserIds: formData.assignedPurchaserIds,
                products: updatedProducts,
                updatedAt: new Date().toISOString(),
                updatedBy: user.id
            };
    
            const docRef = doc(db, "rfqs", rfq.id);
            await updateDoc(docRef, updatedRfqData);
    
            const updatedRfq = { ...rfq, ...updatedRfqData };
            setRfq(updatedRfq);
            setIsEditing(false);
            setEditingImages({}); // Clear editing images state
    
            toast({
                title: "RFQ Updated",
                description: "The RFQ has been successfully updated.",
            });
    
        } catch (error) {
            console.error("Error updating RFQ:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update the RFQ. Please try again.",
            });
        }
    };

    const handleRemoveImage = (productIndex: number, imageIndex: number) => {
        setEditingImages(prev => {
            const updated = { ...prev };
            if (!updated[productIndex]) {
                updated[productIndex] = { existing: [], new: [] };
            }
            updated[productIndex] = {
                ...updated[productIndex],
                existing: updated[productIndex].existing.filter((_, i) => i !== imageIndex)
            };
            return updated;
        });
    };

    const handleAddImages = (productIndex: number, files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        const fileArray = Array.from(files);
        const currentImages = editingImages[productIndex] || { existing: [], new: [] };
        const totalCurrentImages = currentImages.existing.length + currentImages.new.length;
        
        console.log('Adding images:', {
            productIndex,
            filesCount: fileArray.length,
            existingCount: currentImages.existing.length,
            newCount: currentImages.new.length,
            totalCurrentImages,
            wouldExceedLimit: totalCurrentImages + fileArray.length > 5
        });
        
        // Check if adding these files would exceed the limit
        if (totalCurrentImages + fileArray.length > 5) {
            toast({
                variant: "destructive",
                title: "Too Many Images",
                description: `Maximum 5 images allowed per product. You currently have ${totalCurrentImages} images.`,
            });
            return;
        }
        
        setEditingImages(prev => {
            const updated = { ...prev };
            if (!updated[productIndex]) {
                updated[productIndex] = { existing: [], new: [] };
            }
            updated[productIndex] = {
                ...updated[productIndex],
                new: [...updated[productIndex].new, ...fileArray]
            };
            return updated;
        });
    };

    const ImageModal = () => {
        if (!selectedImage) return null;
        
        return (
          <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
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
                  onClick={() => setIsImageModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      };
    
    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!rfq) {
        return null;
    }

    const isUserAssigned = rfq.assignedPurchaserIds?.includes(user?.id || '') || false;
    
    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            {t('rfq_detail_title')} {rfq.rfqCode || rfq.code || `RFQ-${rfq.id.slice(0,6)}`}
                            <Badge variant={getStatusVariant(rfq.status)}>{t(`status_${rfq.status.toLowerCase().replace(/ /g, '_')}`)}</Badge>
                        </h1>
                        <p className="text-muted-foreground">
                            {t('field_label_inquiry_time')}: {
                                rfq.inquiryTime?.seconds 
                                    ? new Date(rfq.inquiryTime.seconds * 1000).toLocaleString()
                                    : rfq.inquiryTime 
                                        ? new Date(rfq.inquiryTime).toLocaleString()
                                        : 'N/A'
                            }
                        </p>
                    </div>
                </div>
                
                {/* Edit button - only show for creator when status is "Waiting for Quote" */}
                {user?.role === 'Sales' && 
                 rfq.creatorId === user?.id && 
                 rfq.status === 'Waiting for Quote' && (
                    <div className="flex gap-2">
                        {!isEditing ? (
                            <Button onClick={() => {
                                setIsEditing(true);
                                // Initialize form with current RFQ data
                                editForm.reset({
                                    customerType: rfq.customerType,
                                    customerEmail: rfq.customerEmail,
                                    assignedPurchaserIds: rfq.assignedPurchaserIds,
                                    products: rfq.products.map(p => ({
                                        id: p.id,
                                        wlid: p.wlid,
                                        productSeries: p.productSeries,
                                        sku: p.sku,
                                        hairFiber: p.hairFiber,
                                        cap: p.cap,
                                        capSize: p.capSize,
                                        length: p.length,
                                        density: p.density,
                                        color: p.color,
                                        curlStyle: p.curlStyle,
                                        images: p.images || []
                                    }))
                                });
                                const imageState: {[productIndex: number]: {existing: string[], new: File[]}} = {};
                                rfq.products.forEach((product, index) => {
                                    imageState[index] = {
                                        existing: product.images || [],
                                        new: []
                                    };
                                });
                                setEditingImages(imageState);  
                            }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit RFQ
                            </Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setIsEditing(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveRfq}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Save Changes
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content Grid */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {isEditing && (
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
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Wig">Wig</SelectItem>
                                                                    <SelectItem value="Hair Extension">Hair Extension</SelectItem>
                                                                    <SelectItem value="Topper">Topper</SelectItem>
                                                                    <SelectItem value="Toupee">Toupee</SelectItem>
                                                                    <SelectItem value="Synthetic Product">Synthetic Product</SelectItem>
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
                                                            <FormControl>
                                                                <Input {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={editForm.control}
                                                    name={`products.${productIndex}.hairFiber`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Hair Fiber</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={editForm.control}
                                                    name={`products.${productIndex}.cap`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Cap</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={editForm.control}
                                                    name={`products.${productIndex}.capSize`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Cap Size</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={editForm.control}
                                                    name={`products.${productIndex}.length`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Length</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={editForm.control}
                                                    name={`products.${productIndex}.density`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Density</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={editForm.control}
                                                    name={`products.${productIndex}.color`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Color</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={editForm.control}
                                                name={`products.${productIndex}.curlStyle`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Curl Style</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            {/* Image Upload Section */}
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
                                                                        handleAddImages(productIndex, e.target.files);
                                                                        e.target.value = '';
                                                                    }}
                                                                />
                                                            </label>
                                                        </div>
                                                        
                                                        {/* Display existing images */}
                                                        {editingImages[productIndex]?.existing && editingImages[productIndex].existing.length > 0 && (
                                                            <div className="mt-4">
                                                                <p className="text-sm text-muted-foreground mb-2">Current Images:</p>
                                                                <div className="grid grid-cols-4 gap-2">
                                                                    {editingImages[productIndex].existing.map((imageUrl, imgIndex) => (
                                                                        <div key={imgIndex} className="relative group">
                                                                            <img 
                                                                                src={imageUrl} 
                                                                                alt={`Product ${imgIndex + 1}`} 
                                                                                className="w-full h-20 object-cover rounded-lg border"
                                                                            />
                                                                            <Button
                                                                                type="button"
                                                                                variant="destructive"
                                                                                size="icon"
                                                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                onClick={() => handleRemoveImage(productIndex, imgIndex)}
                                                                            >
                                                                                <X className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Display new images to be uploaded */}
                                                        {editingImages[productIndex]?.new && editingImages[productIndex].new.length > 0 && (
                                                            <div className="mt-4">
                                                                <p className="text-sm text-muted-foreground mb-2">New Images to Upload:</p>
                                                                <div className="grid grid-cols-4 gap-2">
                                                                    {editingImages[productIndex].new.map((file, imgIndex) => (
                                                                        <div key={imgIndex} className="relative group">
                                                                            <img 
                                                                                src={URL.createObjectURL(file)} 
                                                                                alt={`New ${imgIndex + 1}`} 
                                                                                className="w-full h-20 object-cover rounded-lg border"
                                                                            />
                                                                            <Button
                                                                                type="button"
                                                                                variant="destructive"
                                                                                size="icon"
                                                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                onClick={() => {
                                                                                    setEditingImages(prev => {
                                                                                        const updated = { ...prev };
                                                                                        updated[productIndex] = {
                                                                                            ...updated[productIndex],
                                                                                            new: updated[productIndex].new.filter((_, i) => i !== imgIndex)
                                                                                        };
                                                                                        return updated;
                                                                                    });
                                                                                }}
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
                    )}
                    
                    {!isEditing && rfq.products.map((product, productIndex) => {
                        const quotes = rfq.quotes || [];
                        const productQuotes = quotes.filter(q => q.productId === product.id);
                        const userQuote = productQuotes.find(q => q.purchaserId === user?.id);
                        const acceptedQuote = productQuotes.find(q => q.status === 'Accepted');
                        const canSalesAccept = user?.role === 'Sales' && !acceptedQuote && productQuotes.length > 0;
                        const canPurchaserQuote = user?.role === 'Purchasing' && 
                            rfq.assignedPurchaserIds?.includes(user?.id || '') && 
                            !userQuote && 
                            !acceptedQuote;

                        return (
                            <Card key={product.id}>
                                <CardHeader>
                                    <CardTitle>{product.sku || 'N/A'}</CardTitle>
                                    <CardDescription>WLID: {product.wlid}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {product.imageUrl && (
                                        <div className="mb-6 flex justify-center">
                                            <img src={product.imageUrl} alt={product.sku} className="max-h-60 object-contain rounded-md" />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
                                        <div>
                                            <span className="text-muted-foreground">Product Series:</span>
                                            <p className="font-medium">{product.productSeries}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">SKU:</span>
                                            <p className="font-medium">{product.sku || 'N/A'}</p>
                                            </div>
                                            <div>
                                            <span className="text-muted-foreground">Hair Fiber:</span>
                                            <p className="font-medium">{product.hairFiber || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Cap:</span>
                                            <p className="font-medium">{product.cap || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Cap Size:</span>
                                            <p className="font-medium">{product.capSize || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Length:</span>
                                            <p className="font-medium">{product.length || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Density:</span>
                                            <p className="font-medium">{product.density || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Color:</span>
                                            <p className="font-medium">{product.color || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Curl Style:</span>
                                            <p className="font-medium">{product.curlStyle || 'N/A'}</p>
                                        </div>
                                    </div>
                                    {/* Product Images Display */}
                                    {product.images && product.images.length > 0 && (
                                       <div className="mt-4 mb-6">
                                        <span className="text-sm text-muted-foreground">Product Images:</span>
                                        <div className="grid grid-cols-4 gap-2 mt-2">
                                        {product.images.map((imageUrl, index) => (
                                        <div 
                                          key={index} 
                                          className="relative group cursor-pointer"
                                          onClick={() => {
                                            setSelectedImage(imageUrl);
                                            setIsImageModalOpen(true);
                                          }}
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
                                    
                                    <Separator />
                                    <div className="mt-4">
                                        <h4 className="font-semibold mb-2">Quotes</h4>
                                        {productQuotes.length === 0 && <p className="text-sm text-muted-foreground">No quotes submitted yet.</p>}
                                        <div className="space-y-4">
                                            {productQuotes.map(quote => (
                                                <div key={quote.id || quote.purchaserId} className={`flex items-center justify-between p-3 rounded-lg ${quote.status === 'Accepted' ? 'bg-green-100 dark:bg-green-900/50' : 'bg-muted/50'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={getPurchaser(quote.purchaserId)?.avatar} />
                                                            <AvatarFallback>{getPurchaser(quote.purchaserId)?.name?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-semibold">{getPurchaser(quote.purchaserId)?.name}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Quoted on: {new Date(quote.quoteTime).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold">${quote.price.toFixed(2)}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Delivery: {new Date(quote.deliveryDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    {canSalesAccept && (
                                                        <Button size="sm" variant="outline" onClick={() => handleAcceptQuote(product.id, quote.purchaserId)}>
                                                            <CheckCircle className="mr-2 h-4 w-4" /> Accept
                                                        </Button>
                                                    )}
                                                    {quote.status === 'Accepted' && <Badge variant="default" className="bg-green-500">Accepted</Badge>}
                                                    {quote.status === 'Rejected' && <Badge variant="destructive">Rejected</Badge>}
                                                </div>
                                            ))}
                                        </div>
                                        {user?.role === 'Purchasing' && isUserAssigned && !acceptedQuote && (
                                            <QuoteDialog 
                                                product={product}
                                                userQuote={userQuote}
                                                onQuoteSubmit={handleQuoteSubmit}
                                            >
                                                <Button className="mt-4 w-full" variant={userQuote ? 'outline' : 'default'}>
                                                    {userQuote ? <><Edit className="mr-2 h-4 w-4" /> Edit Your Quote</> : <><Send className="mr-2 h-4 w-4" /> Submit Your Quote</>}
                                                </Button>
                                            </QuoteDialog>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer & Creator</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!isEditing ? (
                                <>
                                    <div>
                                        <h4 className="font-semibold text-sm">Customer</h4>
                                        <p className="text-sm text-muted-foreground">{rfq.customerEmail}</p>
                                        <Badge variant="outline" className="mt-1">{rfq.customerType}</Badge>
                                    </div>
                                    <Separator />
                                    {creator && (
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={creator.avatar} />
                                                <AvatarFallback>{creator.name?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-sm">{creator.name}</p>
                                                <p className="text-xs text-muted-foreground">{creator.role}</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Form {...editForm}>
                                    <div className="space-y-4">
                                        <FormField
                                            control={editForm.control}
                                            name="customerEmail"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Customer Email</FormLabel>
                                                    <FormControl>
                                                        <Input type="email" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={editForm.control}
                                            name="customerType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Customer Type</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="New">New</SelectItem>
                                                            <SelectItem value="Returning">Returning</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </Form>
                            )}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Assigned Purchasers</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {!isEditing ? (
                                <>
                                    {rfq.assignedPurchaserIds?.map(id => {
                                        const pUser = getPurchaser(id);
                                        if (!pUser) return null;
                                        return (
                                            <div key={id} className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={pUser.avatar} />
                                                    <AvatarFallback>{pUser.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold text-sm">{pUser.name}</p>
                                                    <p className="text-xs text-muted-foreground">{pUser.email}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                <Form {...editForm}>
                                    <FormField
                                        control={editForm.control}
                                        name="assignedPurchaserIds"
                                        render={() => (
                                            <FormItem>
                                                <FormLabel>Select Purchasers</FormLabel>
                                                <div className="space-y-2">
                                                    {purchasingUsers.map((pUser) => (
                                                        <FormField
                                                            key={pUser.id}
                                                            control={editForm.control}
                                                            name="assignedPurchaserIds"
                                                            render={({ field }) => {
                                                                return (
                                                                    <FormItem key={pUser.id} className="flex flex-row items-start space-x-3 space-y-0">
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={field.value?.includes(pUser.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    return checked
                                                                                        ? field.onChange([...(field.value || []), pUser.id])
                                                                                        : field.onChange(field.value?.filter((value) => value !== pUser.id));
                                                                                }}
                                                                            />
                                                                        </FormControl>
                                                                        <FormLabel className="font-normal">
                                                                            {pUser.name}
                                                                        </FormLabel>
                                                                    </FormItem>
                                                                );
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </Form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <ImageModal />
        </div>
    );
}