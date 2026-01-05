'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import toast, { Toaster } from 'react-hot-toast';
import { PlusIcon, XMarkIcon, ArrowDownTrayIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/outline';

interface TeacherPayment {
  teacherId: string;
  teacherName: string;
  teacherType: 'freelance' | 'studio';
  sessions: {
    private: { count: number; commission: number };
    duo: { count: number; commission: number };
    group: { count: number; commission: number };
  };
  totalSessions: number;
  totalCommission: number;
  baseSalary: number;
  bonuses?: Array<{
    bonusId: string;
    amount: number;
    reason: string;
    type: 'one-time' | 'recurring';
  }>;
  totalBonuses?: number;
  totalPayment: number;
}

interface Expense {
  expenseId: string;
  category: 'rent' | 'instruments' | 'electricity' | 'water' | 'others';
  amount: number;
  description: string;
}

interface PackageSold {
  packageId: string;
  customerId: string;
  customerName: string;
  packageName: string;
  packageType: string;
  totalSessions: number;
  price: number;
  purchaseDate: string;
}

interface PaymentReport {
  _id: string;
  month: number;
  year: number;
  reportType: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  startDate: string;
  endDate: string;
  totalRevenue: number;
  teacherPayments: TeacherPayment[];
  expenses?: Expense[];
  totalExpenses?: number;
  totalTeacherPayments?: number;
  totalCosts?: number;
  profitLoss?: number;
  packagesSold?: PackageSold[];
  totalPackagesSold?: number;
  generatedAt: string;
  generatedBy: 'auto' | 'manual';
}

export default function AdminReportsPage() {
  const { t } = useTranslation('admin');
  const [reports, setReports] = useState<PaymentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<PaymentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportType, setReportType] = useState<string>('monthly');

  // Bonus modal state
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<{ id: string; name: string } | null>(null);
  const [bonusFormData, setBonusFormData] = useState({
    amount: '',
    reason: '',
    type: 'one-time' as 'one-time' | 'recurring',
    notes: '',
  });

  // Expense modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    category: 'rent' as 'rent' | 'instruments' | 'electricity' | 'water' | 'others',
    amount: '',
    description: '',
  });

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: t('reports.months.jan') },
    { value: 2, label: t('reports.months.feb') },
    { value: 3, label: t('reports.months.mar') },
    { value: 4, label: t('reports.months.apr') },
    { value: 5, label: t('reports.months.may') },
    { value: 6, label: t('reports.months.jun') },
    { value: 7, label: t('reports.months.jul') },
    { value: 8, label: t('reports.months.aug') },
    { value: 9, label: t('reports.months.sep') },
    { value: 10, label: t('reports.months.oct') },
    { value: 11, label: t('reports.months.nov') },
    { value: 12, label: t('reports.months.dec') },
  ];

  useEffect(() => {
    fetchReports();
  }, [selectedYear, selectedMonth, reportType]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data: any = await apiClient.get('/admin/reports', {
        params: {
          year: selectedYear,
          month: selectedMonth,
          reportType,
          limit: 10,
        },
      });
      setReports(data.reports || []);
      if (data.reports && data.reports.length > 0) {
        setSelectedReport(data.reports[0]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error(t('reports.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    const loadingToast = toast.loading(t('reports.generating'));

    try {
      await apiClient.post('/admin/reports/generate', {}, {
        params: {
          year: selectedYear,
          month: selectedMonth,
          reportType,
        },
      });

      toast.success(t('reports.generateSuccess'), { id: loadingToast });
      fetchReports();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || t('reports.generateError'),
        { id: loadingToast }
      );
    } finally {
      setGenerating(false);
    }
  };

  const openBonusModal = (teacherId: string, teacherName: string) => {
    setSelectedTeacher({ id: teacherId, name: teacherName });
    setBonusFormData({
      amount: '',
      reason: '',
      type: 'one-time',
      notes: '',
    });
    setShowBonusModal(true);
  };

  const closeBonusModal = () => {
    setShowBonusModal(false);
    setSelectedTeacher(null);
    setBonusFormData({
      amount: '',
      reason: '',
      type: 'one-time',
      notes: '',
    });
  };

  const handleBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeacher || !bonusFormData.amount || !bonusFormData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = toast.loading('Creating bonus...');

    try {
      await apiClient.post('/admin/bonuses', {
        teacherId: selectedTeacher.id,
        amount: parseFloat(bonusFormData.amount),
        reason: bonusFormData.reason,
        type: bonusFormData.type,
        month: selectedMonth,
        year: selectedYear,
        status: 'approved',
        notes: bonusFormData.notes,
      });

      toast.success('Bonus created successfully! Regenerating report...', { id: loadingToast });
      closeBonusModal();

      // Regenerate the report to include the new bonus
      await handleGenerateReport();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create bonus', {
        id: loadingToast,
      });
    }
  };

  const openExpenseModal = () => {
    setExpenseFormData({
      category: 'rent',
      amount: '',
      description: '',
    });
    setShowExpenseModal(true);
  };

  const closeExpenseModal = () => {
    setShowExpenseModal(false);
    setExpenseFormData({
      category: 'rent',
      amount: '',
      description: '',
    });
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReport || !expenseFormData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = toast.loading('Adding expense...');

    try {
      await apiClient.post(`/admin/reports/${selectedReport._id}/expenses`, {
        category: expenseFormData.category,
        amount: parseFloat(expenseFormData.amount),
        description: expenseFormData.description,
      });

      toast.success('Expense added successfully! Regenerating report...', { id: loadingToast });
      closeExpenseModal();

      // Regenerate the report to include the new expense
      await handleGenerateReport();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add expense', {
        id: loadingToast,
      });
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    const loadingToast = toast.loading('Deleting expense...');

    try {
      await apiClient.delete(`/admin/expenses/${expenseId}`);

      toast.success('Expense deleted successfully! Regenerating report...', { id: loadingToast });

      // Regenerate the report to update calculations
      await handleGenerateReport();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete expense', {
        id: loadingToast,
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedReport) return;

    const loadingToast = toast.loading(t('reports.downloadingPDF'));
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        toast.error('Not authenticated', { id: loadingToast });
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/reports/${selectedReport._id}/export/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF download error:', response.status, errorText);
        throw new Error(`Failed to download PDF: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-report-${selectedReport.year}-${selectedReport.month}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('reports.downloadSuccess'), { id: loadingToast });
    } catch (error: any) {
      console.error('Download PDF error:', error);
      toast.error(error.message || t('reports.downloadError'), { id: loadingToast });
    }
  };

  const handleDownloadExcel = async () => {
    if (!selectedReport) return;

    const loadingToast = toast.loading(t('reports.downloadingExcel'));
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        toast.error('Not authenticated', { id: loadingToast });
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/reports/${selectedReport._id}/export/excel`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Excel download error:', response.status, errorText);
        throw new Error(`Failed to download Excel: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-report-${selectedReport.year}-${selectedReport.month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('reports.downloadSuccess'), { id: loadingToast });
    } catch (error: any) {
      console.error('Download Excel error:', error);
      toast.error(error.message || t('reports.downloadError'), { id: loadingToast });
    }
  };

  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-blue-50">
      <Toaster position="top-right" />

      <div className="container mx-auto px-4 py-8">
        {/* Header Section with Gradient */}
        <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white overflow-hidden mb-8 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>

          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('reports.title')}</h1>
            <p className="text-primary-100">Generate and manage financial reports</p>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="text-xl">Report Filters</CardTitle>
            <CardDescription>Select period and type for report generation</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Year Selector */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">{t('reports.year')}</label>
                <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Selector */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">{t('reports.month')}</label>
                <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(Number(val))}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Report Type Selector */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">{t('reports.reportType')}</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t('reports.monthly')}</SelectItem>
                    <SelectItem value="quarterly">{t('reports.quarterly')}</SelectItem>
                    <SelectItem value="half-yearly">{t('reports.halfYearly')}</SelectItem>
                    <SelectItem value="yearly">{t('reports.yearly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <div className="flex items-end md:col-span-2">
                <Button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
                  size="lg"
                >
                  {generating ? t('reports.generating') : t('reports.generate')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Display */}
        {loading ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">{t('reports.loading')}</p>
            </CardContent>
          </Card>
        ) : selectedReport ? (
          <div className="space-y-6">
            {/* Financial Summary - Gradient Card */}
            <div className="relative bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 rounded-2xl p-8 text-white overflow-hidden shadow-2xl">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>

              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{t('reports.summary')}</h2>
                    <p className="text-green-100 text-sm">
                      {formatDate(selectedReport.startDate)} - {formatDate(selectedReport.endDate)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="bg-white text-green-700 hover:bg-green-50 border-0">
                      <DocumentTextIcon className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                    <Button onClick={handleDownloadExcel} variant="outline" size="sm" className="bg-white text-green-700 hover:bg-green-50 border-0">
                      <TableCellsIcon className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                    <p className="text-green-100 text-sm mb-1">Total Revenue</p>
                    <p className="text-2xl md:text-3xl font-bold">
                      {formatCurrency(selectedReport.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                    <p className="text-green-100 text-sm mb-1">Teacher Payments</p>
                    <p className="text-2xl md:text-3xl font-bold text-orange-200">
                      {formatCurrency(
                        selectedReport.totalTeacherPayments ||
                        selectedReport.teacherPayments.reduce((sum, p) => sum + p.totalPayment, 0)
                      )}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                    <p className="text-green-100 text-sm mb-1">Other Expenses</p>
                    <p className="text-2xl md:text-3xl font-bold text-orange-200">
                      {formatCurrency(selectedReport.totalExpenses || 0)}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                    <p className="text-green-100 text-sm mb-1">Total Costs</p>
                    <p className="text-2xl md:text-3xl font-bold text-red-200">
                      {formatCurrency(
                        selectedReport.totalCosts ||
                        (selectedReport.totalTeacherPayments || selectedReport.teacherPayments.reduce((sum, p) => sum + p.totalPayment, 0)) +
                        (selectedReport.totalExpenses || 0)
                      )}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                    <p className="text-green-100 text-sm mb-1">Profit / Loss</p>
                    <p className={`text-2xl md:text-3xl font-bold ${
                      ((selectedReport.profitLoss !== undefined ? selectedReport.profitLoss :
                        selectedReport.totalRevenue -
                        ((selectedReport.totalTeacherPayments || selectedReport.teacherPayments.reduce((sum, p) => sum + p.totalPayment, 0)) +
                        (selectedReport.totalExpenses || 0))
                      )) >= 0 ? 'text-yellow-200' : 'text-red-300'
                    }`}>
                      {formatCurrency(
                        selectedReport.profitLoss !== undefined ? selectedReport.profitLoss :
                        selectedReport.totalRevenue -
                        ((selectedReport.totalTeacherPayments || selectedReport.teacherPayments.reduce((sum, p) => sum + p.totalPayment, 0)) +
                        (selectedReport.totalExpenses || 0))
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Packages Sold Table */}
            {selectedReport.packagesSold && selectedReport.packagesSold.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="text-xl">Packages Sold</CardTitle>
                  <CardDescription>
                    Package sales for this period ({selectedReport.totalPackagesSold || selectedReport.packagesSold.length} packages)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Package</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Sessions</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Price</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedReport.packagesSold.map((pkg, idx) => (
                          <tr key={pkg.packageId} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-4 font-medium text-gray-900">{pkg.customerName}</td>
                            <td className="px-4 py-4 text-gray-700">{pkg.packageName}</td>
                            <td className="px-4 py-4">
                              <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 capitalize">
                                {pkg.packageType}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center font-semibold text-gray-900">{pkg.totalSessions}</td>
                            <td className="px-4 py-4 text-right font-bold text-green-600 text-lg">
                              {formatCurrency(pkg.price)}
                            </td>
                            <td className="px-4 py-4 text-gray-600 text-sm">
                              {new Date(pkg.purchaseDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gradient-to-r from-green-50 to-emerald-50 font-bold border-t-2 border-green-200">
                          <td colSpan={3} className="px-4 py-4 text-right text-gray-700">TOTAL</td>
                          <td className="px-4 py-4 text-center text-gray-900 text-lg">
                            {selectedReport.packagesSold.reduce((sum, p) => sum + p.totalSessions, 0)}
                          </td>
                          <td className="px-4 py-4 text-right text-green-600 text-xl">
                            {formatCurrency(selectedReport.packagesSold.reduce((sum, p) => sum + p.price, 0))}
                          </td>
                          <td className="px-4 py-4 text-gray-600">
                            {selectedReport.packagesSold.length} packages
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Teacher Payments Table */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="text-xl">{t('reports.teacherPayments')}</CardTitle>
                <CardDescription>{t('reports.teacherPaymentsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">{t('reports.teacherName')}</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">{t('reports.type')}</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">{t('reports.private')}</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">{t('reports.duo')}</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">{t('reports.group')}</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">{t('reports.totalSessions')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{t('reports.commission')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{t('reports.baseSalary')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{t('reports.bonuses')}</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">{t('reports.totalPayment')}</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedReport.teacherPayments.map((payment, idx) => (
                        <tr key={payment.teacherId} className={`hover:bg-purple-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3 font-medium text-gray-900">{payment.teacherName}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                              payment.teacherType === 'freelance'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {payment.teacherType === 'freelance' ? t('teachers.freelance') : t('teachers.studio')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="font-semibold text-gray-900">{payment.sessions.private.count}</div>
                            <div className="text-xs text-gray-500">{formatCurrency(payment.sessions.private.commission)}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="font-semibold text-gray-900">{payment.sessions.duo.count}</div>
                            <div className="text-xs text-gray-500">{formatCurrency(payment.sessions.duo.commission)}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="font-semibold text-gray-900">{payment.sessions.group.count}</div>
                            <div className="text-xs text-gray-500">{formatCurrency(payment.sessions.group.commission)}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-gray-900">{payment.totalSessions}</td>
                          <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(payment.totalCommission)}</td>
                          <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(payment.baseSalary)}</td>
                          <td className="px-4 py-3 text-right">
                            {payment.bonuses && payment.bonuses.length > 0 ? (
                              <div className="space-y-1">
                                {payment.bonuses.map((bonus, idx) => (
                                  <div key={idx} className="text-xs">
                                    <span className="text-gray-600">{bonus.reason}:</span> {formatCurrency(bonus.amount)}
                                  </div>
                                ))}
                                <div className="font-medium pt-1 border-t">
                                  {formatCurrency(payment.totalBonuses || 0)}
                                </div>
                              </div>
                            ) : (
                              formatCurrency(0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-green-600 text-lg">
                            {formatCurrency(payment.totalPayment)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => openBonusModal(payment.teacherId, payment.teacherName)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all shadow-sm"
                            >
                              <PlusIcon className="h-3 w-3 mr-1" />
                              Bonus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gradient-to-r from-purple-50 to-pink-50 font-bold border-t-2 border-purple-200">
                        <td colSpan={5} className="px-4 py-3 text-right text-gray-700">{t('reports.total')}</td>
                        <td className="px-4 py-3 text-center text-gray-900 text-lg">
                          {selectedReport.teacherPayments.reduce((sum, p) => sum + p.totalSessions, 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {formatCurrency(selectedReport.teacherPayments.reduce((sum, p) => sum + p.totalCommission, 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {formatCurrency(selectedReport.teacherPayments.reduce((sum, p) => sum + p.baseSalary, 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {formatCurrency(selectedReport.teacherPayments.reduce((sum, p) => sum + (p.totalBonuses || 0), 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 text-xl">
                          {formatCurrency(selectedReport.teacherPayments.reduce((sum, p) => sum + p.totalPayment, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Other Expenses</CardTitle>
                    <CardDescription>Rent, utilities, and other operational expenses</CardDescription>
                  </div>
                  <Button
                    onClick={openExpenseModal}
                    size="sm"
                    className="inline-flex items-center bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Expense
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {selectedReport.expenses && selectedReport.expenses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedReport.expenses.map((expense, idx) => (
                          <tr key={expense.expenseId} className={`hover:bg-orange-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-3 py-1 text-xs rounded-full bg-gray-200 text-gray-700 font-medium capitalize">
                                {expense.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{expense.description}</td>
                            <td className="px-4 py-3 text-right font-bold text-orange-600 text-lg">
                              {formatCurrency(expense.amount)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteExpense(expense.expenseId)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 rounded-lg transition-all shadow-sm"
                              >
                                <XMarkIcon className="h-3 w-3 mr-1" />
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gradient-to-r from-orange-50 to-red-50 font-bold border-t-2 border-orange-200">
                          <td colSpan={2} className="px-4 py-3 text-right text-gray-700">Total Expenses</td>
                          <td className="px-4 py-3 text-right text-orange-600 text-xl">
                            {formatCurrency(selectedReport.totalExpenses || 0)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <p className="text-gray-500 mb-4">No expenses added yet</p>
                    <Button onClick={openExpenseModal} size="sm" variant="outline" className="border-2">
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add First Expense
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">{t('reports.noReports')}</p>
              <Button onClick={handleGenerateReport} className="bg-gradient-to-r from-primary-600 to-primary-700">
                {t('reports.generateFirst')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bonus Modal */}
        {showBonusModal && selectedTeacher && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-2xl">
                <h3 className="text-lg font-bold text-gray-900">
                  Add Bonus for {selectedTeacher.name}
                </h3>
                <button
                  onClick={closeBonusModal}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleBonusSubmit} className="px-6 py-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount * (฿)
                    </label>
                    <input
                      type="number"
                      value={bonusFormData.amount}
                      onChange={(e) =>
                        setBonusFormData({ ...bonusFormData, amount: e.target.value })
                      }
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason *
                    </label>
                    <input
                      type="text"
                      value={bonusFormData.reason}
                      onChange={(e) =>
                        setBonusFormData({ ...bonusFormData, reason: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., Performance bonus, Holiday bonus"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={bonusFormData.type}
                      onChange={(e) =>
                        setBonusFormData({
                          ...bonusFormData,
                          type: e.target.value as 'one-time' | 'recurring',
                        })
                      }
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="one-time">One-Time</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={bonusFormData.notes}
                      onChange={(e) =>
                        setBonusFormData({ ...bonusFormData, notes: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Additional notes..."
                    />
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-sm text-indigo-800">
                      This bonus will be added for <strong>{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</strong> and will automatically appear in the report when regenerated.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={closeBonusModal}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                  >
                    Add Bonus
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Expense Modal */}
        {showExpenseModal && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-orange-50 to-red-50 rounded-t-2xl">
                <h3 className="text-lg font-bold text-gray-900">
                  Add Expense
                </h3>
                <button
                  onClick={closeExpenseModal}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleExpenseSubmit} className="px-6 py-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={expenseFormData.category}
                      onChange={(e) =>
                        setExpenseFormData({
                          ...expenseFormData,
                          category: e.target.value as 'rent' | 'instruments' | 'electricity' | 'water' | 'others',
                        })
                      }
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="rent">Rent</option>
                      <option value="instruments">Instruments</option>
                      <option value="electricity">Electricity</option>
                      <option value="water">Water</option>
                      <option value="others">Others</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount * (฿)
                    </label>
                    <input
                      type="number"
                      value={expenseFormData.amount}
                      onChange={(e) =>
                        setExpenseFormData({ ...expenseFormData, amount: e.target.value })
                      }
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={expenseFormData.description}
                      onChange={(e) =>
                        setExpenseFormData({ ...expenseFormData, description: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="e.g., Monthly studio rent, New reformer machine, January utility bill"
                    />
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800">
                      This expense will be added to the report for <strong>{months.find(m => m.value === selectedMonth)?.label} {selectedYear}</strong> and will be included in the profit/loss calculation.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={closeExpenseModal}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg text-sm font-medium hover:from-orange-700 hover:to-red-700 transition-all shadow-lg"
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
