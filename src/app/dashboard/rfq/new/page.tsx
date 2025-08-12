
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { MOCK_USERS } from '@/lib/data';
import { rfqFormSchema } from '@/lib/schemas';
import type { ProductSeries, User } from '@/lib/types';

type RfqFormValues = z.infer<typeof rfqFormSchema>;

const productSeriesOptions: ProductSeries[] = ['Wig', 'Hair Extension', 'Topper', 'Toupee', 'Synthetic Product'];

export default function NewRfqPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const purchasingUsers = MOCK_USERS.filter(u => u.role === 'Purchasing');

  const form = useForm<RfqFormValues>({
    resolver: zodResolver(rfqFormSchema),
    defaultValues: {
      customerType: 'New',
      customerEmail: '',
      assignedPurchaserIds: [],
      products: [{
        wlid: '',
        productSeries: 'Wig',
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
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'products',
  });

  const onSubmit = (data: RfqFormValues) => {
    console.log('New RFQ Submitted', data);
    toast({
      title: "RFQ Created",
      description: "The new RFQ has been successfully created.",
    });
    router.push('/dashboard');
  };

  return (
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Products</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-4 relative">
                       {fields.length > 1 && (
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(index)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                       )}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`products.${index}.wlid`} render={({ field }) => (
                          <FormItem><FormLabel>WLID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`products.${index}.sku`} render={({ field }) => (
                          <FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                       <FormField control={form.control} name={`products.${index}.productSeries`} render={({ field }) => (
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
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name={`products.${index}.hairFiber`} render={({ field }) => (
                          <FormItem><FormLabel>Hair Fiber</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`products.${index}.cap`} render={({ field }) => (
                           <FormItem><FormLabel>Cap</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name={`products.${index}.capSize`} render={({ field }) => (
                           <FormItem><FormLabel>Cap Size</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name={`products.${index}.length`} render={({ field }) => (
                           <FormItem><FormLabel>Length</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name={`products.${index}.density`} render={({ field }) => (
                           <FormItem><FormLabel>Density</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name={`products.${index}.color`} render={({ field }) => (
                           <FormItem><FormLabel>Color</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name={`products.${index}.curlStyle`} render={({ field }) => (
                           <FormItem><FormLabel>Curls</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name={`products.${index}.images`} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Images</FormLabel>
                              <FormControl>
                                <div className="flex items-center justify-center w-full">
                                    <label htmlFor={`dropzone-file-${index}`} className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-muted-foreground">PNG, JPG or GIF (MAX. 800x400px)</p>
                                        </div>
                                        <Input id={`dropzone-file-${index}`} type="file" className="hidden" multiple onChange={(e) => field.onChange(Array.from(e.target.files || []))} />
                                    </label>
                                </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => append({ wlid: '', productSeries: 'Wig', sku: '', hairFiber: '', cap: '', capSize: '', length: '', density: '', color: '', curlStyle: '', images: [] })}>
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
                   <FormField control={form.control} name="assignedPurchaserIds" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Purchasers</FormLabel>
                        <Select onValueChange={(value) => field.onChange([value])}>
                           <FormControl><SelectTrigger><SelectValue placeholder="Select a purchaser" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {purchasingUsers.map(pUser => <SelectItem key={pUser.id} value={pUser.id}>{pUser.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
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
  );
}
