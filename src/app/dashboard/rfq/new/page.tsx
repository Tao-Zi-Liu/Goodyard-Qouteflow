
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Trash2, Upload, FileEdit, Save, Sparkles, AlertCircle } from 'lucide-react';
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
import { MOCK_USERS, MOCK_RFQS } from '@/lib/data';
import { rfqFormSchema } from '@/lib/schemas';
import type { ProductSeries, RFQ, Product, Quote } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { Textarea } from '@/components/ui/textarea';
import { extractRfqFormData } from '@/ai/flows/extract-rfq-flow';
import { findSimilarQuotes } from '@/ai/flows/find-similar-quotes-flow';
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

const generateWlid = (productSeries: ProductSeries): string => {
    const prefix = wlidPrefixMap[productSeries];
    let maxSuffix = 0;

    MOCK_RFQS.forEach(rfq => {
        rfq.products.forEach(product => {
            if (product.wlid.startsWith(prefix)) {
                const suffix = parseInt(product.wlid.substring(prefix.length), 10);
                if (suffix > maxSuffix) {
                    maxSuffix = suffix;
                }
            }
        });
    });

    const newSuffix = (maxSuffix + 1).toString().padStart(4, '0');
    return `${prefix}${newSuffix}`;
};


function ProductRow({ index, control, remove, setValue, onSimilarQuotesFound }: { index: number, control: any, remove: (index: number) => void, setValue: any, onSimilarQuotesFound: (quotes: Quote[]) => void }) {
    const productData = useWatch({
        control,
        name: `products.${index}`,
    });

    const debouncedFindQuotes = useMemo(
        () =>
            debounce(async (product: Product) => {
                if (!product.productSeries) return;
                
                const filledFields = Object.values(product).filter(v => v && typeof v === 'string').length;
                if (filledFields < 6) return;

                try {
                    const similarQuotes = await findSimilarQuotes(product);
                    if (similarQuotes.length > 0) {
                        onSimilarQuotesFound(similarQuotes);
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
            const newWlid = generateWlid(productData.productSeries);
            setValue(`products.${index}.wlid`, newWlid, { shouldValidate: true });
        }
    }, [productData?.productSeries, index, setValue]);

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
            <FormField control={control} name={`products.${index}.images`} render={({ field }) => (
                <FormItem>
                  <FormLabel>Images</FormLabel>
                    <FormControl>
                      <div className="flex items-center justify-center w-full">
                          <label htmlFor={`dropzone-file-${index}`} className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                  <p className="text-xs text-muted-foreground">Each image is limited to 3M, and a maximum of 5 images can be uploaded</p>
                              </div>
                              <Input id={`dropzone-file-${index}`} type="file" className="hidden" multiple onChange={(e) => field.onChange(Array.from(e.target.files || []))} />
                          </label>
                      </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
        </div>
    );
}

function AiExtractDialog({ onApply }: { onApply: (data: any) => void }) {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();

    const handleExtract = async () => {
        if (!text.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter some text to extract.' });
            return;
        }
        setIsLoading(true);
        try {
            const result = await extractRfqFormData({ inputText: text });
            onApply(result);
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
                <Button type="button" variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white">
                    <Sparkles className="mr-2 h-4 w-4 text-yellow-300" /> AI Extract
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Extract RFQ from Text</DialogTitle>
                    <DialogDescription>
                        Paste the RFQ details below, and the AI will attempt to pre-fill the form for you.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        placeholder="e.g., New customer at new@example.com needs a quote for a Wig, SKU W-123, Natural Black. Assign to Purchasing Agent."
                        className="min-h-[150px]"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleExtract} disabled={isLoading}>
                        {isLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div> : 'Extract & Apply'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SimilarQuotesDialog({ open, onOpenChange, quotes }: { open: boolean, onOpenChange: (open: boolean) => void, quotes: Quote[] }) {
    const getPurchaserName = (id: string) => MOCK_USERS.find(u => u.id === id)?.name || 'Unknown';
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Historical Quote Suggestion</DialogTitle>
                    <DialogDescription>
                       We found some similar historical quotes for your reference.
                    </DialogDescription>
                </DialogHeader>
                <div className="my-4 space-y-4 max-h-[50vh] overflow-y-auto">
                    {quotes.map((quote, index) => (
                         <Alert key={index}>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Quote from {getPurchaserName(quote.purchaserId)} on RFQ {quote.rfqId}</AlertTitle>
                            <AlertDescription>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="font-semibold text-lg text-primary">${quote.price.toFixed(2)}</span>
                                    <div className="text-right text-xs text-muted-foreground">
                                        <p>Quoted on: {new Date(quote.quoteTime).toLocaleDateString()}</p>
                                        <p>Delivery: {new Date(quote.deliveryDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
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
  
  const handleSimilarQuotesFound = useCallback((quotes: Quote[]) => {
    setSimilarQuotes(quotes);
    setIsSimilarQuotesDialogOpen(true);
  }, []);

  const purchasingUsers = MOCK_USERS.filter(u => u.role === 'Purchasing');

  const defaultProductSeries: ProductSeries = 'Wig';
  const defaultValues: RfqFormValues = {
    customerType: 'New',
    customerEmail: '',
    assignedPurchaserIds: [],
    products: [{
      id: `prod-${Date.now()}`,
      wlid: generateWlid(defaultProductSeries),
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
  
  const handleSave = () => {
     if (!formData || !user) return;
     const newRfqId = `rfq-${Date.now()}`;
     const newRfqCode = `RFQ-${String(MOCK_RFQS.length + 1).padStart(4, '0')}`;
     
     console.log('New RFQ Submitted', formData);

     formData.assignedPurchaserIds.forEach(purchaserId => {
        createNotification({
            recipientId: purchaserId,
            titleKey: 'notification_new_rfq_title',
            bodyKey: 'notification_new_rfq_body',
            bodyParams: { rfqCode: newRfqCode, salesName: user.name },
            href: `/dashboard/rfq/${newRfqId}`,
        });
     });

     toast({
       title: "RFQ Created",
       description: "The new RFQ has been successfully created and purchasers have been notified.",
     });
     setIsPreviewOpen(false);
     router.push('/dashboard');
  }

  const addProduct = () => {
    const newProductSeries: ProductSeries = 'Wig';
    append({
        id: `prod-${Date.now()}`,
        wlid: generateWlid(newProductSeries),
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
  
  const getPurchaserName = (id: string) => MOCK_USERS.find(u => u.id === id)?.name || 'Unknown';
  
  const handleAiApply = (extractedData: Partial<RfqFormValues>) => {
    const newValues: RfqFormValues = { ...defaultValues, ...extractedData };
    
    const products = (extractedData.products && extractedData.products.length > 0) ? extractedData.products : defaultValues.products;

    const populatedProducts = products.map(p => ({
        id: `prod-${Date.now()}-${Math.random()}`,
        wlid: p.wlid || generateWlid(p.productSeries || defaultProductSeries),
        ...p
    }));

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
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <SimilarQuotesDialog 
        open={isSimilarQuotesDialogOpen}
        onOpenChange={setIsSimilarQuotesDialogOpen}
        quotes={similarQuotes}
      />
    </>
  );
}
