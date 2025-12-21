'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MarketingPerformance {
  acquisitionByChannel: Array<{ channel: string; customers: number }>;
  funnelData: Array<{ stage: string; count: number }>;
  cpa: number;
  ltv: number;
  roi: number;
}

export default function MarketingPage() {
  const { t } = useTranslation('admin');
  const [marketingPerf, setMarketingPerf] = useState<MarketingPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const marketingData: any = await apiClient.get('/admin/analytics/marketing-performance');
      setMarketingPerf(marketingData);
    } catch (error) {
      console.error('Failed to fetch marketing analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">{t('marketing.loadingAnalytics')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('marketing.title')}</h1>

      {marketingPerf && (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('marketing.marketingPerformance')}</h2>
            <p className="text-gray-600 mt-1">{t('marketing.effectivenessMetrics')}</p>
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                {t('marketing.placeholderNote')}
              </p>
            </div>
          </div>

          {/* Marketing KPIs */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <CardHeader>
                <CardTitle className="text-indigo-900">{t('marketing.costPerAcquisition')}</CardTitle>
                <CardDescription>{t('marketing.avgCostToAcquire')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-indigo-900">฿{marketingPerf.cpa.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardHeader>
                <CardTitle className="text-emerald-900">{t('marketing.customerLifetimeValue')}</CardTitle>
                <CardDescription>{t('marketing.avgLTV')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-emerald-900">฿{marketingPerf.ltv.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-900">{t('marketing.returnOnInvestment')}</CardTitle>
                <CardDescription>{t('marketing.marketingROI')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-yellow-900">{marketingPerf.roi.toFixed(2)}x</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Acquisition by Channel */}
            <Card>
              <CardHeader>
                <CardTitle>{t('marketing.acquisitionByChannel')}</CardTitle>
                <CardDescription>{t('marketing.whereCustomersComeFrom')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={marketingPerf.acquisitionByChannel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="customers" fill="#8b5cf6" name={t('marketing.customers')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>{t('marketing.conversionFunnel')}</CardTitle>
                <CardDescription>{t('marketing.customerJourney')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {marketingPerf.funnelData.map((stage, index) => {
                    const maxCount = Math.max(...marketingPerf.funnelData.map(s => s.count));
                    const percentage = (stage.count / maxCount) * 100;
                    const conversionRate = index > 0
                      ? ((stage.count / marketingPerf.funnelData[index - 1].count) * 100).toFixed(1)
                      : '100.0';

                    return (
                      <div key={index} className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                          <span className="text-sm text-gray-600">{stage.count} ({conversionRate}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-8">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${percentage}%` }}
                          >
                            {percentage.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
