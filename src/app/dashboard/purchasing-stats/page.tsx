
"use client"
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, Legend, ResponsiveContainer, Pie, PieChart, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/use-auth';
import { MOCK_RFQS } from '@/lib/data';
import type { RFQ, Quote } from '@/lib/types';
import { useI18n } from '@/hooks/use-i18n';

const CHART_COLORS = ["#00C49F", "#FFBB28", "#FF8042", "#0088FE"];

export default function PurchasingStatsPage() {
    const { user } = useAuth();
    const { t } = useI18n();

    const myAssignedRfqs = useMemo(() => {
        if (!user) return [];
        return MOCK_RFQS.filter(rfq => rfq.assignedPurchaserIds.includes(user.id));
    }, [user]);

    const myQuotes = useMemo(() => {
        if (!user) return [];
        const quotes: Quote[] = [];
        MOCK_RFQS.forEach(rfq => {
            rfq.quotes.forEach(quote => {
                if (quote.purchaserId === user.id) {
                    quotes.push(quote);
                }
            });
        });
        return quotes;
    }, [user]);

    const kpis = useMemo(() => {
        const totalAssigned = myAssignedRfqs.length;
        const totalQuoted = myQuotes.length;
        
        let totalQuoteValue = 0;
        myQuotes.forEach(q => totalQuoteValue += q.price);
        const avgQuoteValue = totalQuoted > 0 ? (totalQuoteValue / totalQuoted) : 0;
        
        return {
            totalAssigned,
            totalQuoted,
            avgQuoteValue: avgQuoteValue.toFixed(2),
        };
    }, [myAssignedRfqs, myQuotes]);
    
    const quoteStatusData = useMemo(() => {
         const quotedRfqIds = new Set(myQuotes.map(q => q.rfqId));
         const quotedCount = quotedRfqIds.size;
         const pendingCount = myAssignedRfqs.filter(r => r.status !== 'Quotation Completed' && r.status !== 'Archived' && !quotedRfqIds.has(r.id)).length;
         
         return [
            { name: t('purchasing_stats_quoted'), value: quotedCount },
            { name: t('purchasing_stats_pending'), value: pendingCount },
         ]

    }, [myAssignedRfqs, myQuotes, t]);
    
     const monthlyQuoteData = useMemo(() => {
         const monthCounts = myQuotes.reduce((acc, quote) => {
            const month = new Date(quote.quoteTime).toLocaleString('default', { month: 'short' });
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        return allMonths.map(month => ({
            month,
            total: monthCounts[month] || 0
        }));

    }, [myQuotes]);


    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('purchasing_statistics_title')}</h1>
                <p className="text-muted-foreground">An overview of your quoting activities.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('purchasing_stats_assigned_rfqs')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{kpis.totalAssigned}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('purchasing_stats_completed_quotes')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{kpis.totalQuoted}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('purchasing_stats_avg_quote_value')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">${kpis.avgQuoteValue}</div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Quote Status Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-[300px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={quoteStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                         {quoteStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Monthly Quote Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <ChartContainer config={{}} className="h-[300px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyQuoteData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Bar dataKey="total" fill="var(--color-primary)" radius={8} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
