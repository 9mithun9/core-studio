import { Request, Response } from 'express';
import { Teacher, Booking, Package, PaymentReport, Bonus, Expense } from '@/models';
import { AppError, asyncHandler } from '@/middlewares';
import { BookingStatus } from '@/types';
import { logger } from '@/config/logger';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

// Payment rates configuration
const PAYMENT_RATES = {
  freelance: {
    private: { base: 400, rate: 1 }, // Solo: 400 per session
    duo: { base: 600, rate: 1 },     // Duo: 600 per session
    group: { base: 840, rate: 1 },   // Trio/Group: 840 per session
    baseSalary: 0,
  },
  studio: {
    private: { base: 800, rate: 0 },
    duo: { base: 500, rate: 0 },
    group: { base: 300, rate: 0 },
    baseSalary: 35000,
  },
};

// Helper to determine session type from package name
function getSessionType(packageName: string): 'private' | 'duo' | 'group' {
  const lowerName = packageName.toLowerCase();
  if (lowerName.includes('private') || lowerName.includes('1-on-1')) return 'private';
  if (lowerName.includes('duo') || lowerName.includes('duet')) return 'duo';
  return 'group';
}

// Helper to get date range based on report type
function getDateRange(year: number, month: number, reportType: string) {
  switch (reportType) {
    case 'monthly':
      return {
        startDate: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
      };
    case 'quarterly':
      const quarterStartMonth = Math.floor((month - 1) / 3) * 3;
      return {
        startDate: new Date(Date.UTC(year, quarterStartMonth, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(year, quarterStartMonth + 3, 0, 23, 59, 59, 999)),
      };
    case 'half-yearly':
      // First half: Jan-Jun, Second half: Jul-Dec
      if (month <= 6) {
        return {
          startDate: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)), // Jan 1
          endDate: new Date(Date.UTC(year, 6, 0, 23, 59, 59, 999)), // Jun 30
        };
      } else {
        return {
          startDate: new Date(Date.UTC(year, 6, 1, 0, 0, 0, 0)), // Jul 1
          endDate: new Date(Date.UTC(year, 12, 0, 23, 59, 59, 999)), // Dec 31
        };
      }
    case 'yearly':
      return {
        startDate: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(year, 12, 0, 23, 59, 59, 999)),
      };
    default:
      return {
        startDate: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
      };
  }
}

