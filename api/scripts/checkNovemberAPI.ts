import mongoose from 'mongoose';
import { PaymentReport } from '../src/models';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB\n');

    // Get the November report exactly as the API would return it
    const reports = await PaymentReport.find({
      year: 2025,
      month: 11,
      reportType: 'monthly',
    })
      .sort({ generatedAt: -1 })
      .limit(10)
      .lean();

    console.log('=== API RESPONSE SIMULATION ===');
    console.log('Number of reports found:', reports.length);
    console.log();

    if (reports.length > 0) {
      const report = reports[0];
      console.log('First Report:');
      console.log('  _id:', report._id);
      console.log('  month:', report.month);
      console.log('  year:', report.year);
      console.log('  totalRevenue:', report.totalRevenue);
      console.log('  packagesSold exists?', !!report.packagesSold);
      console.log('  packagesSold type:', typeof report.packagesSold);
      console.log('  packagesSold is array?', Array.isArray(report.packagesSold));
      console.log('  packagesSold length:', report.packagesSold?.length);
      console.log('  totalPackagesSold:', report.totalPackagesSold);
      console.log();

      if (report.packagesSold) {
        console.log('=== PACKAGES SOLD ARRAY ===');
        console.log('Length:', report.packagesSold.length);
        console.log('First package:', JSON.stringify(report.packagesSold[0], null, 2));
        console.log();
      }

      // Check the actual JSON that would be sent
      console.log('=== FULL REPORT JSON (packagesSold only) ===');
      console.log(JSON.stringify({
        packagesSold: report.packagesSold,
        totalPackagesSold: report.totalPackagesSold,
      }, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkAPI();
