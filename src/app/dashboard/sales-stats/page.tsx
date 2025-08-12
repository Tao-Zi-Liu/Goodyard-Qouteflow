
"use client"
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/use-auth';
import { MOCK_RFQS } from '@/lib/data';
import { RFQStatus } from '@/lib/types';
import { useI18n } from '@/hooks/use-i18n';

const CHART_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function SalesStatsPage() {
    const { user } = useAuth();
    const { t } = useI18n();

    const myRfqs = useMemo(() => {
        if (!user) return [];
        return MOCK_RFQS.filter(rfq => rfq.creatorId === user.id);
    }, [user]);

    const kpis = useMemo(() => {
        const totalRfqs = myRfqs.length;
        const completedRfqs = myRfqs.filter(r => r.status === 'Quotation Completed').length;
        const completionRate = totalRfqs > 0 ? (completedRfqs / totalRfqs * 100).toFixed(1) : '0.0';
        return { totalRfqs, completedRfqs, completionRate };
    }, [myRfqs]);

    const rfqStatusData = useMemo(() => {
        const statusCounts = myRfqs.reduce((acc, rfq) => {
            acc[rfq.status] = (acc[rfq.status] || 0) + 1;
            return acc;
        }, {} as Record<RFQStatus, number>);

        return Object.entries(statusCounts).map(([name, value]) => ({
            name: t(`status_${name.toLowerCase().replace(/ /g, '_')}`),
            value
        }));
    }, [myRfqs, t]);
    
    const monthlyRfqData = useMemo(() => {
         const monthCounts = myRfqs.reduce((acc, rfq) => {
            const month = new Date(rfq.inquiryTime).toLocaleString('default', { month: 'short' });
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        return allMonths.map(month => ({
            month,
            total: monthCounts[month] || 0
        }));

    }, [myRfqs]);


    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('sales_statistics_title')}</h1>
                <p className="text-muted-foreground">An overview of your RFQ activities.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Total RFQs Created</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{kpis.totalRfqs}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Completed RFQs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{kpis.completedRfqs}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Completion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{kpis.completionRate}%</div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>RFQ Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-[300px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={rfqStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                         {rfqStatusData.map((entry, index) => (
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
                        <CardTitle>Monthly RFQ Volume</CardTitle>
                        <CardDescription>Total RFQs created per month this year</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <ChartContainer config={{}} className="h-[300px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyRfqData}>
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

