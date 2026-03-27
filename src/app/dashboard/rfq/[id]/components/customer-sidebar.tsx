"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RFQ, User } from './types';
import type { UseFormReturn } from 'react-hook-form';

interface CustomerSidebarProps {
    rfq: RFQ;
    creator: User | null;
    purchasingUsers: User[];
    isEditing: boolean;
    editForm: UseFormReturn<any>;
    t: (key: string, params?: any) => string;
}

export function CustomerSidebar({ rfq, creator, purchasingUsers, isEditing, editForm, t }: CustomerSidebarProps) {
    return (
        <>
            {/* Customer & Creator */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('customer_and_creator')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!isEditing ? (
                        <>
                            <div>
                                <h4 className="font-semibold text-sm">{t('customer')}</h4>
                                <p className="text-sm text-muted-foreground">{rfq.customerEmail}</p>
                                <Badge variant="outline" className="mt-1">{rfq.customerType ? t(`customer_type_${rfq.customerType.toLowerCase()}`) : ''}</Badge>
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
                                        <p className="text-xs text-muted-foreground">{t(`user_role_${creator.role.toLowerCase().replace(' ', '_')}`)}</p>
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
                                            <FormLabel>{t('customer_email_label')}</FormLabel>
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
                                            <FormLabel>{t('customer_type_label')}</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                <SelectItem value="New">{t('customer_type_new')}</SelectItem>
                                                <SelectItem value="Repeating">{t('customer_type_repeating')}</SelectItem>
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

            {/* Assigned Purchasers */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('assigned_purchasers')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {!isEditing ? (
                        rfq.assignedPurchaserIds?.map(id => {
                            const pUser = purchasingUsers.find(u => u.id === id);
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
                        })
                    ) : (
                        <Form {...editForm}>
                            <FormField
                                control={editForm.control}
                                name="assignedPurchaserIds"
                                render={() => (
                                    <FormItem>
                                        <FormLabel>{t('select_purchasers')}</FormLabel>
                                        <div className="space-y-2">
                                            {purchasingUsers.map((pUser) => (
                                                <FormField
                                                    key={pUser.id}
                                                    control={editForm.control}
                                                    name="assignedPurchaserIds"
                                                    render={({ field }) => (
                                                        <FormItem key={pUser.id} className="flex flex-row items-start space-x-3 space-y-0">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(pUser.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                            ? field.onChange([...(field.value || []), pUser.id])
                                                                            : field.onChange(field.value?.filter((v: string) => v !== pUser.id));
                                                                    }}
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
                        </Form>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
