"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase'; // <--- Here is the import statement
import { collection, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { MOCK_USERS } from '@/lib/data';
import type { RFQ, RFQStatus } from '@/lib/types';

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useI18n();

    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRfqs = async () => {
            const rfqsCollection = collection(db, "rfqs");
            const rfqSnapshot = await getDocs(rfqsCollection);
            const rfqList = rfqSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RFQ));
            setRfqs(rfqList);
            setLoading(false);
        };

        fetchRfqs();
    }, []);
    
    const getStatusVariant = (status: RFQStatus) => {
        switch (status) {
            case 'Waiting for Quote': return 'secondary';
            case 'Quotation in Progress': return 'default';
            case 'Quotation Completed': return 'outline';
            case 'Archived': return 'destructive';
            default: return 'secondary';
        }
    };

    const getCreatorName = (creatorId: string) => MOCK_USERS.find(u => u.id === creatorId)?.name || 'Unknown';
    
    const myRfqs = rfqs.filter(rfq => rfq.creatorId === user?.id);
    const requiresMyQuote = rfqs.filter(rfq => rfq.assignedPurchaserIds.includes(user?.id || '') && rfq.status !== 'Quotation Completed');

    const RFQTable = ({ data }: { data: RFQ[] }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('field_label_code')}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{t('field_label_inquiry_time')}</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((rfq) => (
                    <TableRow key={rfq.id}>
                        <TableCell className="font-medium">{rfq.code}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(rfq.status)}>{t(`status_${rfq.status.toLowerCase().replace(/ /g, '_')}`)}</Badge>
                        </TableCell>
                        <TableCell>{new Date(rfq.inquiryTime).toLocaleDateString()}</TableCell>
                        <TableCell>{getCreatorName(rfq.creatorId)}</TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/rfq/${rfq.id}`)}>
                                <Eye className="h-4 w-4" />
                           </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('dashboard_title')}</h1>
                    <p className="text-muted-foreground">Manage and track all inquiries and quotes.</p>
                </div>
                {user?.role === 'Sales' && (
                    <Button onClick={() => router.push('/dashboard/rfq/new')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('button_create_new_rfq')}
                    </Button>
                )}
            </div>

            <Tabs defaultValue="all_rfqs">
                <TabsList>
                    <TabsTrigger value="all_rfqs">{t('dashboard_all_rfqs_tab')}</TabsTrigger>
                    {user?.role === 'Sales' && <TabsTrigger value="my_rfqs">{t('dashboard_my_rfqs_tab')}</TabsTrigger>}
                    {user?.role === 'Purchasing' && <TabsTrigger value="my_quotes">{t('dashboard_my_quotes_tab')}</TabsTrigger>}
                </TabsList>
                <Card className="mt-4">
                    <CardContent className="p-0">
                        <TabsContent value="all_rfqs" className="m-0">
                            <RFQTable data={rfqs.filter(r => r.status !== 'Archived')} />
                        </TabsContent>
                        {user?.role === 'Sales' && (
                        <TabsContent value="my_rfqs" className="m-0">
                            <RFQTable data={myRfqs} />
                        </TabsContent>
                        )}
                        {user?.role === 'Purchasing' && (
                        <TabsContent value="my_quotes" className="m-0">
                            <RFQTable data={requiresMyQuote} />
                        </TabsContent>
                        )}
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    );
}