"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Edit, CheckCircle, Send, XCircle, Lock, Unlock, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { rfqFormSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/hooks/use-i18n';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/use-notifications';
import { convertRMBToUSD, calculateCustomizedPrice } from '@/lib/currency';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { RFQ, Quote, RFQStatus, User, ActionHistory, ActionType } from "@/lib/types";
import type { EditingImages } from './components/types';

// Sub-components
import { ImageModal } from './components/image-modal';
import { ActionHistorySection } from './components/action-history';
import { ProductView } from './components/product-view';
import { ProductEditForm } from './components/product-edit-form';
import { QuoteSection } from './components/quote-section';
import { CustomerSidebar } from './components/customer-sidebar';
import { ProductComments } from './components/product-comments';
import type { ProductComment } from '@/lib/types';
import { translateToAllLanguages, translateProductFields } from '@/lib/gemini';
import { copyRfq } from '@/lib/copy-rfq';
import { Copy } from 'lucide-react';


// ── Helpers ───────────────────────────────────────────────────────────────────
const formatFirestoreDate = (date: any): string => {
    if (!date) return 'N/A';
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleString();
    if (date instanceof Date) return date.toLocaleString();
    if (typeof date === 'string') return new Date(date).toLocaleString();
    return 'N/A';
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function RFQDetailClient() {
    const params = useParams();
    const router = useRouter();
    const { t, language } = useI18n();
    const { user } = useAuth();
    const { toast } = useToast();
    const { createNotification } = useNotifications();

    const [rfq, setRfq] = useState<RFQ | null>(null);
    const [creator, setCreator] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [purchasingUsers, setPurchasingUsers] = useState<User[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);
    const [editingImages, setEditingImages] = useState<EditingImages>({});

    const editForm = useForm({
        resolver: zodResolver(rfqFormSchema),
        defaultValues: { customerType: '', customerEmail: '', assignedPurchaserIds: [], products: [] }
    });
        // handleAddComment — 提交时翻译三语存入 Firestore
        const handleAddComment = async (productId: string, content: string) => {
            if (!rfq || !user) return;
            try {
                let translations: { en?: string; zh?: string; de?: string } = {};
                let originalLanguage: 'en' | 'zh' | 'de' = 'en';
                try {
                    const result = await translateToAllLanguages(content);
                    translations = { en: result.en, zh: result.zh, de: result.de };
                    originalLanguage = result.originalLanguage;
                } catch (e) {
                    console.error('Translation failed, saving without translations:', e);
                }
    
                const newComment: ProductComment = {
                    id: `comment-${Date.now()}`,
                    productId,
                    rfqId: rfq.id,
                    authorId: user.id,
                    authorName: user.name,
                    authorRole: user.role,
                    content,
                    createdAt: new Date().toISOString(),
                    originalLanguage,
                    translations,
                };
    
                const existingComments = rfq.comments || [];
                const updatedComments = [...existingComments, newComment];
                await updateDoc(doc(db, 'rfqs', rfq.id), {
                    comments: updatedComments,
                    lastUpdatedTime: serverTimestamp(),
                });
    
                setRfq(prev => prev ? { ...prev, comments: updatedComments } : null);
                // 通知相关参与者
                    const participants = new Set([rfq.creatorId, ...rfq.assignedPurchaserIds]);
                    participants.delete(user.id);
                    const productName = rfq.products.find(p => p.id === productId)?.sku || productId;
                    participants.forEach(recipientId => {
                        createNotification({
                            recipientId,
                            titleKey: 'notification_new_comment_title',
                            bodyKey: 'notification_new_comment_body',
                            bodyParams: { authorName: user.name, rfqCode: rfq.rfqCode || rfq.code, productName },
                            href: `/dashboard/rfq/${rfq.id}`,
                        });
                    });
            } catch (error) {
                console.error('Failed to add comment:', error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to add comment.' });
            }
        };
    
        // translateProductFieldsIfNeeded — 打开 RFQ 时翻译产品字段
        const translateProductFieldsIfNeeded = async (rfqData: RFQ) => {
            if (rfqData.translations) return;
            try {
                const allProductTranslations: RFQ['translations'] = {};
                for (const product of rfqData.products) {
                    const excludedFields = ['id', 'wlid', 'sku', 'productSeries', 'productId', 'images', 'imageFiles'];
                    const stringFields: Record<string, string> = {};
                    Object.entries(product).forEach(([k, v]) => {
                        if (!excludedFields.includes(k) && typeof v === 'string' && v.trim()) {
                            stringFields[k] = v;
                        }
                    });
                    if (Object.keys(stringFields).length === 0) continue;
                    const fieldTranslations = await translateProductFields(stringFields);
                    if (Object.keys(fieldTranslations).length > 0) {
                        allProductTranslations[product.id] = fieldTranslations;
                    }
                }
                if (Object.keys(allProductTranslations).length > 0) {
                    await updateDoc(doc(db, 'rfqs', rfqData.id), {
                        translations: allProductTranslations,
                    });
                    setRfq(prev => prev ? { ...prev, translations: allProductTranslations } : null);
                }
            } catch (error) {
                console.error('Failed to translate product fields:', error);
            }
        };

    // ── Fetch RFQ ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchRfq = async () => {
            if (!params.id) return;
            const docRef = doc(db, "rfqs", params.id as string);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const rfqData = { id: docSnap.id, ...docSnap.data(), quotes: docSnap.data().quotes || [] } as RFQ;
                setRfq(rfqData);
                translateProductFieldsIfNeeded(rfqData); // 异步，不阻塞页面加载

                if (!editFormData) {
                    editForm.reset({
                        customerType: rfqData.customerType,
                        customerEmail: rfqData.customerEmail,
                        assignedPurchaserIds: rfqData.assignedPurchaserIds,
                        products: rfqData.products.map(p => ({ ...p, imageFiles: [] }))
                    });
                    const initialImages: EditingImages = {};
                    rfqData.products.forEach((p, i) => {
                        initialImages[i] = { existing: (p.images || []) as unknown as string[], new: [] };
                    });
                    setEditingImages(initialImages);
                }

                const { getDocs, collection } = await import('firebase/firestore');
                const usersSnap = await getDocs(collection(db, 'users'));
                const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as User[];
                setUsers(usersData);
                setPurchasingUsers(usersData.filter(u => u.role === 'Purchasing' && u.status === 'Active'));
                setCreator(usersData.find(u => u.id === rfqData.creatorId) || null);
            } else {
                toast({ variant: "destructive", title: "Not Found", description: "The requested RFQ could not be found." });
                router.push('/dashboard');
            }
            setLoading(false);
        };
        fetchRfq();
    }, [params.id, router, toast]);

    // ── Action History ────────────────────────────────────────────────────────
    const addActionHistory = async (rfqId: string, actionType: string, details?: any) => {
        if (!user || !rfq) return;
        const newAction = {
            id: `action-${Date.now()}`, rfqId, actionType,
            performedBy: user.id, performedByName: user.name,
            timestamp: new Date().toISOString(), details: details || {}
        };
        const updatedHistory = [...(rfq.actionHistory || []), newAction];
        await updateDoc(doc(db, "rfqs", rfqId), { actionHistory: updatedHistory });
        setRfq(prev => prev ? { ...prev, actionHistory: updatedHistory as ActionHistory[] } : null);
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleAcceptQuote = async (productId: string, purchaserId: string) => {
        if (!rfq || !user || user.role !== 'Sales') return;
        try {
            const acceptedQuote = rfq.quotes.find(q => q.productId === productId && q.purchaserId === purchaserId);
            if (!acceptedQuote) throw new Error("Quote not found");

            const updatedQuotes = rfq.quotes.map(q => {
                if (q.productId === productId) {
                    return q.purchaserId === purchaserId ? { ...q, status: 'Accepted' as const } : { ...q, status: 'Rejected' as const };
                }
                return q;
            });
            const allAccepted = rfq.products.every(p => updatedQuotes.some(q => q.productId === p.id && q.status === 'Accepted'));
            const newStatus = allAccepted ? 'Quotation Completed' : rfq.status;

            await updateDoc(doc(db, "rfqs", rfq.id), { quotes: updatedQuotes, status: newStatus, lastUpdatedTime: serverTimestamp() });
            setRfq(prev => prev ? { ...prev, quotes: updatedQuotes, status: newStatus } : null);

            await addActionHistory(rfq.id, 'quote_accepted', {
                productId, purchaserId,
                productName: rfq.products.find(p => p.id === productId)?.sku || '',
                previousStatus: rfq.status, newStatus
            });

            createNotification({
                recipientId: acceptedQuote.purchaserId,
                titleKey: 'notification_quote_accepted_title',
                bodyKey: 'notification_quote_accepted_body',
                bodyParams: { rfqCode: rfq.rfqCode || rfq.code, productName: rfq.products.find(p => p.id === productId)?.sku || '' },
                href: `/dashboard/rfq/${rfq.id}`,
            });

            if (newStatus === 'Quotation Completed') {
                const salesUsers = users.filter(u => u.role === 'Sales' && u.status === 'Active');
                for (const su of salesUsers) {
                    createNotification({
                        recipientId: su.id,
                        titleKey: 'notification_rfq_ready_to_send_title',
                        bodyKey: 'notification_rfq_ready_to_send_body',
                        bodyParams: { rfqCode: rfq.rfqCode || rfq.code || rfq.id },
                        href: `/dashboard/rfq/${rfq.id}`,
                    });
                }
            }

            toast({ title: "Quote Accepted", description: "The quote has been accepted." });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to accept the quote.' });
        }
    };

    const handleLockToggle = async () => {
        if (!rfq || !user || user.role !== 'Purchasing') return;
        if (!rfq.assignedPurchaserIds.includes(user.id)) return;
        try {
            const locked = rfq.status === 'Locked';
            const updates: any = { status: locked ? 'Waiting for Quote' : 'Locked', updatedAt: serverTimestamp() };
            if (!locked) { updates.lockedBy = user.id; updates.lockedAt = serverTimestamp(); }
            else { updates.lockedBy = null; updates.lockedAt = null; }
            await updateDoc(doc(db, "rfqs", rfq.id), updates);
            setRfq(prev => prev ? { ...prev, status: locked ? 'Waiting for Quote' : 'Locked', lockedBy: locked ? undefined : user.id } : null);
            await addActionHistory(rfq.id, locked ? 'rfq_unlocked' : 'rfq_locked', { previousStatus: rfq.status, newStatus: locked ? 'Waiting for Quote' : 'Locked' });
            toast({ title: locked ? t('button_unlock_rfq') : t('button_lock_rfq') });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to update RFQ status." });
        }
    };

    const handleQuoteSubmit = async (productId: string, price: number, deliveryDate: Date, message: string, existingQuote?: Quote) => {
        if (!rfq || !user) return;
        try {
            const isUpdate = !!existingQuote;
            const salesCostPriceRMB = price;
            const salesCostPriceUSD = convertRMBToUSD(price);
            const customizedProductPriceUSD = calculateCustomizedPrice(price);

            let updatedQuotes: Quote[];
            if (isUpdate) {
                updatedQuotes = rfq.quotes.map(q =>
                    q.productId === productId && q.purchaserId === user.id
                        ? { ...q, salesCostPriceRMB, salesCostPriceUSD, customizedProductPriceUSD, price: salesCostPriceRMB, priceUSD: salesCostPriceUSD, deliveryDate: deliveryDate.toISOString(), quoteTime: new Date().toISOString(), notes: message }
                        : q
                );
            } else {
                const newQuote: Quote = {
                    id: `quote-${Date.now()}`, rfqId: rfq.id, productId, purchaserId: user.id,
                    salesCostPriceRMB, salesCostPriceUSD, customizedProductPriceUSD,
                    price: salesCostPriceRMB, priceUSD: salesCostPriceUSD,
                    deliveryDate: deliveryDate.toISOString(), quoteTime: new Date().toISOString(),
                    status: 'Pending Acceptance', notes: message
                };
                updatedQuotes = [...rfq.quotes, newQuote];
            }

            const updatedData: any = { quotes: updatedQuotes, status: 'Quotation in Progress' as RFQStatus, lastUpdatedTime: serverTimestamp() };
            if (rfq.status === 'Locked' && rfq.lockedBy === user.id) { updatedData.lockedBy = null; updatedData.lockedAt = null; }

            await updateDoc(doc(db, "rfqs", rfq.id), updatedData);
            setRfq(prev => prev ? { ...prev, ...updatedData, status: 'Quotation in Progress' as RFQStatus } : null);

            await addActionHistory(rfq.id, isUpdate ? 'quote_updated' : 'quote_submitted', {
                productId, productName: rfq.products.find(p => p.id === productId)?.sku || '',
                quotePrice: price, previousStatus: rfq.status, newStatus: 'Quotation in Progress'
            });

            createNotification({
                recipientId: rfq.creatorId,
                titleKey: isUpdate ? 'notification_quote_updated_title' : 'notification_new_quote_title',
                bodyKey: isUpdate ? 'notification_quote_updated_body' : 'notification_new_quote_body',
                bodyParams: { purchaserName: user.name, rfqCode: rfq.rfqCode || rfq.code },
                href: `/dashboard/rfq/${rfq.id}`,
            });

            toast({ title: isUpdate ? "Quote Updated" : "Quote Submitted" });
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit the quote.' });
        }
    };

    const handleAbandonQuote = async (productId: string, reason: string) => {
        if (!rfq || !user) return;
        try {
            const abandonedQuote: Quote = {
                id: `quote-${Date.now()}`, rfqId: rfq.id, productId, purchaserId: user.id,
                quoteTime: new Date().toISOString(), deliveryDate: '', status: 'Abandoned',
                abandonmentReason: reason, abandonedAt: new Date().toISOString()
            };
            const updatedQuotes = [...rfq.quotes.filter(q => !(q.productId === productId && q.purchaserId === user.id)), abandonedQuote];
            const allAbandoned = rfq.products.every(p =>
                rfq.assignedPurchaserIds.every(pId => updatedQuotes.find(q => q.productId === p.id && q.purchaserId === pId)?.status === 'Abandoned')
            );
            const newStatus = allAbandoned ? 'Abandoned' : rfq.status;
            await updateDoc(doc(db, "rfqs", rfq.id), { quotes: updatedQuotes, status: newStatus, lastUpdatedTime: serverTimestamp() });
            setRfq(prev => prev ? { ...prev, quotes: updatedQuotes, status: newStatus } : null);
            await addActionHistory(rfq.id, 'quote_abandoned', { productId, abandonmentReason: reason, previousStatus: rfq.status, newStatus });
            createNotification({
                recipientId: rfq.creatorId,
                titleKey: 'notification_quote_abandoned_title',
                bodyKey: 'notification_quote_abandoned_body',
                bodyParams: { purchaserName: user.name, rfqCode: rfq.rfqCode || rfq.code },
                href: `/dashboard/rfq/${rfq.id}`,
            });
            toast({ title: t('quote_abandoned'), description: t('quote_abandoned_description') });
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to abandon the quote.' });
        }
    };

    const handleSaveRfq = async () => {
        if (!rfq || !user) return;
        try {
            const formData = editForm.getValues();
            const isValid = await editForm.trigger();
            if (!isValid) {
                toast({ variant: "destructive", title: "Validation Error", description: "Please check all required fields." });
                return;
            }

            const updatedProducts = await Promise.all(
                formData.products.map(async (product: any, productIndex: number) => {
                    const imageState = editingImages[productIndex] || { existing: [], new: [] };
                    let newImageUrls: string[] = [];
                    if (imageState.new.length > 0) {
                        const uploads = imageState.new.map(async (file, i) => {
                            try {
                                const storageRef = ref(storage, `rfqs/${rfq.id}/${product.id}/${Date.now()}_${i}_${file.name}`);
                                const snap = await uploadBytes(storageRef, file);
                                return await getDownloadURL(snap.ref);
                            } catch { return null; }
                        });
                        newImageUrls = (await Promise.all(uploads)).filter((u): u is string => u !== null);
                    }
                    return { ...product, images: [...imageState.existing, ...newImageUrls] };
                })
            );

            const updatedData = {
                customerType: formData.customerType,
                customerEmail: formData.customerEmail,
                assignedPurchaserIds: formData.assignedPurchaserIds,
                products: updatedProducts,
                updatedAt: new Date().toISOString(),
                updatedBy: user.id,
                lastUpdatedTime: serverTimestamp(),
            };

            await updateDoc(doc(db, "rfqs", rfq.id), updatedData);
            setRfq(prev => prev ? { ...prev, ...updatedData } : null);
            setIsEditing(false);
            setEditingImages({});

            await addActionHistory(rfq.id, 'rfq_edited', {
                customerEmail: formData.customerEmail,
                customerType: formData.customerType,
            });
            toast({ title: "RFQ Updated", description: "The RFQ has been successfully updated." });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to update the RFQ. Please try again." });
        }
    };

    const handleMarkAsSent = async () => {
        if (!rfq || !user || user.role !== 'Sales') return;
        try {
            await updateDoc(doc(db, "rfqs", rfq.id), { status: 'Sent' as RFQStatus, sentAt: serverTimestamp(), sentBy: user.id, lastUpdatedTime: serverTimestamp() });
            setRfq(prev => prev ? { ...prev, status: 'Sent' } : null);
            await addActionHistory(rfq.id, 'rfq_sent', { previousStatus: rfq.status, newStatus: 'Sent' });
            toast({ title: t('rfq_sent_title'), description: t('rfq_sent_description') });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to mark RFQ as sent." });
        }
    };

    const handleCopyRfq = async () => {
        if (!rfq || !user) return;
        try {
            const newId = await copyRfq(rfq, user.id);
            toast({ title: t('rfq_copied'), description: t('rfq_copied_description') });
            router.push(`/dashboard/rfq/${newId}`);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to copy RFQ.' });
        }
    };


    const handleCancelRfq = async () => {
        if (!rfq || !user) return;
        if (user.id !== rfq.creatorId && user.role !== 'Admin') return;
        try {
            await updateDoc(doc(db, "rfqs", rfq.id), { status: 'Canceled' as RFQStatus, lastUpdatedTime: serverTimestamp() });
            setRfq(prev => prev ? { ...prev, status: 'Canceled' } : null);
            await addActionHistory(rfq.id, 'rfq_canceled', { previousStatus: rfq.status, newStatus: 'Canceled' });
            toast({ title: t('rfq_canceled_title'), description: t('rfq_canceled_description', { rfqCode: rfq.rfqCode || rfq.code }) });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to cancel the RFQ." });
        }
    };

    const handleRemoveImage = (productIndex: number, imageIndex: number) => {
        setEditingImages(prev => {
            const updated = { ...prev };
            updated[productIndex] = { ...updated[productIndex], existing: updated[productIndex].existing.filter((_, i) => i !== imageIndex) };
            return updated;
        });
    };

    const handleAddImages = (productIndex: number, files: FileList | null) => {
        if (!files || files.length === 0) return;
        const fileArray = Array.from(files);
        const current = editingImages[productIndex] || { existing: [], new: [] };
        if (current.existing.length + current.new.length + fileArray.length > 5) {
            toast({ variant: "destructive", title: "Too Many Images", description: `Maximum 5 images allowed per product.` });
            return;
        }
        setEditingImages(prev => {
            const updated = { ...prev };
            if (!updated[productIndex]) updated[productIndex] = { existing: [], new: [] };
            updated[productIndex] = { ...updated[productIndex], new: [...updated[productIndex].new, ...fileArray] };
            return updated;
        });
    };

    const handleRemoveNewImage = (productIndex: number, imageIndex: number) => {
        setEditingImages(prev => {
            const updated = { ...prev };
            updated[productIndex] = { ...updated[productIndex], new: updated[productIndex].new.filter((_, i) => i !== imageIndex) };
            return updated;
        });
    };

    const getStatusVariant = (status: RFQStatus) => {
        switch (status) {
            case 'Waiting for Quote': return 'secondary';
            case 'Locked': return 'destructive';
            case 'Quotation in Progress': return 'default';
            case 'Quotation Completed': return 'outline';
            case 'Sent': return 'default';
            case 'Canceled': case 'Archived': case 'Abandoned': return 'destructive';
            default: return 'secondary';
        }
    };

    // ── Loading / Not Found ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!rfq) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">RFQ not found</h2>
                    <Button onClick={() => router.back()} className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const isUserAssigned = rfq.assignedPurchaserIds?.includes(user?.id || '') || false;
    const canCancel = user && rfq && (user.id === rfq.creatorId || user.role === 'Admin') && !['Canceled', 'Archived', 'Sent'].includes(rfq.status);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        RFQ Detail {rfq.rfqCode || rfq.code || `RFQ-${rfq.id.slice(0, 6)}`}
                        <Badge variant={getStatusVariant(rfq.status)}>{t(`status_${rfq.status.toLowerCase().replace(/ /g, '_')}`)}</Badge>
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-muted-foreground">
                            {t('field_label_inquiry_time')}: {formatFirestoreDate(rfq.inquiryTime)}
                        </p>
                        {rfq.status === 'Locked' && rfq.lockedBy && (
                            <p className="text-sm text-muted-foreground">
                                {t('locked_by', { userName: users.find(u => u.id === rfq.lockedBy)?.name || 'Unknown' })}
                            </p>
                        )}
                        {rfq.status === 'Sent' && (
                            <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                {t('rfq_sent_to_customer')} by {users.find(u => u.id === rfq.sentBy)?.name || 'Unknown'} on {formatFirestoreDate(rfq.sentAt)}
                            </p>
                        )}
                    </div>
                </div>

                {/* Lock/Unlock */}
                {user?.role === 'Purchasing' && rfq.assignedPurchaserIds.includes(user.id) && ['Waiting for Quote', 'Locked'].includes(rfq.status) && (
                    <Button variant={rfq.status === 'Locked' ? "destructive" : "outline"} onClick={handleLockToggle} className="flex items-center gap-2">
                        {rfq.status === 'Locked' ? <><Unlock className="h-4 w-4" />{t('button_unlock_rfq')}</> : <><Lock className="h-4 w-4" />{t('button_lock_rfq')}</>}
                    </Button>
                )}

                {/* Copy RFQ */}
                    {user?.role === 'Sales' && (
                        <Button variant="outline" onClick={handleCopyRfq} className="flex items-center gap-2">
                            <Copy className="h-4 w-4" />
                            {t('button_copy_rfq')}
                        </Button>
                    )}

                {/* Edit */}
                {user?.role === 'Sales' && user.id === rfq.creatorId && rfq.status === 'Waiting for Quote' && (
                    <Button variant="outline" onClick={() => setIsEditing(!isEditing)} className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        {isEditing ? 'Cancel Edit' : 'Edit RFQ'}
                    </Button>
                )}

                {/* Mark as Sent */}
                {user?.role === 'Sales' && rfq.status === 'Quotation Completed' && (
                    <Button variant="default" onClick={handleMarkAsSent} className="flex items-center gap-2">
                        <Send className="h-4 w-4" />{t('button_mark_as_sent')}
                    </Button>
                )}

                {/* Cancel */}
                {canCancel && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="flex items-center gap-2">
                                <XCircle className="h-4 w-4" />{t('button_cancel_rfq')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('cancel_rfq_confirmation_title')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('cancel_rfq_confirmation_body')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Back</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelRfq}>{t('button_confirm_cancel')}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>

            {/* Main Content */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">

                    {/* Editing mode */}
                    {isEditing && (
                        <ProductEditForm
                            rfq={rfq}
                            editForm={editForm}
                            editingImages={editingImages}
                            onAddImages={handleAddImages}
                            onRemoveImage={handleRemoveImage}
                            onRemoveNewImage={handleRemoveNewImage}
                            t={t}
                        />
                    )}

                    {/* View mode */}
                    {!isEditing && rfq.products.map((product) => {
                        const productQuotes = (rfq.quotes || []).filter(q => q.productId === product.id);
                        const userQuote = productQuotes.find(q => q.purchaserId === user?.id);
                        const acceptedQuote = productQuotes.find(q => q.status === 'Accepted');
                        const canSalesAccept = user?.role === 'Sales' && !acceptedQuote && productQuotes.some(q => q.status !== 'Abandoned');

                        return (
                            <Card key={product.id}>
                                <CardHeader>
                                    <CardTitle>{product.sku || 'N/A'}</CardTitle>
                                    <CardDescription>WLID: {product.wlid}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                <ProductView
                                        product={product}
                                        onImageClick={(url) => { setSelectedImage(url); setIsImageModalOpen(true); }}
                                        t={t}
                                        language={language}
                                        productTranslations={rfq.translations?.[product.id]}
                                    />
                                    <Separator />
                                    <QuoteSection
                                        product={product}
                                        productQuotes={productQuotes}
                                        acceptedQuote={acceptedQuote}
                                        canSalesAccept={canSalesAccept}
                                        isUserAssigned={isUserAssigned}
                                        userQuote={userQuote}
                                        userRole={user?.role}
                                        users={users}
                                        t={t}
                                        onAcceptQuote={handleAcceptQuote}
                                        onQuoteSubmit={handleQuoteSubmit}
                                        onAbandonQuote={handleAbandonQuote}
                                    />
                                    <Separator />
                                    <ProductComments
                                        productId={product.id}
                                        comments={(rfq.comments || []).filter(c => c.productId === product.id)}
                                        currentUser={user as any}
                                        onAddComment={handleAddComment}
                                        t={t}
                                    />
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <CustomerSidebar
                        rfq={rfq}
                        creator={creator}
                        purchasingUsers={purchasingUsers}
                        isEditing={isEditing}
                        editForm={editForm}
                        t={t}
                    />
                    <ActionHistorySection rfq={rfq} t={t} />
                </div>
            </div>

            {/* Save/Cancel bar */}
            {isEditing && (
                <div className="flex justify-end gap-2 mt-6 border-t pt-6">
                    <Button variant="outline" onClick={() => {
                        setIsEditing(false);
                        setEditingImages({});
                        editForm.reset({
                            customerType: rfq.customerType,
                            customerEmail: rfq.customerEmail,
                            assignedPurchaserIds: rfq.assignedPurchaserIds,
                            products: rfq.products.map(p => ({ ...p, imageFiles: [] }))
                        });
                    }}>
                        Cancel
                    </Button>
                    <Button onClick={handleSaveRfq}>
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                </div>
            )}

            <ImageModal
                selectedImage={selectedImage}
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
            />
        </div>
    );
}
