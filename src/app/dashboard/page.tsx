"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Eye, FileText, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RFQ, RFQStatus, User } from '@/lib/types';

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useI18n();

    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [purchasingUsers, setPurchasingUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // Skip if we're not on client side or db is not initialized
            if (typeof window === 'undefined' || !db) {
                setLoading(false);
                return;
            }

            try {
                // Fetch RFQs from Firestore
                const rfqsSnapshot = await getDocs(collection(db, 'rfqs'));
                const rfqsData = rfqsSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data() 
                })) as RFQ[];
                setRfqs(rfqsData);

                // Fetch all users from Firestore  
                const usersSnapshot = await getDocs(collection(db, 'users'));
                const usersData = usersSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data() 
                })) as User[];
                setAllUsers(usersData);
                
                // Filter for active Purchasing users
                const activePurchasingUsers = usersData.filter(u => 
                    u.role === 'Purchasing' && u.status === 'Active'
                );
                setPurchasingUsers(activePurchasingUsers);
                
                console.log('Fetched users:', usersData.length);
                console.log('Active Purchasing users:', activePurchasingUsers.length);
            } catch (error) {
                console.error('Error fetching data:', error);
                // Set empty arrays on error
                setRfqs([]);
                setAllUsers([]);
                setPurchasingUsers([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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

    const getCreatorName = (creatorId: string) => {
        const creator = allUsers.find(u => u.id === creatorId);
        return creator?.name || 'Unknown';
    };
    
    const myRfqs = rfqs.filter(rfq => rfq.creatorId === user?.id);
    const requiresMyQuote = rfqs.filter(rfq => 
        rfq.assignedPurchaserIds?.includes(user?.id || '') && 
        rfq.status !== 'Quotation Completed'
    );

    const RFQTable = ({ data }: { data: RFQ[] }) => {
        if (data.length === 0) {
            return (
                <div className="p-8 text-center text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No RFQs found</p>
                </div>
            );
        }

        return (
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
                            <TableCell className="font-medium">{rfq.rfqCode || rfq.code || `RFQ-${rfq.id.slice(0,6)}`}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(rfq.status)}>{t(`status_${rfq.status.toLowerCase().replace(/ /g, '_')}`)}</Badge>
                            </TableCell>
                            <TableCell>
                                {rfq.inquiryTime ? new Date(rfq.inquiryTime).toLocaleDateString() : 'N/A'}
                            </TableCell>
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
    };

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

            {/* Show setup guidance if no purchasing users exist */}
            {user?.role === 'Sales' && purchasingUsers.length === 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <Users className="h-5 w-5 text-orange-600" />
                            <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                                Setup Required
                            </h3>
                        </div>
                        <p className="text-orange-800 dark:text-orange-200 mt-2">
                            Before creating RFQs, you need to add Purchasing users who can provide quotes. 
                            Go to User Management to add your first Purchasing user.
                        </p>
                        <Button 
                            variant="outline" 
                            className="mt-3"
                            onClick={() => router.push('/dashboard/users')}
                        >
                            <Users className="mr-2 h-4 w-4" />
                            Go to User Management
                        </Button>
                    </CardContent>
                </Card>
            )}

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

            {/* Quick Stats for Admin */}
            {user?.role === 'Admin' && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{allUsers.length}</div>
                            <p className="text-xs text-muted-foreground">
                                {allUsers.filter(u => u.role === 'Sales').length} Sales, {purchasingUsers.length} Purchasing
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total RFQs</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{rfqs.length}</div>
                            <p className="text-xs text-muted-foreground">
                                {rfqs.filter(r => r.status === 'Quotation Completed').length} completed
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active RFQs</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {rfqs.filter(r => r.status !== 'Quotation Completed' && r.status !== 'Archived').length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Awaiting quotes or in progress
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}