// Generate payment report
export const generatePaymentReport = asyncHandler(async (req: Request, res: Response) => {
  const { year, month, reportType = 'monthly' } = req.query;

  if (!year || !month) {
    throw new AppError('Year and month are required', 400);
  }

  const yearNum = Number(year);
  const monthNum = Number(month);

  if (monthNum < 1 || monthNum > 12) {
    throw new AppError('Invalid month. Must be between 1 and 12', 400);
  }

  const { startDate, endDate } = getDateRange(yearNum, monthNum, reportType as string);

  // Get all teachers
  const teachers = await Teacher.find()
    .populate('userId', 'name email')
    .lean();

  // Get all completed bookings in the date range
  const completedBookings = await Booking.find({
    status: BookingStatus.COMPLETED,
    startTime: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .populate('packageId', 'name price type')
    .populate('teacherId')
    .lean();

  // Calculate total revenue from packages sold (using createdAt as purchase date)
  const packagesSold = await Package.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .populate('customerId', 'userId')
    .populate({
      path: 'customerId',
      populate: {
        path: 'userId',
        select: 'name email',
      },
    })
    .lean();

  const totalRevenue = packagesSold.reduce((sum, pkg) => sum + (pkg.price || 0), 0);

  // Format packages sold data for report
  const packagesSoldData = packagesSold.map((pkg: any) => ({
    packageId: pkg._id,
    customerId: pkg.customerId?._id,
    customerName: pkg.customerId?.userId?.name || 'Unknown',
    packageName: pkg.name,
    packageType: pkg.type,
    totalSessions: pkg.totalSessions,
    price: pkg.price,
    purchaseDate: pkg.createdAt, // Use createdAt as the purchase date (matches finance page)
  }));

  // Calculate payment for each teacher
  const allTeacherPayments = await Promise.all(
    teachers.map(async (teacher: any) => {
      const teacherType: 'freelance' | 'studio' = teacher.teacherType || 'freelance';
      const rates = PAYMENT_RATES[teacherType];

      // Get teacher's completed sessions
      const teacherSessions = completedBookings.filter(
        (booking: any) => booking.teacherId?._id.toString() === teacher._id.toString()
      );

      // Count sessions by type
      const sessionCounts = {
        private: 0,
        duo: 0,
        group: 0,
      };

      teacherSessions.forEach((session: any) => {
        const rawType = session.packageId?.type || 'group';
        if (rawType === 'private') {
          sessionCounts.private++;
        } else if (rawType === 'duo') {
          sessionCounts.duo++;
        } else if (rawType === 'group') {
          sessionCounts.group++;
        }
      });

      // Calculate commissions
      const privateCommission = sessionCounts.private * (rates.private.base * rates.private.rate);
      const duoCommission = sessionCounts.duo * (rates.duo.base * rates.duo.rate);
      const groupCommission = sessionCounts.group * (rates.group.base * rates.group.rate);

      const totalCommission = privateCommission + duoCommission + groupCommission;
      const baseSalary = rates.baseSalary;
      const totalSessions = sessionCounts.private + sessionCounts.duo + sessionCounts.group;

      // Get bonuses for this teacher in the report period
      const teacherBonuses = await Bonus.find({
        teacherId: teacher._id,
        month: monthNum,
        year: yearNum,
        status: { $in: ['approved', 'paid'] }, // Only include approved or paid bonuses
      }).lean();

      const bonuses = teacherBonuses.map((bonus: any) => ({
        bonusId: bonus._id,
        amount: bonus.amount,
        reason: bonus.reason,
        type: bonus.type,
      }));

      const totalBonuses = teacherBonuses.reduce((sum, bonus: any) => sum + bonus.amount, 0);
      const totalPayment = totalCommission + baseSalary + totalBonuses;

      return {
        teacherId: teacher._id,
        teacherName: teacher.userId?.name || 'Unknown',
        teacherType,
        sessions: {
          private: {
            count: sessionCounts.private,
            commission: privateCommission,
          },
          duo: {
            count: sessionCounts.duo,
            commission: duoCommission,
          },
          group: {
            count: sessionCounts.group,
            commission: groupCommission,
          },
        },
        totalSessions,
        totalCommission,
        baseSalary,
        bonuses,
        totalBonuses,
        totalPayment,
      };
    })
  );

  // Filter out freelance teachers with 0 sessions (keep studio teachers as they have base salary)
  const teacherPayments = allTeacherPayments.filter(
    (payment) => payment.totalSessions > 0 || payment.teacherType === 'studio'
  );

  // Get existing expenses for this report period
  const totalTeacherPayments = teacherPayments.reduce((sum, p) => sum + p.totalPayment, 0);

  // Check if a report already exists for this period
  const existingReport = await PaymentReport.findOne({
    month: monthNum,
    year: yearNum,
    reportType,
  });

  // Preserve existing expenses if report exists
  const existingExpenses = existingReport?.expenses || [];
  const totalExpenses = existingExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalCosts = totalTeacherPayments + totalExpenses;
  const profitLoss = totalRevenue - totalCosts;

  let report;
  if (existingReport) {
    // Update existing report
    existingReport.startDate = startDate;
    existingReport.endDate = endDate;
    existingReport.totalRevenue = totalRevenue;
    existingReport.teacherPayments = teacherPayments;
    existingReport.totalTeacherPayments = totalTeacherPayments;
    existingReport.totalCosts = totalCosts;
    existingReport.profitLoss = profitLoss;
    existingReport.packagesSold = packagesSoldData;
    existingReport.totalPackagesSold = packagesSoldData.length;
    report = await existingReport.save();
  } else {
    // Create new report with calculations
    report = await PaymentReport.create({
      month: monthNum,
      year: yearNum,
      reportType,
      startDate,
      endDate,
      totalRevenue,
      teacherPayments,
      expenses: [], // Will be populated when admin adds expenses
      totalExpenses: 0,
      totalTeacherPayments,
      totalCosts: totalTeacherPayments, // Initially just teacher payments
      profitLoss: totalRevenue - totalTeacherPayments,
      packagesSold: packagesSoldData,
      totalPackagesSold: packagesSoldData.length,
      generatedBy: 'manual',
    });
  }

  logger.info(`Payment report generated for ${reportType} - ${year}/${month}`);

  res.json({
    report,
    message: 'Payment report generated successfully',
  });
});

// Get all payment reports with filters
export const getPaymentReports = asyncHandler(async (req: Request, res: Response) => {
  const { year, month, reportType, limit = 50, offset = 0 } = req.query;

  const query: any = {};

  if (year) {
    query.year = Number(year);
  }

  if (month) {
    query.month = Number(month);
  }

  if (reportType) {
    query.reportType = reportType;
  }

  const reports = await PaymentReport.find(query)
    .sort({ generatedAt: -1 })
    .limit(Number(limit))
    .skip(Number(offset))
    .lean();

  const total = await PaymentReport.countDocuments(query);

  res.json({
    reports,
    pagination: {
      total,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: total > Number(offset) + Number(limit),
    },
  });
});

// Get single payment report by ID
export const getPaymentReportById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const report = await PaymentReport.findById(id).lean();

  if (!report) {
    throw new AppError('Payment report not found', 404);
  }

  res.json({ report });
});

