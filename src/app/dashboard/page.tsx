"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, FileText, Users, ChevronDown, FilterX, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RFQ, RFQStatus, User } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { copyRfq } from '@/lib/copy-rfq';
import { Copy } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// ─────────────────────────────────────────────────────────────────────────────
// All helper components are at module level so their internal useState hooks
// are stable across parent re-renders.
// ─────────────────────────────────────────────────────────────────────────────

const ColumnFilterHeader = ({
    label,
    isActive,
    children,
}: {
    label: string;
    isActive: boolean;
    children: React.ReactNode;
}) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button className={`flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors whitespace-nowrap w-full ${isActive ? 'text-primary' : ''}`}>
                    {label}
                    {isActive
                        ? <FilterX className="h-3 w-3 text-primary flex-shrink-0" />
                        : <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
                    }
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                    {children}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const TextFilterInput = ({
    placeholder,
    value,
    onCommit,
    onClear,
    clearLabel,
}: {
    placeholder: string;
    value: string;
    onCommit: (v: string) => void;
    onClear: () => void;
    clearLabel: string;
}) => {
    const [local, setLocal] = useState(value);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { if (value === '') setLocal(''); }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setLocal(v);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => onCommit(v), 300);
    };

    return (
        <>
            <Input placeholder={placeholder} value={local} onChange={handleChange} className="h-7 text-xs" />
            {local && (
                <Button variant="ghost" size="sm" className="w-full h-6 text-xs mt-1"
                    onClick={() => { setLocal(''); onClear(); }}>
                    {clearLabel}
                </Button>
            )}
        </>
    );
};

