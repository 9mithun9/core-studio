import mongoose from 'mongoose';
import { PaymentReport } from '../src/models';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function cleanReports() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB\n');

    // Delete all November 2025 monthly reports
    const result = await PaymentReport.deleteMany({
      year: 2025,
      month: 11,
      reportType: 'monthly',
    });

    console.log(`Deleted ${result.deletedCount} November 2025 reports`);
    console.log('\nNow please regenerate the report from the web interface');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

cleanReports();
