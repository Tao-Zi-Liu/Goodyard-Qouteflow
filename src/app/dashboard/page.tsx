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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Lock, Unlock } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();

    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [purchasingUsers, setPurchasingUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [jumpToPage, setJumpToPage] = useState('');

    // Helper function to safely format dates from Firestore
    const formatFirestoreDate = (dateField: any): string => {
        try {
            if (!dateField) return 'N/A';
            
            let date: Date | null = null;
            
            // Handle Firestore Timestamp objects
            if (dateField && typeof dateField === 'object' && dateField.toDate) {
                date = dateField.toDate();
            }
            // Handle Firestore Timestamp with seconds and nanoseconds
            else if (dateField && typeof dateField === 'object' && dateField.seconds) {
                date = new Date(dateField.seconds * 1000);
            }
            // Handle string dates
            else if (typeof dateField === 'string') {
                date = new Date(dateField);
            }
            // Handle number timestamps
            else if (typeof dateField === 'number') {
                date = new Date(dateField);
            }
            
            if (!date || isNaN(date.getTime())) {
                return 'N/A';
            }
            
            // Format as "hh:mm:ss yyyy/mm/dd"
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            
            return `${hours}:${minutes}:${seconds} ${year}/${month}/${day}`;
            
        } catch (error) {
            console.error('Error formatting date:', error, dateField);
            return 'N/A';
        }
    };

    const addActionHistory = async (rfqId: string, actionType: string, details?: any) => {
        if (!user) return;
        
        try {
            const rfqRef = doc(db, 'rfqs', rfqId);
            const currentRfq = rfqs.find(r => r.id === rfqId);
            if (!currentRfq) return;
    
            const newAction = {
                id: `action-${Date.now()}`,
                rfqId,
                actionType,
                performedBy: user.id,
                performedByName: user.name,
                timestamp: new Date().toISOString(),
                details: details || {}
            };
    
            const updatedHistory = [...(currentRfq.actionHistory || []), newAction];
    
            await updateDoc(rfqRef, {
                actionHistory: updatedHistory
            });
    
            // Update local state
            setRfqs(prev => prev.map(rfq => 
                rfq.id === rfqId 
                    ? { ...rfq, actionHistory: updatedHistory }
                    : rfq
            ));
        } catch (error) {
            console.error('Error adding action history:', error);
        }
    };
    
    const handleLockToggle = async (rfq: RFQ) => {
        if (!user || user.role !== 'Purchasing') return;
        if (!rfq.assignedPurchaserIds.includes(user.id)) return;
    
        try {
            const rfqRef = doc(db, 'rfqs', rfq.id);
            const isCurrentlyLocked = rfq.status === 'Locked';
            
            const updates: any = {
                status: isCurrentlyLocked ? 'Waiting for Quote' : 'Locked',
                updatedAt: serverTimestamp()
            };
    
            if (!isCurrentlyLocked) {
                // Locking the RFQ
                updates.lockedBy = user.id;
                updates.lockedAt = serverTimestamp();
            } else {
                // Unlocking the RFQ
                updates.lockedBy = null;
                updates.lockedAt = null;
            }
    
            await updateDoc(rfqRef, updates);
    
            // Update local state
            setRfqs(prev => prev.map(r => 
                r.id === rfq.id 
                    ? { 
                        ...r, 
                        status: isCurrentlyLocked ? 'Waiting for Quote' : 'Locked',
                        lockedBy: isCurrentlyLocked ? undefined : user.id,
                        lockedAt: isCurrentlyLocked ? undefined : new Date().toISOString()
                    }
                    : r
            ));
    
            // Add to action history
            await addActionHistory(
                rfq.id, 
                isCurrentlyLocked ? 'rfq_unlocked' : 'rfq_locked',
                {
                    previousStatus: rfq.status,
                    newStatus: isCurrentlyLocked ? 'Waiting for Quote' : 'Locked'
                }
            );
    
            toast({
                title: isCurrentlyLocked ? "RFQ Unlocked" : "RFQ Locked",
                description: `RFQ ${rfq.rfqCode || rfq.code} has been ${isCurrentlyLocked ? 'unlocked' : 'locked'}.`,
            });
    
        } catch (error) {
            console.error('Error toggling lock:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update RFQ status. Please try again.",
            });
        }
    };   

    // Add this function after formatFirestoreDate
    const getTimestampForSorting = (dateField: any): number => {
        try {
            if (!dateField) return 0;
            
            // Handle Firestore Timestamp objects
            if (dateField && typeof dateField === 'object' && dateField.toDate) {
                return dateField.toDate().getTime();
            }
            
            // Handle Firestore Timestamp with seconds and nanoseconds
            if (dateField && typeof dateField === 'object' && dateField.seconds) {
                return dateField.seconds * 1000;
            }
            
            // Handle string dates
            if (typeof dateField === 'string') {
                const date = new Date(dateField);
                return isNaN(date.getTime()) ? 0 : date.getTime();
            }
            
            // Handle number timestamps
            if (typeof dateField === 'number') {
                return dateField;
            }
            
            return 0;
        } catch (error) {
            console.error('Error getting timestamp:', error, dateField);
            return 0;
        }
    };

    const getPaginatedData = (data: RFQ[]) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };
    
    const getTotalPages = (dataLength: number) => {
        return Math.ceil(dataLength / itemsPerPage);
    };
    
    const handlePageChange = (page: number, totalPages: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };
    
    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1); // Reset to first page when changing items per page
    };
    
    const handleJumpToPage = () => {
        const pageNumber = parseInt(jumpToPage);
        const totalPages = getTotalPages(rfqs.length);
        if (!isNaN(pageNumber)) {
            handlePageChange(pageNumber, totalPages);
            setJumpToPage('');
        }
    };

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
                const rfqsData = rfqsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return { 
                        id: doc.id, 
                        ...data,
                        // Keep the original inquiryTime for proper date handling
                        inquiryTime: data.inquiryTime
                    };
                }) as RFQ[];
                const sortedRfqs = rfqsData.sort((a, b) => {
                    const timestampA = getTimestampForSorting(a.inquiryTime);
                    const timestampB = getTimestampForSorting(b.inquiryTime);
                    return timestampB - timestampA; // Descending order (newest first)
                });
                setRfqs(sortedRfqs);

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
                console.log('Sample RFQ data:', rfqsData[0]); // Debug log
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
            case 'Locked': return 'destructive';
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
        const paginatedData = getPaginatedData(data);
        const totalPages = getTotalPages(data.length);
    
        if (data.length === 0) {
            return (
                <div className="p-8 text-center text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No RFQs found</p>
                </div>
            );
        }
    
        return (
            <div className="space-y-4">
                {/* Pagination Controls - Top */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Items per page:</span>
                        <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(Number(value))}>
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="300">300</SelectItem>
                                <SelectItem value="1000">1000</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages} ({data.length} total items)
                        </span>
                    </div>
                </div>
    
                {/* Table */}
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
                        {paginatedData.map((rfq) => {
                            const isAssignedPurchaser = user?.role === 'Purchasing' && rfq.assignedPurchaserIds.includes(user?.id || '');
                            const canToggleLock = isAssignedPurchaser && (rfq.status === 'Waiting for Quote' || rfq.status === 'Locked');
                            const isLocked = rfq.status === 'Locked';
                            
                            return (
                                <TableRow key={rfq.id}>
                                    <TableCell className="font-medium">{rfq.rfqCode || rfq.code || `RFQ-${rfq.id.slice(0,6)}`}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={getStatusVariant(rfq.status)}>
                                                {t(`status_${rfq.status.toLowerCase().replace(/ /g, '_')}`)}
                                            </Badge>
                                            {isLocked && rfq.lockedBy && (
                                                <span className="text-xs text-muted-foreground">
                                                    {t('locked_by', { userName: allUsers.find(u => u.id === rfq.lockedBy)?.name || 'Unknown' })}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {formatFirestoreDate(rfq.inquiryTime)}
                                    </TableCell>
                                    <TableCell>{getCreatorName(rfq.creatorId)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {canToggleLock && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleLockToggle(rfq)}
                                                    title={isLocked ? t('button_unlock_rfq') : t('button_lock_rfq')}
                                                >
                                                    {isLocked ? (
                                                        <Unlock className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Lock className="h-4 w-4 text-orange-600" />
                                                    )}
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/rfq/${rfq.id}`)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
    
                {/* Pagination Controls - Bottom */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Jump to page:</span>
                        <Input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={jumpToPage}
                            onChange={(e) => setJumpToPage(e.target.value)}
                            className="w-20"
                            placeholder="Page"
                        />
                        <Button variant="outline" size="sm" onClick={handleJumpToPage}>
                            Go
                        </Button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1, totalPages)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handlePageChange(pageNum, totalPages)}
                                        className="w-8 h-8 p-0"
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>
                        
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1, totalPages)}
                            disabled={currentPage === totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
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
                    <h1 className="text-3xl font-bold tracking-tight">Inquiries</h1>
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