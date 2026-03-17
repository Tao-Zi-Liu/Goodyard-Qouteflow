"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, FileText, Lock, Unlock, Send, Edit, CheckCircle, XCircle, History } from 'lucide-react';
import type { RFQ } from './types';

const formatFirestoreDate = (date: any): string => {
    if (!date) return 'N/A';
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleString();
    if (date instanceof Date) return date.toLocaleString();
    if (typeof date === 'string') return new Date(date).toLocaleString();
    return 'N/A';
};

interface ActionHistorySectionProps {
    rfq: RFQ;
    t: (key: string, params?: any) => string;
}

export function ActionHistorySection({ rfq, t }: ActionHistorySectionProps) {
    if (!rfq.actionHistory || rfq.actionHistory.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        {t('action_history_title')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{t('no_action_history')}</p>
                </CardContent>
            </Card>
        );
    }

    const sortedHistory = [...rfq.actionHistory].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    {t('action_history_title')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {sortedHistory.map((action) => (
                        <div key={action.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="flex-shrink-0 mt-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">
                                        {t(`action_${action.actionType}`)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatFirestoreDate(action.timestamp)}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {t('by')} {action.performedByName}
                                </p>
                                {action.details?.previousStatus && action.details?.newStatus && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('status_changed_from')} "{t(`status_${action.details.previousStatus.toLowerCase().replace(/ /g, '_')}`)}"
                                        {' '}{t('to')} "{t(`status_${action.details.newStatus.toLowerCase().replace(/ /g, '_')}`)}"
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
