"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, FileEdit, Save, History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimilarQuotesDialog } from '@/components/similar-quotes-dialog';

import { useI18n } from '@/hooks/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';

import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { rfqFormSchema } from '@/lib/schemas';
import type { ProductSeries, Quote, User } from '@/lib/types';

import { ProductRow, generateWlid } from './components/product-row';
import { AiExtractDialog } from './components/ai-extract-dialog';
import { CustomerHistoryDialog, useCustomerHistory } from './components/customer-history-dialog';

type RfqFormValues = z.infer<typeof rfqFormSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const uploadImages = async (files: File[], rfqId: string, productId: string): Promise<string[]> => {
  if (!storage) return [];
  const results = await Promise.all(
    files.map(async (file, index) => {
      try {
        const storageRef = ref(storage, `rfqs/${rfqId}/${productId}/${Date.now()}_${index}_${file.name}`);
        const snap = await uploadBytes(storageRef, file);
        return await getDownloadURL(snap.ref);
      } catch {
        return null;
      }
    })
  );
  return results.filter((url): url is string => url !== null);
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function NewRfqPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createNotification } = useNotifications();

  const [productImages, setProductImages] = useState<Record<string, File[]>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [formData, setFormData] = useState<RfqFormValues | null>(null);
  const [similarQuotes, setSimilarQuotes] = useState<Quote[]>([]);
  const [isSimilarQuotesDialogOpen, setIsSimilarQuotesDialogOpen] = useState(false);
  const [purchasingUsers, setPurchasingUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [rfqCount, setRfqCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [defaultWlid, setDefaultWlid] = useState('');

  const history = useCustomerHistory();

  const defaultProductSeries: ProductSeries = 'Wig';

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersSnap, rfqsSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'Purchasing'), where('status', '==', 'Active'))),
          getDocs(collection(db, 'rfqs')),
        ]);
        setPurchasingUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() }) as User));
        setRfqCount(rfqsSnap.size);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchData();
    generateWlid(defaultProductSeries).then(setDefaultWlid);
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
      hairTexture: '',
      hairPart: '',
      layers: '',
      hairBangs: '',
      specialNotes: '',
      quantity: 1,
      images: [],
    }],
  };

  const form = useForm<RfqFormValues>({
    resolver: zodResolver(rfqFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'products' });

  const updateProductImages = (productId: string, files: File[]) => {
    setProductImages(prev => ({ ...prev, [productId]: files }));
  };

  const handleSimilarQuotesFound = useCallback((quotes: Quote[]) => {
    setSimilarQuotes(quotes);
    setIsSimilarQuotesDialogOpen(true);
  }, []);

  const onPreview = () => {
    setFormData(form.getValues());
    setIsPreviewOpen(true);
  };

  const handleSave = async () => {
    if (!formData || !user) return;
    setIsSaving(true);
    try {
      const newRfqCode = `RFQ-${String(rfqCount + 1).padStart(4, '0')}`;
      const docRef = await addDoc(collection(db, 'rfqs'), {
        rfqCode: newRfqCode,
        customerType: formData.customerType,
        customerEmail: formData.customerEmail,
        assignedPurchaserIds: formData.assignedPurchaserIds,
        products: [],
        inquiryTime: serverTimestamp(),
        creatorId: user.id,
        status: 'Waiting for Quote',
        quotes: [],
        lastUpdatedTime: serverTimestamp(),
      });

      const productsWithImages = await Promise.all(
        formData.products.map(async (product: any) => {
          const files = productImages[product.id] || [];
          const imageUrls = files.length > 0 ? await uploadImages(files, docRef.id, product.id) : [];
          return {
            id: product.id,
            wlid: product.wlid,
            productSeries: product.productSeries,
            sku: product.sku,
            hairFiber: product.hairFiber,
            cap: product.cap,
            capSize: product.capSize,
            length: product.length,
            density: product.density,
            color: product.color,
            curlStyle: product.curlStyle,
            hairTexture: product.hairTexture || '',
            hairPart: product.hairPart || '',
            layers: product.layers || '',
            hairBangs: product.hairBangs || '',
            specialNotes: product.specialNotes || '',
            quantity: product.quantity || 1,
            images: imageUrls,
          };
        })
      );

      await updateDoc(doc(db, 'rfqs', docRef.id), { products: productsWithImages });

      // Notify Order Managers
      const allUsersSnap = await getDocs(collection(db, 'users'));
      const orderManagers = allUsersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }) as User)
        .filter(u => u.role === 'Order Manager' && u.status === 'Active');

      for (const manager of orderManagers) {
        await createNotification({
          recipientId: manager.id,
          titleKey: 'notification_new_rfq_manager_title',
          bodyKey: 'notification_new_rfq_manager_body',
          bodyParams: { rfqCode: newRfqCode, salesName: user.name },
          href: `/dashboard/rfq/${docRef.id}`,
        });
      }

      toast({ title: 'RFQ Created', description: 'The new RFQ has been successfully created.' });
      setIsPreviewOpen(false);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating RFQ:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'There was an error creating the RFQ. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const addProduct = async () => {
    const newWlid = await generateWlid('Wig');
    append({
      id: `prod-${Date.now()}`,
      wlid: newWlid,
      productSeries: 'Wig',
      sku: '',
      hairFiber: '',
      cap: '',
      capSize: '',
      length: '',
      density: '',
      color: '',
      curlStyle: '',
      quantity: 1,
      images: [],
    });
  };

  const handleAiApply = async (extractedData: any) => {
    const data = extractedData.result || {};
    const products = data.products?.length > 0 ? data.products : defaultValues.products;
    const populatedProducts = await Promise.all(
      products.map(async (p: any) => ({
        id: `prod-${Date.now()}-${Math.random()}`,
        wlid: p.wlid || (await generateWlid(p.productSeries || defaultProductSeries)),
        ...p,
      }))
    );
    form.reset({ ...defaultValues, ...data, products: populatedProducts });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('create_new_rfq_title')}</h1>
            <p className="text-muted-foreground">{t('create_rfq_subtitle')}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onPreview)} className="space-y-8">
            <div className="grid md:grid-cols-3 gap-6">

              {/* Left: Products */}
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{t('products_card_title')}</CardTitle>
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
                        updateProductImages={updateProductImages}
                        productId={form.watch(`products.${index}.id`) || field.id}
                        t={t}
                      />
                    ))}
                    <Button type="button" variant="outline" onClick={addProduct} className="hidden">
                      <Plus className="mr-2 h-4 w-4" /> Add Another Product
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Customer Info + Purchasers */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('customer_information')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Customer Type */}
                    <FormField
                      control={form.control}
                      name="customerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <span className="text-red-500 mr-1">*</span>Customer Type
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="New">New</SelectItem>
                              <SelectItem value="Repeating">Repeating</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Customer Email + History Button */}
                    <FormField
                      control={form.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <span className="text-red-500 mr-1">*</span>
                            {t('customer_email_label')}
                          </FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!field.value}
                              onClick={() => history.openDialog(field.value)}
                            title={t('button_customer_history')}
                          >
                            <History className="h-4 w-4 mr-1" />
                            {t('button_customer_history')}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Assign Purchaser */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('assign_purchaser')}</CardTitle>
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
                            <FormLabel>
                              <span className="text-red-500 mr-1">*</span>Select Purchasers
                            </FormLabel>
                            <div className="space-y-2">
                              {purchasingUsers.map(pUser => (
                                <FormField
                                  key={pUser.id}
                                  control={form.control}
                                  name="assignedPurchaserIds"
                                  render={({ field }) => (
                                    <FormItem
                                      key={pUser.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(pUser.id)}
                                          onCheckedChange={checked =>
                                            checked
                                              ? field.onChange([...(field.value || []), pUser.id])
                                              : field.onChange(
                                                  field.value?.filter(v => v !== pUser.id)
                                                )
                                          }
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">{pUser.name}</FormLabel>
                                    </FormItem>
                                  )}
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

            {/* Bottom action bar */}
            <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-end gap-2 px-6 py-4 bg-background/95 backdrop-blur border-t shadow-lg">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
                Cancel
              </Button>
              <Button type="submit">{t('create_new_rfq_title')}</Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>RFQ Preview</DialogTitle>
            <DialogDescription>Please review the RFQ details below before saving.</DialogDescription>
          </DialogHeader>
          {formData && (
            <div className="grid gap-6 max-h-[60vh] overflow-y-auto p-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('assign_purchaser')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Purchaser assignment is handled by the Order Manager after submission.
                  </p>
                </CardContent>
              </Card>
              {formData.products.map((product, index) => (
                <Card key={product.id}>
                  <CardHeader>
                    <CardTitle>
                      Product {index + 1}: {product.sku}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Product Series</span>
                      <span>{product.productSeries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">WLID</span>
                      <span>{product.wlid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SKU</span>
                      <span>{product.sku || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-muted-foreground ${(product.quantity || 1) > 1 ? 'font-bold text-red-600' : ''}`}>
                        Quantity
                      </span>
                      <span className={`${(product.quantity || 1) > 1 ? 'font-bold text-red-600' : ''}`}>
                        {product.quantity}
                      </span>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      <div><span className="font-medium text-muted-foreground">Hair Fiber:</span> {product.hairFiber}</div>
                      <div><span className="font-medium text-muted-foreground">{product.productSeries === 'Wig' ? 'Cap Construction' : 'Base Construction'}:</span> {product.cap}</div>
                      <div><span className="font-medium text-muted-foreground">{product.productSeries === 'Wig' ? 'Cap Size' : 'Base Size'}:</span> {product.capSize}</div>
                      <div><span className="font-medium text-muted-foreground">Length:</span> {product.length}</div>
                      <div><span className="font-medium text-muted-foreground">Density:</span> {product.density}</div>
                      <div><span className="font-medium text-muted-foreground">Color:</span> {product.color}</div>
                      <div><span className="font-medium text-muted-foreground">Hair Texture:</span> {product.hairTexture}</div>
                      <div><span className="font-medium text-muted-foreground">Hair Part:</span> {product.hairPart}</div>
                      <div><span className="font-medium text-muted-foreground">Layers:</span> {product.layers}</div>
                      <div><span className="font-medium text-muted-foreground">Hair Bangs:</span> {product.hairBangs}</div>
                    </div>
                    {product.specialNotes && (
                      <div className="col-span-2">
                        <span className="font-medium text-muted-foreground">Special Notes:</span>
                        <p className="mt-1 text-sm whitespace-pre-wrap break-all">{product.specialNotes}</p>
                      </div>
                    )}
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
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
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

      {/* Customer History Dialog */}
      <CustomerHistoryDialog
        email={form.watch('customerEmail')}
        open={history.open}
        onOpenChange={history.setOpen}
        isLoading={history.isLoading}
        rfqs={history.rfqs}
        t={t}
      /> 

      <SimilarQuotesDialog
        open={isSimilarQuotesDialogOpen}
        onOpenChange={setIsSimilarQuotesDialogOpen}
        quotes={similarQuotes}
        purchasingUsers={purchasingUsers}
      />
    </>
  );
}