// Delete payment report
export const deletePaymentReport = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const report = await PaymentReport.findByIdAndDelete(id);

  if (!report) {
    throw new AppError('Payment report not found', 404);
  }

  logger.info(`Payment report ${id} deleted`);

  res.json({ message: 'Payment report deleted successfully' });
});

// Export payment report as PDF
export const exportReportAsPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const report = await PaymentReport.findById(id).lean();

    if (!report) {
      res.status(404).json({ error: 'Payment report not found' });
      return;
    }

    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=financial-report-${report.year}-${report.month}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Helper function to format currency
    const formatCurrency = (amount: number) => `THB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Add logo if it exists
    const logoPath = path.join(process.cwd(), '..', 'web', 'public', 'logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 50, { width: 80, height: 80 });
      } catch (error) {
        logger.warn('Failed to add logo to PDF:', error);
      }
    }

    // Header with company info (adjusted for logo)
    doc.fontSize(24).font('Helvetica-Bold').text('CORE STUDIO PILATES', 150, 65, { align: 'left' });
    doc.fontSize(10).font('Helvetica').text('Financial Report', 150, 95, { align: 'left' });
    doc.moveDown(2);

    // Divider line
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Report Information
    doc.fontSize(18).font('Helvetica-Bold').text('Monthly Financial Statement', { align: 'left' });
    doc.moveDown(0.5);

    const infoY = doc.y;
    doc.fontSize(10).font('Helvetica');
    doc.text(`Report Period:`, 50, infoY);
    doc.text(`${new Date(report.startDate).toLocaleDateString('en-GB')} - ${new Date(report.endDate).toLocaleDateString('en-GB')}`, 150, infoY);

    doc.text(`Report Type:`, 50, infoY + 15);
    doc.text(report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1), 150, infoY + 15);

    doc.text(`Month/Year:`, 50, infoY + 30);
    doc.text(`${report.month}/${report.year}`, 150, infoY + 30);

    doc.text(`Generated On:`, 50, infoY + 45);
    doc.text(new Date(report.generatedAt).toLocaleString('en-GB'), 150, infoY + 45);

    doc.moveDown(4);

    // Financial Summary Section
    doc.fontSize(14).font('Helvetica-Bold').text('FINANCIAL SUMMARY');
    doc.moveDown(0.5);

    const summaryTableTop = doc.y;
    const col1 = 50;
    const col2 = 350;

    // Summary box
    doc.rect(col1, summaryTableTop, 495, 120).fillAndStroke('#f8f9fa', '#dee2e6');

    doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold');
    const summaryY = summaryTableTop + 15;

    doc.text('Total Revenue:', col1 + 20, summaryY);
    doc.font('Helvetica').fillColor('#16a34a').text(formatCurrency(report.totalRevenue), col2, summaryY);

    doc.fillColor('#000000').font('Helvetica-Bold').text('Teacher Payments:', col1 + 20, summaryY + 20);
    doc.font('Helvetica').fillColor('#ea580c').text(formatCurrency(report.totalTeacherPayments || 0), col2, summaryY + 20);

    doc.fillColor('#000000').font('Helvetica-Bold').text('Other Expenses:', col1 + 20, summaryY + 40);
    doc.font('Helvetica').fillColor('#ea580c').text(formatCurrency(report.totalExpenses || 0), col2, summaryY + 40);

    doc.fillColor('#000000').font('Helvetica-Bold').text('Total Costs:', col1 + 20, summaryY + 60);
    doc.font('Helvetica').fillColor('#dc2626').text(formatCurrency(report.totalCosts || 0), col2, summaryY + 60);

    const profitLoss = report.profitLoss || 0;
    doc.fillColor('#000000').font('Helvetica-Bold').text('Profit / Loss:', col1 + 20, summaryY + 80);
    doc.font('Helvetica-Bold').fillColor(profitLoss >= 0 ? '#16a34a' : '#dc2626')
      .text(formatCurrency(profitLoss), col2, summaryY + 80);

    doc.y = summaryTableTop + 135;
    doc.fillColor('#000000');

    // Packages Sold Section
    logger.info(`Packages sold count: ${report.packagesSold?.length || 0}`);

    doc.fontSize(14).font('Helvetica-Bold').text('PACKAGES SOLD');
    doc.moveDown(0.3);

    if (report.packagesSold && report.packagesSold.length > 0) {

      const packageTableTop = doc.y;
      const pkgRowHeight = 20;

      // Package table header
      doc.font('Helvetica-Bold').fontSize(9);
      doc.rect(50, packageTableTop, 495, pkgRowHeight).fillAndStroke('#4b5563', '#374151');
      doc.fillColor('#ffffff');
      doc.text('Customer', 60, packageTableTop + 6);
      doc.text('Package', 180, packageTableTop + 6);
      doc.text('Type', 320, packageTableTop + 6);
      doc.text('Sessions', 390, packageTableTop + 6);
      doc.text('Price', 470, packageTableTop + 6);

      doc.fillColor('#000000');
      let pkgY = packageTableTop + pkgRowHeight;

      report.packagesSold.forEach((pkg: any, index: number) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(50, pkgY, 495, pkgRowHeight).fillAndStroke(bgColor, '#e5e7eb');

        doc.font('Helvetica').fontSize(8).fillColor('#000000');
        doc.text(pkg.customerName.substring(0, 20), 60, pkgY + 6);
        doc.text(pkg.packageName.substring(0, 22), 180, pkgY + 6);
        doc.text(pkg.packageType.substring(0, 12), 320, pkgY + 6);
        doc.text(pkg.totalSessions.toString(), 410, pkgY + 6);
        doc.text(formatCurrency(pkg.price), 450, pkgY + 6, { width: 90, align: 'right' });

        pkgY += pkgRowHeight;
      });

      // Package table footer
      doc.font('Helvetica-Bold').fontSize(9);
      doc.rect(50, pkgY, 495, pkgRowHeight).fillAndStroke('#e5e7eb', '#d1d5db');
      doc.fillColor('#000000');
      doc.text('TOTAL PACKAGES', 60, pkgY + 6);
      doc.text(report.packagesSold.length.toString(), 410, pkgY + 6);
      doc.fillColor('#16a34a').text(formatCurrency(report.totalRevenue), 450, pkgY + 6, { width: 90, align: 'right' });

      doc.fillColor('#000000');
      doc.y = pkgY + 30;
    } else {
      // No packages sold
      doc.fontSize(10).font('Helvetica').fillColor('#6b7280');
      doc.text('No packages sold in this period. Please regenerate the report to update.', 50, doc.y);
      doc.moveDown(2);
      doc.fillColor('#000000');
    }

    // Teacher Payments Table
    doc.fontSize(14).font('Helvetica-Bold').text('TEACHER PAYMENTS');
    doc.moveDown(0.3);

    // Table header
    const tableTop = doc.y;
    const rowHeight = 20;

    doc.font('Helvetica-Bold').fontSize(9);
    doc.rect(50, tableTop, 495, rowHeight).fillAndStroke('#4b5563', '#374151');
    doc.fillColor('#ffffff');
    doc.text('Teacher', 60, tableTop + 6);
    doc.text('Type', 180, tableTop + 6);
    doc.text('Sessions', 240, tableTop + 6);
    doc.text('Commission', 300, tableTop + 6);
    doc.text('Salary', 380, tableTop + 6);
    doc.text('Bonus', 440, tableTop + 6);
    doc.text('Total', 490, tableTop + 6);

    doc.fillColor('#000000');
    let currentY = tableTop + rowHeight;

    // Table rows
    report.teacherPayments.forEach((payment, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
      doc.rect(50, currentY, 495, rowHeight).fillAndStroke(bgColor, '#e5e7eb');

      doc.font('Helvetica').fontSize(8).fillColor('#000000');
      doc.text(payment.teacherName.substring(0, 18), 60, currentY + 6);
      doc.text(payment.teacherType === 'freelance' ? 'Freelance' : 'Studio', 180, currentY + 6);
      doc.text(payment.totalSessions.toString(), 250, currentY + 6);
      doc.text(formatCurrency(payment.totalCommission).substring(0, 12), 295, currentY + 6, { width: 75 });
      doc.text(formatCurrency(payment.baseSalary).substring(0, 10), 375, currentY + 6, { width: 60 });
      doc.text(formatCurrency(payment.totalBonuses || 0).substring(0, 10), 435, currentY + 6, { width: 50 });
      doc.font('Helvetica-Bold').text(formatCurrency(payment.totalPayment).substring(0, 12), 480, currentY + 6, { width: 60 });

      currentY += rowHeight;
    });

    // Table footer (totals)
    doc.font('Helvetica-Bold').fontSize(9);
    doc.rect(50, currentY, 495, rowHeight).fillAndStroke('#e5e7eb', '#d1d5db');
    doc.fillColor('#000000');
    doc.text('TOTAL', 60, currentY + 6);
    const totalSessions = report.teacherPayments.reduce((sum, p) => sum + p.totalSessions, 0);
    const totalCommission = report.teacherPayments.reduce((sum, p) => sum + p.totalCommission, 0);
    const totalBaseSalary = report.teacherPayments.reduce((sum, p) => sum + p.baseSalary, 0);
    const totalBonuses = report.teacherPayments.reduce((sum, p) => sum + (p.totalBonuses || 0), 0);
    const totalPayment = report.teacherPayments.reduce((sum, p) => sum + p.totalPayment, 0);

    doc.text(totalSessions.toString(), 250, currentY + 6);
    doc.text(formatCurrency(totalCommission).substring(0, 12), 295, currentY + 6, { width: 75 });
    doc.text(formatCurrency(totalBaseSalary).substring(0, 10), 375, currentY + 6, { width: 60 });
    doc.text(formatCurrency(totalBonuses).substring(0, 10), 435, currentY + 6, { width: 50 });
    doc.fillColor('#16a34a').text(formatCurrency(totalPayment).substring(0, 12), 480, currentY + 6, { width: 60 });

    doc.fillColor('#000000');
    doc.y = currentY + 30;

    // Other Expenses Section (if any)
    if (report.expenses && report.expenses.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('OTHER EXPENSES');
      doc.moveDown(0.3);

      const expenseTableTop = doc.y;

      // Expense table header
      doc.font('Helvetica-Bold').fontSize(9);
      doc.rect(50, expenseTableTop, 495, rowHeight).fillAndStroke('#4b5563', '#374151');
      doc.fillColor('#ffffff');
      doc.text('Category', 60, expenseTableTop + 6);
      doc.text('Description', 200, expenseTableTop + 6);
      doc.text('Amount', 470, expenseTableTop + 6);

      doc.fillColor('#000000');
      let expenseY = expenseTableTop + rowHeight;

      report.expenses.forEach((expense, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(50, expenseY, 495, rowHeight).fillAndStroke(bgColor, '#e5e7eb');

        doc.font('Helvetica').fontSize(8).fillColor('#000000');
        doc.text(expense.category.charAt(0).toUpperCase() + expense.category.slice(1), 60, expenseY + 6);
        doc.text(expense.description.substring(0, 40) || '-', 200, expenseY + 6);
        doc.text(formatCurrency(expense.amount), 450, expenseY + 6, { width: 90, align: 'right' });

        expenseY += rowHeight;
      });

      // Expense total
      doc.font('Helvetica-Bold').fontSize(9);
      doc.rect(50, expenseY, 495, rowHeight).fillAndStroke('#e5e7eb', '#d1d5db');
      doc.fillColor('#000000');
      doc.text('TOTAL EXPENSES', 60, expenseY + 6);
      doc.fillColor('#ea580c').text(formatCurrency(report.totalExpenses || 0), 450, expenseY + 6, { width: 90, align: 'right' });

      doc.y = expenseY + 30;
    }

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#6b7280');
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.text(
        `Page ${i + 1} of ${pageCount} | Generated on ${new Date().toLocaleDateString('en-GB')} | Core Studio Pilates`,
        50,
        doc.page.height - 50,
        { align: 'center', width: 495 }
      );
    }

    doc.end();

    logger.info(`Payment report ${id} exported as PDF`);
  } catch (error) {
    logger.error('Error exporting PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export PDF' });
    }
  }
};

// Export payment report as Excel
export const exportReportAsExcel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const report = await PaymentReport.findById(id).lean();

    if (!report) {
      res.status(404).json({ error: 'Payment report not found' });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Financial Report');

    // Set column widths
    worksheet.columns = [
      { width: 25 },
      { width: 15 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];

    // Title
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'CORE STUDIO PILATES - FINANCIAL REPORT';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Report Info
    worksheet.mergeCells('A2:G2');
    const infoCell = worksheet.getCell('A2');
    infoCell.value = `Period: ${new Date(report.startDate).toLocaleDateString('en-GB')} - ${new Date(report.endDate).toLocaleDateString('en-GB')} | Month/Year: ${report.month}/${report.year}`;
    infoCell.font = { size: 10 };
    infoCell.alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    // Financial Summary
    worksheet.addRow(['FINANCIAL SUMMARY']).font = { bold: true, size: 12 };
    worksheet.addRow(['Total Revenue', `THB ${report.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);
    worksheet.addRow(['Teacher Payments', `THB ${(report.totalTeacherPayments || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);
    worksheet.addRow(['Other Expenses', `THB ${(report.totalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);
    worksheet.addRow(['Total Costs', `THB ${(report.totalCosts || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);
    worksheet.addRow(['Profit / Loss', `THB ${(report.profitLoss || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);

    worksheet.addRow([]);

    // Packages Sold Section
    if (report.packagesSold && report.packagesSold.length > 0) {
      worksheet.addRow(['PACKAGES SOLD']).font = { bold: true, size: 12 };

      const pkgHeaderRow = worksheet.addRow([
        'Customer Name',
        'Package Name',
        'Type',
        'Sessions',
        '',
        '',
        'Price',
      ]);
      pkgHeaderRow.font = { bold: true };
      pkgHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4b5563' },
      };
      pkgHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

      report.packagesSold.forEach((pkg: any) => {
        worksheet.addRow([
          pkg.customerName,
          pkg.packageName,
          pkg.packageType,
          pkg.totalSessions,
          '',
          '',
          `THB ${pkg.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        ]);
      });

      const pkgTotalsRow = worksheet.addRow([
        'TOTAL PACKAGES',
        '',
        '',
        report.packagesSold.length,
        '',
        '',
        `THB ${report.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      ]);
      pkgTotalsRow.font = { bold: true };
      pkgTotalsRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFe5e7eb' },
      };

      worksheet.addRow([]);
    }

    // Teacher Payments Header
    worksheet.addRow(['TEACHER PAYMENTS']).font = { bold: true, size: 12 };

    const headerRow = worksheet.addRow([
      'Teacher Name',
      'Type',
      'Sessions',
      'Commission',
      'Base Salary',
      'Bonuses',
      'Total Payment',
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4b5563' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Teacher Payments Data
    report.teacherPayments.forEach((payment) => {
      worksheet.addRow([
        payment.teacherName,
        payment.teacherType === 'freelance' ? 'Freelance' : 'Studio',
        payment.totalSessions,
        `THB ${payment.totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        `THB ${payment.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        `THB ${(payment.totalBonuses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        `THB ${payment.totalPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      ]);
    });

    // Totals row
    const totalSessions = report.teacherPayments.reduce((sum, p) => sum + p.totalSessions, 0);
    const totalCommission = report.teacherPayments.reduce((sum, p) => sum + p.totalCommission, 0);
    const totalBaseSalary = report.teacherPayments.reduce((sum, p) => sum + p.baseSalary, 0);
    const totalBonusesSum = report.teacherPayments.reduce((sum, p) => sum + (p.totalBonuses || 0), 0);
    const totalPaymentSum = report.teacherPayments.reduce((sum, p) => sum + p.totalPayment, 0);

    const totalsRow = worksheet.addRow([
      'TOTAL',
      '',
      totalSessions,
      `THB ${totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `THB ${totalBaseSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `THB ${totalBonusesSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `THB ${totalPaymentSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    ]);
    totalsRow.font = { bold: true };
    totalsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFe5e7eb' },
    };

    // Other Expenses (if any)
    if (report.expenses && report.expenses.length > 0) {
      worksheet.addRow([]);
      worksheet.addRow(['OTHER EXPENSES']).font = { bold: true, size: 12 };

      const expenseHeaderRow = worksheet.addRow(['Category', 'Description', '', '', '', '', 'Amount']);
      expenseHeaderRow.font = { bold: true };
      expenseHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4b5563' },
      };
      expenseHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

      report.expenses.forEach((expense) => {
        worksheet.addRow([
          expense.category.charAt(0).toUpperCase() + expense.category.slice(1),
          expense.description || '-',
          '',
          '',
          '',
          '',
          `THB ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        ]);
      });

      const expenseTotalRow = worksheet.addRow([
        'TOTAL EXPENSES',
        '',
        '',
        '',
        '',
        '',
        `THB ${(report.totalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      ]);
      expenseTotalRow.font = { bold: true };
      expenseTotalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFe5e7eb' },
      };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=financial-report-${report.year}-${report.month}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

    logger.info(`Payment report ${id} exported as Excel`);
  } catch (error) {
    logger.error('Error exporting Excel:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export Excel' });
    }
  }
};

// =====================================================
// Expense Management
// =====================================================

// Add expense to a report
export const addExpense = asyncHandler(async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const { category, amount, description } = req.body;

  if (!category || !amount) {
    throw new AppError('Category and amount are required', 400);
  }

  const report = await PaymentReport.findById(reportId);
  if (!report) {
    throw new AppError('Payment report not found', 404);
  }

  // Create expense
  const expense = await Expense.create({
    reportId,
    month: report.month,
    year: report.year,
    category,
    amount,
    description,
    createdBy: req.user!._id,
  });

  // Add expense to report and recalculate
  report.expenses.push({
    expenseId: expense._id,
    category,
    amount,
    description,
  });

  // Recalculate totals
  report.totalExpenses = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  report.totalCosts = report.totalTeacherPayments + report.totalExpenses;
  report.profitLoss = report.totalRevenue - report.totalCosts;

  await report.save();

  logger.info(`Expense added to report ${reportId} by ${req.user!._id}`);

  res.json({
    expense,
    report,
    message: 'Expense added successfully',
  });
});

// Update expense
export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { category, amount, description } = req.body;

  const expense = await Expense.findById(id);
  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  const oldAmount = expense.amount;

  // Update expense
  if (category) expense.category = category;
  if (amount !== undefined) expense.amount = amount;
  if (description) expense.description = description;

  await expense.save();

  // Update report
  const report = await PaymentReport.findById(expense.reportId);
  if (report) {
    const expenseIndex = report.expenses.findIndex(
      (exp) => exp.expenseId.toString() === id
    );

    if (expenseIndex !== -1) {
      report.expenses[expenseIndex] = {
        expenseId: expense._id,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
      };

      // Recalculate totals
      report.totalExpenses = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      report.totalCosts = report.totalTeacherPayments + report.totalExpenses;
      report.profitLoss = report.totalRevenue - report.totalCosts;

      await report.save();
    }
  }

  logger.info(`Expense ${id} updated`);

  res.json({
    expense,
    report,
    message: 'Expense updated successfully',
  });
});

// Delete expense
export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const expense = await Expense.findById(id);
  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  const reportId = expense.reportId;

  // Delete expense
  await Expense.findByIdAndDelete(id);

  // Update report
  const report = await PaymentReport.findById(reportId);
  if (report) {
    report.expenses = report.expenses.filter(
      (exp) => exp.expenseId.toString() !== id
    );

    // Recalculate totals
    report.totalExpenses = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    report.totalCosts = report.totalTeacherPayments + report.totalExpenses;
    report.profitLoss = report.totalRevenue - report.totalCosts;

    await report.save();
  }

  logger.info(`Expense ${id} deleted`);

  res.json({
    message: 'Expense deleted successfully',
    report,
  });
});

// Get expenses for a report
export const getReportExpenses = asyncHandler(async (req: Request, res: Response) => {
  const { reportId } = req.params;

  const expenses = await Expense.find({ reportId })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ expenses });
});
