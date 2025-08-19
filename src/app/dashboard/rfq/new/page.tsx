"use client";

import { getFunctions, httpsCallable } from 'firebase/functions';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Trash2, Upload, FileEdit, Save, Sparkles, AlertCircle, X } from 'lucide-react';
import { debounce } from 'lodash';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useI18n } from '@/hooks/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp, getDocs, query, where,updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { rfqFormSchema } from '@/lib/schemas';
import type { ProductSeries, RFQ, Product, Quote, User } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { Textarea } from '@/components/ui/textarea';
import { getApp } from 'firebase/app';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type RfqFormValues = z.infer<typeof rfqFormSchema>;

const productSeriesOptions: ProductSeries[] = ['Wig', 'Hair Extension', 'Topper', 'Toupee', 'Synthetic Product'];

const wlidPrefixMap: Record<ProductSeries, string> = {
    'Wig': 'FTCV',
    'Hair Extension': 'FTCE',
    'Topper': 'FTCP',
    'Toupee': 'FTCU',
    'Synthetic Product': 'FTCS',
};

const generateWlid = async (productSeries: ProductSeries): Promise<string> => {
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
                        if (!isNaN(suffix) && suffix > maxSuffix) {
                            maxSuffix = suffix;
                        }
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error generating WLID:', error);
    }

    const newSuffix = (maxSuffix + 1).toString().padStart(4, '0');
    return `${prefix}${newSuffix}`;
};
// Helper function to upload images to Firebase Storage
const uploadImages = async (files: File[], rfqId: string, productId: string): Promise<string[]> => {
    if (!storage) {
        console.error('Firebase Storage not initialized');
        return [];
    }

    const uploadPromises = files.map(async (file, index) => {
        try {
            const fileName = `rfqs/${rfqId}/${productId}/${Date.now()}_${index}_${file.name}`;
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
    return results.filter((url): url is string => url !== null);
};

function ProductRow({ 
    index, 
    control, 
    remove, 
    setValue, 
    onSimilarQuotesFound 
}: { 
    index: number, 
    control: any, 
    remove: (index: number) => void, 
    setValue: any, 
    onSimilarQuotesFound: (quotes: Quote[]) => void 
}) {
    const productData = useWatch({
        control,
        name: `products.${index}`,
    });

    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

    const debouncedFindQuotes = useMemo(
        () =>
            debounce(async (product: Product) => {
                if (!product.productSeries) return;

                const filledFields = Object.values(product).filter(v => v && typeof v === 'string').length;
                if (filledFields < 6) return;

                try {
                  const functions = getFunctions(getApp());
                  const findSimilarQuotesFunction = httpsCallable(functions, 'findSimilarQuotes');
                  const response = await findSimilarQuotesFunction(product);
                  const similarQuotesResult = response.data as { result?: Quote[] };

                  if (similarQuotesResult?.result && similarQuotesResult.result.length > 0) {
                      onSimilarQuotesFound(similarQuotesResult.result);
                  }
                } catch (error) {
                    console.error("Failed to fetch similar quotes:", error);
                }
            }, 1000),
        [onSimilarQuotesFound]
    );

    useEffect(() => {
        if(productData) {
            debouncedFindQuotes(productData);
        }
    }, [productData, debouncedFindQuotes]);

    useEffect(() => {
        if (productData?.productSeries) {
            generateWlid(productData.productSeries).then(newWlid => {
                setValue(`products.${index}.wlid`, newWlid, { shouldValidate: true });
            });
        }
    }, [productData?.productSeries, index, setValue]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + selectedImages.length > 5) {
            alert('Maximum 5 images allowed per product');
            return;
        }

        setSelectedImages(prev => [...prev, ...files]);
        
        // Create preview URLs
        const newPreviewUrls = files.map(file => URL.createObjectURL(file));
        setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
        
        // Store files in form data for later upload
        setValue(`products.${index}.imageFiles`, [...selectedImages, ...files]);
    };

    const removeImage = (imageIndex: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== imageIndex));
        setImagePreviewUrls(prev => prev.filter((_, i) => i !== imageIndex));
        setValue(`products.${index}.imageFiles`, selectedImages.filter((_, i) => i !== imageIndex));
    };

    return (
        <div className="border rounded-lg p-4 space-y-4 relative">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
            <div className="grid sm:grid-cols-1 gap-4">
                <FormField control={control} name={`products.${index}.productSeries`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Series</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {productSeriesOptions.map(series => <SelectItem key={series} value={series}>{series}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
                <FormField control={control} name={`products.${index}.wlid`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>WLID</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name={`products.${index}.sku`} render={({ field }) => (
                  <FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <div className="space-y-4">
              <FormField control={control} name={`products.${index}.hairFiber`} render={({ field }) => (
                <FormItem><FormLabel>Hair Fiber</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={control} name={`products.${index}.cap`} render={({ field }) => (
                 <FormItem><FormLabel>Cap</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={control} name={`products.${index}.capSize`} render={({ field }) => (
                 <FormItem><FormLabel>Cap Size</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={control} name={`products.${index}.length`} render={({ field }) => (
                 <FormItem><FormLabel>Length</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={control} name={`products.${index}.density`} render={({ field }) => (
                 <FormItem><FormLabel>Density</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={control} name={`products.${index}.color`} render={({ field }) => (
                 <FormItem><FormLabel>Color</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={control} name={`products.${index}.curlStyle`} render={({ field }) => (
                 <FormItem><FormLabel>Curls</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            
            {/* Image Upload Section */}
            <FormItem>
                <FormLabel>Images</FormLabel>
                <FormControl>
                    <div className="space-y-4">
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor={`dropzone-file-${index}`} className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-muted-foreground">Each image is limited to 3MB, and a maximum of 5 images can be uploaded</p>
                                </div>
                                <Input 
                                    id={`dropzone-file-${index}`} 
                                    type="file" 
                                    className="hidden" 
                                    multiple 
                                    accept="image/*"
                                    onChange={handleImageChange}
                                />
                            </label>
                        </div>
                        
                        {/* Image Previews */}
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
        </div>
    );
}

function AiExtractDialog({ onApply }: { onApply: (data: any) => void }) {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const { t } = useI18n();

    const handleExtract = async () => {
        if (!text.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter some text to extract.' });
            return;
        }
        setIsLoading(true);
        try {
            const functions = getFunctions(getApp());
            const extractRfqDataFunction = httpsCallable(functions, 'extractrfq');
            const result = await extractRfqDataFunction({ inputText: text });
            onApply(result.data);
            setIsOpen(false);
            toast({ title: 'Extraction Successful', description: 'The form has been pre-filled with the extracted data.' });
        } catch (error) {
            console.error('AI extraction failed:', error);
            toast({ variant: 'destructive', title: 'Extraction Failed', description: 'Could not extract details from the provided text.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-gradient-to-r from-purple-400 to-pink-500 text-white border-none hover:from-purple-500 hover:to-pink-600 hover:text-white">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('button_ai_extract')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>AI RFQ Extraction</DialogTitle>
                    <DialogDescription>
                        Paste the RFQ details from an email or message, and the AI will attempt to fill out the form for you.
                    </DialogDescription>
                </DialogHeader>
                <Textarea
                    placeholder="e.g., 'New customer rfq@example.com wants a quote for two products. First is a Remy Wig SKU W-123, 18 inches, color Natural Black. Second is a topper, SKU T-456. Please assign to Purchasing Agent.'"
                    rows={8}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleExtract} disabled={isLoading}>
                        {isLoading ? "Extracting..." : "Extract and Apply"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function NewRfqPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createNotification } = useNotifications();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [formData, setFormData] = useState<RfqFormValues | null>(null);
  const [similarQuotes, setSimilarQuotes] = useState<Quote[]>([]);
  const [isSimilarQuotesDialogOpen, setIsSimilarQuotesDialogOpen] = useState(false);
  const [purchasingUsers, setPurchasingUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [rfqCount, setRfqCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPurchasingUsers = async () => {
      try {
        const usersQuery = query(
          collection(db, 'users'), 
          where('role', '==', 'Purchasing'),
          where('status', '==', 'Active')
        );
        const snapshot = await getDocs(usersQuery);
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        setPurchasingUsers(users);
      } catch (error) {
        console.error('Error fetching purchasing users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    const fetchRfqCount = async () => {
      try {
        const rfqsSnapshot = await getDocs(collection(db, 'rfqs'));
        setRfqCount(rfqsSnapshot.size);
      } catch (error) {
        console.error('Error fetching RFQ count:', error);
      }
    };
  
    fetchPurchasingUsers();
    fetchRfqCount();
  }, []);

  const handleSimilarQuotesFound = useCallback((quotes: Quote[]) => {
    setSimilarQuotes(quotes);
    setIsSimilarQuotesDialogOpen(true);
  }, []);

  const defaultProductSeries: ProductSeries = 'Wig';
  const [defaultWlid, setDefaultWlid] = useState<string>('');

  useEffect(() => {
    generateWlid(defaultProductSeries).then(wlid => {
      setDefaultWlid(wlid);
    });
  }, []);

  const defaultValues: RfqFormValues = {
    customerType: 'New',
    customerEmail: '',
    assignedPurchaserIds: [],
    products: [{
      id: `prod-${Date.now()}`,
      wlid: defaultWlid,
      productSeries: defaultProductSeries,
      sku: '',
      hairFiber: '',
      cap: '',
      capSize: '',
      length: '',
      density: '',
      color: '',
      curlStyle: '',
      images: [],
    }],
  };

  const form = useForm<RfqFormValues>({
    resolver: zodResolver(rfqFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'products',
  });

  const onPreview = (data: RfqFormValues) => {
    setFormData(data);
    setIsPreviewOpen(true);
  };

  const handleSave = async () => {
     if (!formData || !user) return;

     setIsSaving(true);
     try {
        const newRfqCode = `RFQ-${String(rfqCount + 1).padStart(4, '0')}`;
        
        // Create RFQ document first to get the ID
        const newRfqData = {
            rfqCode: newRfqCode,
            customerType: formData.customerType,
            customerEmail: formData.customerEmail,
            assignedPurchaserIds: formData.assignedPurchaserIds, // This ensures purchaser IDs are saved
            products: [], // Will update with image URLs
            inquiryTime: serverTimestamp(),
            creatorId: user.id,
            status: 'Waiting for Quote',
            quotes: [] // Initialize empty quotes array
        };

        const docRef = await addDoc(collection(db, "rfqs"), newRfqData);
        const newRfqId = docRef.id;

        // Upload images for each product and update products with image URLs
        const productsWithImages = await Promise.all(
            formData.products.map(async (product: any) => {
                let imageUrls: string[] = [];
                
                // Check if there are image files to upload
                if (product.imageFiles && product.imageFiles.length > 0) {
                    imageUrls = await uploadImages(product.imageFiles, newRfqId, product.id);
                }
                
                // Remove imageFiles from the product object and add imageUrls
                const { imageFiles, ...productData } = product;
                return {
                    ...productData,
                    images: imageUrls
                };
            })
        );

        // Update the RFQ document with products that have image URLs
        await updateDoc(doc(db, "rfqs", newRfqId), {
            products: productsWithImages
        });

        // Send notifications to assigned purchasers
        for (const purchaserId of formData.assignedPurchaserIds) {
            await createNotification({
                recipientId: purchaserId,
                titleKey: 'notification_new_rfq_title',
                bodyKey: 'notification_new_rfq_body',
                bodyParams: { rfqCode: newRfqCode, salesName: user.name },
                href: `/dashboard/rfq/${newRfqId}`,
            });
        }

        toast({
            title: "RFQ Created",
            description: "The new RFQ has been successfully created and purchasers have been notified.",
        });
        setIsPreviewOpen(false);
        router.push('/dashboard');
     } catch (error) {
         console.error("Error creating RFQ: ", error);
         toast({
             variant: "destructive",
             title: "Error",
             description: "There was an error creating the RFQ. Please try again.",
         });
     } finally {
         setIsSaving(false);
     }
  };
  const [isSaving, setIsSaving] = useState(false);

  const addProduct = async () => {
    const newProductSeries: ProductSeries = 'Wig';
    const newWlid = await generateWlid(newProductSeries);
    
    append({
        id: `prod-${Date.now()}`,
        wlid: newWlid,
        productSeries: newProductSeries,
        sku: '',
        hairFiber: '',
        cap: '',
        capSize: '',
        length: '',
        density: '',
        color: '',
        curlStyle: '',
        images: []
    });
  }

  const getPurchaserName = (id: string) => purchasingUsers.find(u => u.id === id)?.name || 'Unknown';

  const handleAiApply = async (extractedData: any) => {
    const data = extractedData.result || {};
    const newValues: RfqFormValues = { ...defaultValues, ...data };

    const products = (data.products && data.products.length > 0) ? data.products : defaultValues.products;

    const populatedProducts = await Promise.all(products.map(async (p: any) => ({
        id: `prod-${Date.now()}-${Math.random()}`,
        wlid: p.wlid || await generateWlid(p.productSeries || defaultProductSeries),
        ...p
    })));

    form.reset({
      ...newValues,
      products: populatedProducts,
    });
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('create_new_rfq_title')}</h1>
            <p className="text-muted-foreground">Fill in the details to create a new request for quotation.</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onPreview)} className="space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Products</CardTitle>
                        <AiExtractDialog onApply={handleAiApply} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {fields.map((field, index) => (
                      <ProductRow
                        key={field.id}
                        index={index}
                        control={form.control}
                        remove={remove}
                        setValue={form.setValue}
                        onSimilarQuotesFound={handleSimilarQuotesFound}
                        />
                    ))}
                    <Button type="button" variant="outline" onClick={addProduct}>
                      <Plus className="mr-2 h-4 w-4" /> Add Another Product
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="customerType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                           <SelectContent>
                             <SelectItem value="New">New</SelectItem>
                             <SelectItem value="Returning">Returning</SelectItem>
                           </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="customerEmail" render={({ field }) => (
                      <FormItem><FormLabel>Customer Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Assign Purchaser</CardTitle>
                  </CardHeader>
                   <CardContent>
                      {loadingUsers ? (
                        <div className="text-center py-4">Loading purchasers...</div>
                      ) : (
                        <FormField
                            control={form.control}
                            name="assignedPurchaserIds"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Select Purchasers</FormLabel>
                                    <div className="space-y-2">
                                        {purchasingUsers.map((pUser) => (
                                            <FormField
                                                key={pUser.id}
                                                control={form.control}
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
                      )}
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>Cancel</Button>
              <Button type="submit">Create RFQ</Button>
            </div>
          </form>
        </Form>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>RFQ Preview</DialogTitle>
            <DialogDescription>
              Please review the RFQ details below before saving.
            </DialogDescription>
          </DialogHeader>
          {formData && (
            <div className="grid gap-6 max-h-[60vh] overflow-y-auto p-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Customer Type</span><span>{formData.customerType}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Customer Email</span><span>{formData.customerEmail}</span></div>
                         <div className="flex justify-between items-start">
                            <span className="text-muted-foreground">Assigned Purchasers</span>
                            <div className="flex flex-col items-end gap-1">
                                {formData.assignedPurchaserIds.map(id => <Badge key={id} variant="secondary">{getPurchaserName(id)}</Badge>)}
                            </div>
                        </div>
                    </CardContent>
                </Card>

              {formData.products.map((product, index) => (
                <Card key={product.id}>
                    <CardHeader>
                        <CardTitle>Product {index + 1}: {product.sku}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                         <div className="flex justify-between"><span className="text-muted-foreground">Product Series</span><span>{product.productSeries}</span></div>
                         <div className="flex justify-between"><span className="text-muted-foreground">WLID</span><span>{product.wlid}</span></div>
                         <Separator />
                         <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <div><span className="font-medium text-muted-foreground">Hair Fiber:</span> {product.hairFiber}</div>
                            <div><span className="font-medium text-muted-foreground">Cap:</span> {product.cap}</div>
                            <div><span className="font-medium text-muted-foreground">Cap Size:</span> {product.capSize}</div>
                            <div><span className="font-medium text-muted-foreground">Length:</span> {product.length}</div>
                            <div><span className="font-medium text-muted-foreground">Density:</span> {product.density}</div>
                            <div><span className="font-medium text-muted-foreground">Color:</span> {product.color}</div>
                            <div><span className="font-medium text-muted-foreground">Curls:</span> {product.curlStyle}</div>
                         </div>
                    </CardContent>
                </Card>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              <FileEdit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                Saving...
                </>
            ) : (
            <>
            <Save className="mr-2 h-4 w-4" /> Save RFQ
            </>
            )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SimilarQuotesDialog
        open={isSimilarQuotesDialogOpen}
        onOpenChange={setIsSimilarQuotesDialogOpen}
        quotes={similarQuotes}
        purchasingUsers={purchasingUsers}
      />
    </>
  ); 
}

    