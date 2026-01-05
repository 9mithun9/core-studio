import mongoose from 'mongoose';
import { Package, PaymentReport } from '../src/models';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function getDateRange(year: number, month: number, reportType: string) {
  switch (reportType) {
    case 'monthly':
      return {
        startDate: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
      };
    default:
      return {
        startDate: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
      };
  }
}

async function debugNovember() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB\n');

    const year = 2025;
    const month = 11; // November

    const { startDate, endDate } = getDateRange(year, month, 'monthly');

    console.log('=== DATE RANGE ===');
    console.log('Month:', month);
    console.log('Year:', year);
    console.log('Start Date:', startDate.toISOString());
    console.log('End Date:', endDate.toISOString());
    console.log();

    // Check packages with createdAt query
    console.log('=== QUERYING PACKAGES ===');
    const packages = await Package.find({
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

    console.log('Packages found:', packages.length);
    console.log();

    if (packages.length > 0) {
      console.log('=== PACKAGE DETAILS ===');
      packages.forEach((pkg: any, index) => {
        console.log(`Package ${index + 1}:`);
        console.log('  ID:', pkg._id);
        console.log('  Name:', pkg.name);
        console.log('  Price:', pkg.price);
        console.log('  Type:', pkg.type);
        console.log('  Sessions:', pkg.totalSessions);
        console.log('  Customer Name:', pkg.customerId?.userId?.name || 'Unknown');
        console.log('  createdAt:', pkg.createdAt);
        console.log('  validFrom:', pkg.validFrom);
        console.log('  validTo:', pkg.validTo);
        console.log();
      });
    }

    // Check existing report
    console.log('=== CHECKING EXISTING REPORT ===');
    const existingReport = await PaymentReport.findOne({
      month: month,
      year: year,
      reportType: 'monthly',
    }).lean();

    if (existingReport) {
      console.log('Existing report found:');
      console.log('  Report ID:', existingReport._id);
      console.log('  Total Revenue:', existingReport.totalRevenue);
      console.log('  Packages Sold Count:', existingReport.packagesSold?.length || 0);
      console.log('  Total Packages Sold:', existingReport.totalPackagesSold);
      console.log('  Generated At:', existingReport.generatedAt);
      console.log();

      if (existingReport.packagesSold && existingReport.packagesSold.length > 0) {
        console.log('=== PACKAGES IN EXISTING REPORT ===');
        existingReport.packagesSold.forEach((pkg: any, index) => {
          console.log(`Package ${index + 1}:`);
          console.log('  Customer:', pkg.customerName);
          console.log('  Package:', pkg.packageName);
          console.log('  Price:', pkg.price);
          console.log('  Purchase Date:', pkg.purchaseDate);
          console.log();
        });
      } else {
        console.log('WARNING: Existing report has NO packages sold!');
        console.log();
      }
    } else {
      console.log('No existing report found for November 2025');
      console.log();
    }

    // Try to simulate the packagesSoldData mapping
    console.log('=== SIMULATING PACKAGE MAPPING ===');
    const packagesSoldData = packages.map((pkg: any) => ({
      packageId: pkg._id,
      customerId: pkg.customerId?._id,
      customerName: pkg.customerId?.userId?.name || 'Unknown',
      packageName: pkg.name,
      packageType: pkg.type,
      totalSessions: pkg.totalSessions,
      price: pkg.price,
      purchaseDate: pkg.createdAt,
    }));

    console.log('Mapped packages count:', packagesSoldData.length);
    if (packagesSoldData.length > 0) {
      console.log('Sample mapped package:');
      console.log(JSON.stringify(packagesSoldData[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

debugNovember();