const NumberRangeInput = ({
    minValue, maxValue, onCommitMin, onCommitMax, onClear, clearLabel,
}: {
    minValue: string; maxValue: string;
    onCommitMin: (v: string) => void; onCommitMax: (v: string) => void;
    onClear: () => void;
    clearLabel: string;
}) => {
    const [localMin, setLocalMin] = useState(minValue);
    const [localMax, setLocalMax] = useState(maxValue);
    const timerMin = useRef<ReturnType<typeof setTimeout> | null>(null);
    const timerMax = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { if (minValue === '') setLocalMin(''); }, [minValue]);
    useEffect(() => { if (maxValue === '') setLocalMax(''); }, [maxValue]);

    const handleMin = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value; setLocalMin(v);
        if (timerMin.current) clearTimeout(timerMin.current);
        timerMin.current = setTimeout(() => onCommitMin(v), 300);
    };
    const handleMax = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value; setLocalMax(v);
        if (timerMax.current) clearTimeout(timerMax.current);
        timerMax.current = setTimeout(() => onCommitMax(v), 300);
    };

    return (
        <>
            <div className="flex gap-1 items-center">
                <Input type="number" placeholder="Min" value={localMin} onChange={handleMin} className="h-7 text-xs w-[72px]" />
                <span className="text-xs text-muted-foreground">–</span>
                <Input type="number" placeholder="Max" value={localMax} onChange={handleMax} className="h-7 text-xs w-[72px]" />
            </div>
            {(localMin || localMax) && (
                <Button variant="ghost" size="sm" className="w-full h-6 text-xs mt-1"
                    onClick={() => { setLocalMin(''); setLocalMax(''); onClear(); }}>
                    {clearLabel}
                </Button>
            )}
        </>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Filter state type
// ─────────────────────────────────────────────────────────────────────────────
type Filters = {
    code: string; customerType: string; customerEmail: string;
    refSku: string; color: string; length: string;
    salePriceMin: string; salePriceMax: string;
    inquiryFrom: string; inquiryTo: string;
    lastUpdatedFrom: string; lastUpdatedTo: string;
    creatorId: string; sent: string; status: string;
};

const emptyFilters: Filters = {
    code: '', customerType: '', customerEmail: '', refSku: '',
    color: '', length: '', salePriceMin: '', salePriceMax: '',
    inquiryFrom: '', inquiryTo: '', lastUpdatedFrom: '', lastUpdatedTo: '',
    creatorId: '', sent: '', status: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// RFQTable — module-level component so it never gets recreated on parent render
// ─────────────────────────────────────────────────────────────────────────────
type RFQTableProps = {
    data: RFQ[];
    allUsers: User[];
    filters: Filters;
    hasActiveFilters: boolean;
    currentPage: number;
    itemsPerPage: number;
    updateFilter: (key: keyof Filters, value: string) => void;
    clearFilter: (...keys: (keyof Filters)[]) => void;
    clearAllFilters: () => void;
    handlePageChange: (page: number, totalPages: number) => void;
    handleItemsPerPageChange: (n: number) => void;
    jumpToPage: string;
    setJumpToPage: (v: string) => void;
    handleJumpToPage: () => void;
    formatFirestoreDate: (d: any) => string;
    getStatusVariant: (s: RFQStatus) => any;
    getCreatorName: (id: string) => string;
    t: (key: string, params?: any) => string;
    router: ReturnType<typeof useRouter>;
    onCopyRfq?: (rfq: RFQ) => void;
};

const RFQTable = ({
    data, allUsers, filters, hasActiveFilters, currentPage, itemsPerPage,
    updateFilter, clearFilter, clearAllFilters,
    handlePageChange, handleItemsPerPageChange,
    jumpToPage, setJumpToPage, handleJumpToPage,
    formatFirestoreDate, getStatusVariant, getCreatorName, t, router,
    onCopyRfq,
}: RFQTableProps) => {
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = data.slice(start, start + itemsPerPage);

    if (data.length === 0 && !hasActiveFilters) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{t('no_rfqs_found')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {hasActiveFilters && (
                <div className="flex items-center justify-between px-4 pt-3 pb-0">
                    <span className="text-xs text-muted-foreground">
                        {t('results_filtered', { count: data.length.toString() })}
                    </span>
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground h-7">
                        <FilterX className="h-3.5 w-3.5 mr-1" /> {t('clear_all_filters')}
                    </Button>
                </div>
            )}

            <div className="flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{t('items_per_page')}:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={v => handleItemsPerPageChange(Number(v))}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="300">300</SelectItem>
                            <SelectItem value="1000">1000</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <span className="text-sm text-muted-foreground">
                    {t('page_info', { current: currentPage.toString(), total: totalPages.toString(), count: data.length.toString() })}
                </span>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        {/* Code */}
                        <TableHead>
                            <ColumnFilterHeader label={t('field_label_code')} isActive={!!filters.code}>
                                <TextFilterInput
                                    placeholder={t('search_code')}
                                    value={filters.code}
                                    onCommit={v => updateFilter('code', v)}
                                    onClear={() => clearFilter('code')}
                                    clearLabel={t('clear')}
                                />
                            </ColumnFilterHeader>
                        </TableHead>

                        {/* Status */}
                        <TableHead>
                            <ColumnFilterHeader label={t('header_status')} isActive={!!filters.status}>
                                <Select value={filters.status || 'all'} onValueChange={v => updateFilter('status', v === 'all' ? '' : v)}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={t('all')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('all')}</SelectItem>
                                        <SelectItem value="Waiting for Assign">{t('status_waiting_for_assign')}</SelectItem>
                                        <SelectItem value="Waiting for Quote">{t('status_waiting_for_quote')}</SelectItem>
                                        <SelectItem value="Locked">{t('status_locked')}</SelectItem>
                                        <SelectItem value="Quotation in Progress">{t('status_quotation_in_progress')}</SelectItem>
                                        <SelectItem value="Quotation Completed">{t('status_quotation_completed')}</SelectItem>
                                        <SelectItem value="Sent">{t('status_sent')}</SelectItem>
                                        <SelectItem value="Canceled">{t('status_canceled')}</SelectItem>
                                        <SelectItem value="Abandoned">{t('status_abandoned')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {filters.status && (
                                    <Button variant="ghost" size="sm" className="w-full h-6 text-xs mt-1" onClick={() => clearFilter('status')}>{t('clear')}</Button>
                                )}
                            </ColumnFilterHeader>
                        </TableHead>

                        {/* Customer Type */}
                        <TableHead>
                            <ColumnFilterHeader label={t('field_customer_type')} isActive={!!filters.customerType}>
                                <Select value={filters.customerType || 'all'} onValueChange={v => updateFilter('customerType', v === 'all' ? '' : v)}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={t('all')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('all')}</SelectItem>
                                        <SelectItem value="New">{t('customer_type_new')}</SelectItem>
                                        <SelectItem value="Repeating">{t('customer_type_repeating')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {filters.customerType && (
                                    <Button variant="ghost" size="sm" className="w-full h-6 text-xs mt-1" onClick={() => clearFilter('customerType')}>{t('clear')}</Button>
                                )}
                            </ColumnFilterHeader>
                        </TableHead>

                        {/* Customer Email */}
                        <TableHead>
                            <ColumnFilterHeader label={t('field_customer_email')} isActive={!!filters.customerEmail}>
                                <TextFilterInput
                                    placeholder={t('search_email')}
                                    value={filters.customerEmail}
                                    onCommit={v => updateFilter('customerEmail', v)}
                                    onClear={() => clearFilter('customerEmail')}
                                    clearLabel={t('clear')}
                                />
                            </ColumnFilterHeader>
                        </TableHead>

                        {/* Ref. SKU */}
                        <TableHead>
                            <ColumnFilterHeader label={t('header_ref_sku')} isActive={!!filters.refSku}>
                                <TextFilterInput
                                    placeholder={t('search_sku')}
                                    value={filters.refSku}
                                    onCommit={v => updateFilter('refSku', v)}
                                    onClear={() => clearFilter('refSku')}
                                    clearLabel={t('clear')}
                                />
                            </ColumnFilterHeader>
                        </TableHead>

                        {/* Color */}
                        <TableHead>
                            <ColumnFilterHeader label={t('header_color')} isActive={!!filters.color}>
                                <TextFilterInput
                                    placeholder={t('search_color')}
                                    value={filters.color}
                                    onCommit={v => updateFilter('color', v)}
                                    onClear={() => clearFilter('color')}
                                    clearLabel={t('clear')}
                                />
                            </ColumnFilterHeader>
                        </TableHead>

                        {/* Length */}
                        <TableHead>
                            <ColumnFilterHeader label={t('header_length')} isActive={!!filters.length}>
                                <TextFilterInput
                                    placeholder={t('search_length')}
                                    value={filters.length}
                                    onCommit={v => updateFilter('length', v)}
                                    onClear={() => clearFilter('length')}
                                    clearLabel={t('clear')}
                                />
                            </ColumnFilterHeader>
                        </TableHead>

                        {/* Sale Price */}
                        <TableHead>
                            <ColumnFilterHeader label={t('header_sale_price')} isActive={!!(filters.salePriceMin || filters.salePriceMax)}>
                                <NumberRangeInput
                                    minValue={filters.salePriceMin} maxValue={filters.salePriceMax}
                                    onCommitMin={v => updateFilter('salePriceMin', v)}
                                    onCommitMax={v => updateFilter('salePriceMax', v)}
                                    onClear={() => clearFilter('salePriceMin', 'salePriceMax')}
                                    clearLabel={t('clear')}
                                />
                            </ColumnFilterHeader>
                        </TableHead>

                        {/* Inquiry Time */}
                        <TableHead>
                            <ColumnFilterHeader label={t('field_label_inquiry_time')} isActive={!!(filters.inquiryFrom || filters.inquiryTo)}>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">From</p>
                                    <Input type="date" value={filters.inquiryFrom} onChange={e => updateFilter('inquiryFrom', e.target.value)} className="h-7 text-xs" />
                                    <p className="text-xs text-muted-foreground">To</p>
                                    <Input type="date" value={filters.inquiryTo} onChange={e => updateFilter('inquiryTo', e.target.value)} className="h-7 text-xs" />
                                </div>
                                {(filters.inquiryFrom || filters.inquiryTo) && (
                                    <Button variant="ghost" size="sm" className="w-full h-6 text-xs mt-1" onClick={() => clearFilter('inquiryFrom', 'inquiryTo')}>{t('clear')}</Button>
                                )}
                            </ColumnFilterHeader>
                        </TableHead>

                        {/* Last Updated */}
                        <TableHead>
                            <ColumnFilterHeader label={t('header_last_updated')} isActive={!!(filters.lastUpdatedFrom || filters.lastUpdatedTo)}>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">From</p>
                                    <Input type="date" value={filters.lastUpdatedFrom} onChange={e => updateFilter('lastUpdatedFrom', e.target.value)} className="h-7 text-xs" />
                                    <p className="text-xs text-muted-foreground">To</p>
                                    <Input type="date" value={filters.lastUpdatedTo} onChange={e => updateFilter('lastUpdatedTo', e.target.value)} className="h-7 text-xs" />
                                </div>
                                {(filters.lastUpdatedFrom || filters.lastUpdatedTo) && (
                                    <Button variant="ghost" size="sm" className="w-full h-6 text-xs mt-1" onClick={() => clearFilter('lastUpdatedFrom', 'lastUpdatedTo')}>{t('clear')}</Button>
                                )}
                            </ColumnFilterHeader>
                        </TableHead>

                        {/* Creator */}
                        <TableHead>
                            <ColumnFilterHeader label={t('header_creator')} isActive={!!filters.creatorId}>
                                <Select value={filters.creatorId || 'all'} onValueChange={v => updateFilter('creatorId', v === 'all' ? '' : v)}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={t('all')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('all')}</SelectItem>
                                        {allUsers.filter(u => u.role === 'Sales' || u.role === 'Admin').map(u => (
                                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {filters.creatorId && (
                                    <Button variant="ghost" size="sm" className="w-full h-6 text-xs mt-1" onClick={() => clearFilter('creatorId')}>{t('clear')}</Button>
                                )}
                            </ColumnFilterHeader>
                        </TableHead>

                        {/* Sent */}
                        <TableHead>
                            <ColumnFilterHeader label={t('header_sent')} isActive={!!filters.sent}>
                                <Select value={filters.sent || 'all'} onValueChange={v => updateFilter('sent', v === 'all' ? '' : v)}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={t('all')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('all')}</SelectItem>
                                        <SelectItem value="yes">{t('status_sent')}</SelectItem>
                                        <SelectItem value="no">{t('not_sent')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {filters.sent && (
                                    <Button variant="ghost" size="sm" className="w-full h-6 text-xs mt-1" onClick={() => clearFilter('sent')}>{t('clear')}</Button>
                                )}
                            </ColumnFilterHeader>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={12} className="p-8 text-center text-muted-foreground">
                                <FilterX className="mx-auto h-8 w-8 mb-2 opacity-40" />
                                <p className="text-sm">{t('no_results_match')}</p>
                                <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={clearAllFilters}>
                                    {t('clear_all_filters')}
                                </Button>
                            </td>
                        </tr>
                    ) : (
                        paginated.map((rfq) => {
                            const isLocked = rfq.status === 'Locked';
                            const firstProduct = rfq.products?.[0] ?? null;
                            return (
                                <TableRow key={rfq.id}>
                                    <TableCell className="font-medium underline cursor-pointer hover:text-primary"
                                        onClick={() => router.push(`/dashboard/rfq/${rfq.id}`)}>
                                        {rfq.rfqCode || rfq.code || `RFQ-${rfq.id.slice(0, 6)}`}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={getStatusVariant(rfq.status)} className="whitespace-nowrap">
                                                    {t(`status_${rfq.status.toLowerCase().replace(/ /g, '_')}`)}
                                                </Badge>
                                                {isLocked && rfq.lockedBy && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {t('locked_by', { userName: allUsers.find(u => u.id === rfq.lockedBy)?.name || 'Unknown' })}
                                                    </span>
                                                )}
                                            </div>
                                            {rfq.assignedPurchaserIds?.length > 0 && ['Quotation in Progress', 'Waiting for Quote', 'Locked', 'Quotation Completed'].includes(rfq.status) && (() => {
                                                const quoted = rfq.assignedPurchaserIds.filter(id =>
                                                    rfq.quotes?.some(q => q.purchaserId === id && q.status !== 'Abandoned')
                                                ).length;
                                                const abandoned = rfq.assignedPurchaserIds.filter(id =>
                                                    rfq.quotes?.some(q => q.purchaserId === id && q.status === 'Abandoned') &&
                                                    !rfq.quotes?.some(q => q.purchaserId === id && q.status !== 'Abandoned')
                                                ).length;
                                                const pending = rfq.assignedPurchaserIds.length - quoted - abandoned;
                                                return (
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        {quoted > 0 && <span title="Quoted">✅ {quoted}</span>}
                                                        {pending > 0 && <span title="Pending">🕐 {pending}</span>}
                                                        {abandoned > 0 && <span title="Abandoned">❌ {abandoned}</span>}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </TableCell>
                                    <TableCell>{rfq.customerType ? t(`customer_type_${rfq.customerType.toLowerCase()}`) : t('value_default')}</TableCell>
                                    <TableCell>{rfq.customerEmail || t('value_default')}</TableCell>
                                    <TableCell>{firstProduct?.sku || t('value_default')}</TableCell>
                                    <TableCell>{firstProduct?.color || t('value_default')}</TableCell>
                                    <TableCell>{firstProduct?.length || t('value_default')}</TableCell>
                                    <TableCell>
                                        {rfq.quotes && rfq.quotes.length > 0 ? (
                                            <div className="grid gap-1">
                                                {rfq.quotes
                                                    .filter(q => q.status === 'Accepted' && (q.customizedProductPriceUSD || q.salesCostPriceRMB || q.price))
                                                    .map((q, i) => (
                                                        <div key={i} className="text-xs">
                                                            ${(q.customizedProductPriceUSD || 0).toFixed(2)} {t('by_purchaser')} {allUsers.find(u => u.id === q.purchaserId)?.name || 'Unknown'}
                                                        </div>
                                                    ))}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">{t('no_quotes')}</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{formatFirestoreDate(rfq.inquiryTime)}</TableCell>
                                    <TableCell>{formatFirestoreDate(rfq.lastUpdatedTime || rfq.inquiryTime)}</TableCell>
                                    <TableCell>{getCreatorName(rfq.creatorId)}</TableCell>
                                    <TableCell>
                                        <Checkbox checked={rfq.status === 'Sent'} disabled aria-label="Sent status" />
                                    </TableCell>
                                    {onCopyRfq && (
                                        <TableCell>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => onCopyRfq(rfq)}
                                                            className="p-1.5 rounded hover:bg-muted transition-colors"
                                                        >
                                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p>Duplicate RFQ</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            <div className="flex items-center justify-between px-4 pb-4">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{t('jump_to_page')}:</span>
                    <Input type="number" min="1" max={totalPages} value={jumpToPage}
                        onChange={e => setJumpToPage(e.target.value)} className="w-20" placeholder="Page" />
                    <Button variant="outline" size="sm" onClick={handleJumpToPage}>{t('go')}</Button>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1, totalPages)} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" /> {t('previous')}
                    </Button>
                    <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let p: number;
                            if (totalPages <= 5) p = i + 1;
                            else if (currentPage <= 3) p = i + 1;
                            else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                            else p = currentPage - 2 + i;
                            return (
                                <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm"
                                    onClick={() => handlePageChange(p, totalPages)} className="w-8 h-8 p-0">
                                    {p}
                                </Button>
                            );
                        })}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1, totalPages)} disabled={currentPage === totalPages}>
                        {t('next')} <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// DashboardPage
// ─────────────────────────────────────────────────────────────────────────────
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
    const [filters, setFilters] = useState<Filters>(emptyFilters);

    const updateFilter = useCallback((key: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    }, []);

    const clearFilter = useCallback((...keys: (keyof Filters)[]) => {
        setFilters(prev => {
            const updated = { ...prev };
            keys.forEach(k => { updated[k] = ''; });
            return updated;
        });
        setCurrentPage(1);
    }, []);

    const clearAllFilters = useCallback(() => {
        setFilters(emptyFilters);
        setCurrentPage(1);
    }, []);

    const hasActiveFilters = Object.values(filters).some(v => v !== '');

    const getTimestamp = (dateField: any): number => {
        try {
            if (!dateField) return 0;
            if (typeof dateField === 'object' && dateField.toDate) return dateField.toDate().getTime();
            if (typeof dateField === 'object' && dateField.seconds) return dateField.seconds * 1000;
            if (typeof dateField === 'string') { const d = new Date(dateField); return isNaN(d.getTime()) ? 0 : d.getTime(); }
            if (typeof dateField === 'number') return dateField;
            return 0;
        } catch { return 0; }
    };

    const formatFirestoreDate = useCallback((dateField: any): string => {
        try {
            if (!dateField) return 'N/A';
            let date: Date | null = null;
            if (typeof dateField === 'object' && dateField.toDate) date = dateField.toDate();
            else if (typeof dateField === 'object' && dateField.seconds) date = new Date(dateField.seconds * 1000);
            else if (typeof dateField === 'string') date = new Date(dateField);
            else if (typeof dateField === 'number') date = new Date(dateField);
            if (!date || isNaN(date.getTime())) return 'N/A';
            const hh = date.getHours().toString().padStart(2, '0');
            const mm = date.getMinutes().toString().padStart(2, '0');
            const ss = date.getSeconds().toString().padStart(2, '0');
            const yyyy = date.getFullYear();
            const mo = (date.getMonth() + 1).toString().padStart(2, '0');
            const dd = date.getDate().toString().padStart(2, '0');
            return `${hh}:${mm}:${ss} ${yyyy}/${mo}/${dd}`;
        } catch { return 'N/A'; }
    }, []);

    const addActionHistory = async (rfqId: string, actionType: string, details?: any) => {
        if (!user) return;
        try {
            const rfqRef = doc(db, 'rfqs', rfqId);
            const currentRfq = rfqs.find(r => r.id === rfqId);
            if (!currentRfq) return;
            const newAction = {
                id: `action-${Date.now()}`, rfqId, actionType,
                performedBy: user.id, performedByName: user.name,
                timestamp: new Date().toISOString(), details: details || {}
            };
            const updatedHistory = [...(currentRfq.actionHistory || []), newAction];
            await updateDoc(rfqRef, { actionHistory: updatedHistory });
            setRfqs(prev => prev.map(r => r.id === rfqId ? { ...r, actionHistory: updatedHistory as typeof r.actionHistory } : r));
        } catch (error) { console.error('Error adding action history:', error); }
    };

    const handleLockToggle = async (rfq: RFQ) => {
        if (!user || user.role !== 'Purchasing') return;
        if (!rfq.assignedPurchaserIds.includes(user.id)) return;
        try {
            const rfqRef = doc(db, 'rfqs', rfq.id);
            const locked = rfq.status === 'Locked';
            const updates: any = { status: locked ? 'Waiting for Quote' : 'Locked', updatedAt: serverTimestamp() };
            if (!locked) { updates.lockedBy = user.id; updates.lockedAt = serverTimestamp(); }
            else { updates.lockedBy = null; updates.lockedAt = null; }
            await updateDoc(rfqRef, updates);
            setRfqs(prev => prev.map(r => r.id === rfq.id
                ? { ...r, status: locked ? 'Waiting for Quote' : 'Locked', lockedBy: locked ? undefined : user.id }
                : r));
            await addActionHistory(rfq.id, locked ? 'rfq_unlocked' : 'rfq_locked', {
                previousStatus: rfq.status, newStatus: locked ? 'Waiting for Quote' : 'Locked'
            });
            toast({ title: locked ? t('button_unlock_rfq') : t('button_lock_rfq'), description: `RFQ ${rfq.rfqCode || rfq.code} has been ${locked ? 'unlocked' : 'locked'}.` });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to update RFQ status." });
        }
    };

    const handleCloseRfq = async (rfq: RFQ) => {
        if (!user || user.role !== 'Sales' || rfq.creatorId !== user.id) return;
        if (rfq.status !== 'Waiting for Quote') return;
        try {
            await updateDoc(doc(db, 'rfqs', rfq.id), {
                status: 'Archived' as RFQStatus, archivedAt: serverTimestamp(),
                archivedBy: user.id, archiveReason: 'Closed by Sales - No quotes needed', lastUpdatedTime: serverTimestamp()
            });
            setRfqs(prev => prev.filter(r => r.id !== rfq.id));
            await addActionHistory(rfq.id, 'rfq_closed', { previousStatus: rfq.status, newStatus: 'Archived' });
            toast({ title: t('rfq_closed'), description: t('rfq_closed_description') });
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to close RFQ." });
        }
    };

    const handlePageChange = useCallback((page: number, total: number) => {
        if (page >= 1 && page <= total) setCurrentPage(page);
    }, []);

    const handleItemsPerPageChange = useCallback((n: number) => {
        setItemsPerPage(n); setCurrentPage(1);
    }, []);

    const handleJumpToPage = useCallback(() => {
        const n = parseInt(jumpToPage);
        const total = Math.ceil(rfqs.length / itemsPerPage);
        if (!isNaN(n)) { handlePageChange(n, total); setJumpToPage(''); }
    }, [jumpToPage, rfqs.length, itemsPerPage, handlePageChange]);

    useEffect(() => {
        const fetchData = async () => {
            if (typeof window === 'undefined' || !db) { setLoading(false); return; }
            try {
                const rfqsSnap = await getDocs(collection(db, 'rfqs'));
                const rfqsData = rfqsSnap.docs.map(d => ({ id: d.id, ...d.data(), inquiryTime: d.data().inquiryTime })) as RFQ[];
                setRfqs(rfqsData.sort((a, b) => getTimestamp(b.inquiryTime) - getTimestamp(a.inquiryTime)));
                const usersSnap = await getDocs(collection(db, 'users'));
                const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as User[];
                setAllUsers(usersData);
                setPurchasingUsers(usersData.filter(u => u.role === 'Purchasing' && u.status === 'Active'));
            } catch (error) {
                console.error('Error fetching data:', error);
                setRfqs([]); setAllUsers([]); setPurchasingUsers([]);
            } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const getStatusVariant = useCallback((status: RFQStatus) => {
        switch (status) {
            case 'Waiting for Quote': return 'secondary';
            case 'Waiting for Assign': return 'outline';
            case 'Locked': return 'destructive';
            case 'Quotation in Progress': return 'default';
            case 'Quotation Completed': return 'outline';
            case 'Sent': return 'default';
            case 'Abandoned': return 'destructive';
            case 'Closed': return 'secondary';
            case 'Canceled': case 'Archived': return 'destructive';
            default: return 'secondary';
        }
    }, []);

    const getCreatorName = useCallback((creatorId: string) =>
        allUsers.find(u => u.id === creatorId)?.name || 'Unknown',
    [allUsers]);

    const applyFilters = (data: RFQ[]): RFQ[] => {
        return data.filter(rfq => {
            const fp = rfq.products?.[0];
            const accepted = rfq.quotes?.filter(q => q.status === 'Accepted') || [];
            if (filters.code && !(rfq.rfqCode || rfq.code || '').toLowerCase().includes(filters.code.toLowerCase())) return false;
            if (filters.customerType && rfq.customerType !== filters.customerType) return false;
            if (filters.customerEmail && !(rfq.customerEmail || '').toLowerCase().includes(filters.customerEmail.toLowerCase())) return false;
            if (filters.refSku && !(fp?.sku || '').toLowerCase().includes(filters.refSku.toLowerCase())) return false;
            if (filters.color && !(fp?.color || '').toLowerCase().includes(filters.color.toLowerCase())) return false;
            if (filters.length && !(fp?.length || '').toLowerCase().includes(filters.length.toLowerCase())) return false;
            if (filters.salePriceMin || filters.salePriceMax) {
                if (accepted.length === 0) return false;
                const price = Math.min(...accepted.map(q => q.customizedProductPriceUSD || 0));
                if (filters.salePriceMin && price < parseFloat(filters.salePriceMin)) return false;
                if (filters.salePriceMax && price > parseFloat(filters.salePriceMax)) return false;
            }
            if (filters.inquiryFrom || filters.inquiryTo) {
                const ts = getTimestamp(rfq.inquiryTime);
                if (filters.inquiryFrom && ts < new Date(filters.inquiryFrom).getTime()) return false;
                if (filters.inquiryTo && ts > new Date(filters.inquiryTo + 'T23:59:59').getTime()) return false;
            }
            if (filters.lastUpdatedFrom || filters.lastUpdatedTo) {
                const ts = getTimestamp(rfq.lastUpdatedTime || rfq.inquiryTime);
                if (filters.lastUpdatedFrom && ts < new Date(filters.lastUpdatedFrom).getTime()) return false;
                if (filters.lastUpdatedTo && ts > new Date(filters.lastUpdatedTo + 'T23:59:59').getTime()) return false;
            }
            if (filters.creatorId && rfq.creatorId !== filters.creatorId) return false;
            if (filters.status && rfq.status !== filters.status) return false;
            if (filters.sent === 'yes' && rfq.status !== 'Sent') return false;
            if (filters.sent === 'no' && rfq.status === 'Sent') return false;
            return true;
        });
    };

    const filteredRfqs = applyFilters(rfqs.filter(r => r.status !== 'Archived'));
    const myRfqs = applyFilters(rfqs.filter(rfq => rfq.creatorId === user?.id));
    const requiresMyQuote = applyFilters(rfqs.filter(rfq =>
        rfq.assignedPurchaserIds?.includes(user?.id || '') && rfq.status !== 'Quotation Completed'
    ));
    const unassignedRfqs = applyFilters(rfqs.filter(r => r.status === 'Waiting for Assign'));

    const handleCopyRfq = async (rfq: RFQ) => {
        if (!user || user.role !== 'Sales') return;
        try {
            const newId = await copyRfq(rfq, user.id);
            toast({ title: t('rfq_copied'), description: t('rfq_copied_description') });
            router.push(`/dashboard/rfq/${newId}`);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to copy RFQ.' });
        }
    };

    const tableProps = {
        allUsers, filters, hasActiveFilters, currentPage, itemsPerPage,
        updateFilter, clearFilter, clearAllFilters,
        handlePageChange, handleItemsPerPageChange,
        jumpToPage, setJumpToPage, handleJumpToPage,
        formatFirestoreDate, getStatusVariant, getCreatorName, t, router,
        onCopyRfq: user?.role === 'Sales' ? handleCopyRfq : undefined,
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
                <h1 className="text-3xl font-bold tracking-tight">{t('inquiries_title')}</h1>
                    <p className="text-muted-foreground">{t('inquiries_subtitle')}</p>
                </div>
                {user?.role === 'Sales' && (
                    <Button onClick={() => router.push('/dashboard/rfq/new')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('button_create_new_rfq')}
                    </Button>
                    
                )}

            </div>

            {user?.role === 'Sales' && purchasingUsers.length === 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <Users className="h-5 w-5 text-orange-600" />
                            <h3 className="font-semibold text-orange-900 dark:text-orange-100">{t('setup_required')}</h3>
                        </div>
                        <p className="text-orange-800 dark:text-orange-200 mt-2">
                            {t('setup_required_description')}
                        </p>
                        <Button variant="outline" className="mt-3" onClick={() => router.push('/dashboard/users')}>
                            <Users className="mr-2 h-4 w-4" /> {t('go_to_user_management')}
                        </Button>
                    </CardContent>
                </Card>
            )}

                <Tabs defaultValue={
                    user?.role === 'Sales' ? 'my_rfqs' :
                    user?.role === 'Purchasing' ? 'my_quotes' :
                    user?.role === 'Order Manager' ? 'unassigned' :
                    'all_rfqs'
                }>
            <TabsList>
                {user?.role === 'Sales' && <TabsTrigger value="my_rfqs">{t('dashboard_my_rfqs_tab')}</TabsTrigger>}
                {user?.role === 'Purchasing' && <TabsTrigger value="my_quotes">{t('dashboard_my_quotes_tab')}</TabsTrigger>}
                {user?.role === 'Order Manager' && <TabsTrigger value="unassigned">{t('dashboard_unassigned_tab')}</TabsTrigger>}
                <TabsTrigger value="all_rfqs">{t('dashboard_all_rfqs_tab')}</TabsTrigger>
            </TabsList>
                <Card className="mt-4">
                    <CardContent className="p-0">
                        <TabsContent value="all_rfqs" className="m-0">
                            <RFQTable data={filteredRfqs} {...tableProps} />
                        </TabsContent>
                        {user?.role === 'Sales' && (
                            <TabsContent value="my_rfqs" className="m-0">
                                <RFQTable data={myRfqs} {...tableProps} />
                            </TabsContent>
                        )}
                        {user?.role === 'Purchasing' && (
                            <TabsContent value="my_quotes" className="m-0">
                                <RFQTable data={requiresMyQuote} {...tableProps} />
                            </TabsContent>
                        )}
                        {user?.role === 'Order Manager' && (
                            <TabsContent value="unassigned" className="m-0">
                                <RFQTable data={unassignedRfqs} {...tableProps} />
                            </TabsContent>
                        )}
                    </CardContent>
                </Card>
            </Tabs>

            {user?.role === 'Admin' && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('admin_total_users')}</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{allUsers.length}</div>
                            <p className="text-xs text-muted-foreground">
                                {allUsers.filter(u => u.role === 'Sales').length} {t('user_role_sales')}, {purchasingUsers.length} {t('user_role_purchasing')}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('admin_total_rfqs')}</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{rfqs.length}</div>
                            <p className="text-xs text-muted-foreground">{rfqs.filter(r => r.status === 'Quotation Completed').length} {t('admin_completed')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('admin_active_rfqs')}</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {rfqs.filter(r => !['Quotation Completed', 'Archived', 'Canceled', 'Sent'].includes(r.status)).length}
                            </div>
                            <p className="text-xs text-muted-foreground">{t('admin_awaiting_quotes')}</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
