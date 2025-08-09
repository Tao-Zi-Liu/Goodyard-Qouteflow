
"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from '@/hooks/use-i18n';
import { MOCK_RFQS } from '@/lib/data';
import type { RFQ } from '@/lib/types';
import { RotateCcw, Trash2 } from 'lucide-react';

export default function RecycleBinPage() {
    const { t } = useI18n();
    const [archivedRfqs] = useState<RFQ[]>(() => MOCK_RFQS.filter(r => r.status === 'Archived'));

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('recycle_bin_title')}</h1>
                <p className="text-muted-foreground">Manage archived inquiries.</p>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('field_label_code')}</TableHead>
                                <TableHead>{t('field_label_inquiry_time')}</TableHead>
                                <TableHead>{t('recycle_bin_reason_column')}</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {archivedRfqs.map((rfq) => (
                                <TableRow key={rfq.id}>
                                    <TableCell className="font-medium">{rfq.code}</TableCell>
                                    <TableCell>{new Date(rfq.inquiryTime).toLocaleDateString()}</TableCell>
                                    <TableCell>{rfq.archiveReason || 'No reason provided'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="mr-2">
                                            <RotateCcw className="h-4 w-4" />
                                            <span className="sr-only">{t('button_restore')}</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">{t('button_delete_permanently')}</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                             {archivedRfqs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        The recycle bin is empty.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
