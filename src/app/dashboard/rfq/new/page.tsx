
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Trash2, Upload, FileEdit, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/hooks/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { MOCK_USERS, MOCK_RFQS } from '@/lib/data';
import { rfqFormSchema } from '@/lib/schemas';
import type { ProductSeries, RFQ } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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


function ProductRow({ index, control, remove }: { index: number, control: any, remove: (index: number) => void }) {
    const { setValue } = useFormContext<RfqFormValues>();
    const productSeries = useWatch({
        control,
        name: `products.${index}.productSeries`,
    });

    useEffect(() => {
        if (productSeries) {
            const newWlid = generateWlid(productSeries);
            setValue(`products.${index}.wlid`, newWlid, { shouldValidate: true, shouldDirty: true });
        }
    }, [productSeries, index, setValue]);

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


export default function NewRfqPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [formData, setFormData] = useState<RfqFormValues | null>(null);

  const purchasingUsers = MOCK_USERS.filter(u => u.role === 'Purchasing');

  const defaultProductSeries: ProductSeries = 'Wig';
  const defaultValues = {
    customerType: 'New',
    customerEmail: '',
    assignedPurchaserIds: [],
    products: [{
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
     if (!formData) return;
     console.log('New RFQ Submitted', formData);
     toast({
       title: "RFQ Created",
       description: "The new RFQ has been successfully created.",
     });
     setIsPreviewOpen(false);
     router.push('/dashboard');
  }

  const addProduct = () => {
    const newProductSeries: ProductSeries = 'Wig';
    append({
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
                    <CardTitle>Products</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {fields.map((field, index) => (
                      <ProductRow key={field.id} index={index} control={form.control} remove={remove} />
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
                                                                          ? field.onChange([...field.value, pUser.id])
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
                <Card key={index}>
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
    </>
  );
}

    