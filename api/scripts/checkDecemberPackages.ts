import mongoose from 'mongoose';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import * as dotenv from 'dotenv';
import { Package } from '../src/models/Package';
import { Customer } from '../src/models/Customer';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/core-studio';

async function checkDecemberPackages() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const december2025Start = new Date('2025-12-01');
    const december2025End = new Date('2025-12-31T23:59:59');

    console.log('========== DECEMBER 2025 PACKAGES ==========\n');

    // Get all packages purchased in December
    const decemberPackages = await Package.find({
      createdAt: { $gte: december2025Start, $lte: december2025End },
    }).populate('customerId').sort({ createdAt: 1 });

    console.log(`Total packages purchased in December: ${decemberPackages.length}\n`);

    if (decemberPackages.length === 0) {
      console.log('No packages purchased in December 2025');
    } else {
      for (let i = 0; i < decemberPackages.length; i++) {
        const pkg = decemberPackages[i];
        const customer = pkg.customerId as any;

        console.log(`${i + 1}. Package ID: ${pkg._id}`);
        console.log(`   Customer: ${customer?.name || 'Unknown'} (${customer?.email || 'Unknown'})`);
        console.log(`   Package Type: ${pkg.type}, Sessions: ${pkg.totalSessions}`);
        console.log(`   Price: ฿${pkg.price}`);
        console.log(`   Purchased: ${format(new Date(pkg.createdAt), 'MMM dd, yyyy HH:mm')}`);

        // Check if this customer had any previous packages
        const previousPackages = await Package.find({
          customerId: customer._id,
          createdAt: { $lt: december2025Start },
        });

        if (previousPackages.length > 0) {
          console.log(`   ✓ RENEWAL - Customer had ${previousPackages.length} previous package(s)`);
          console.log(`     First package: ${format(new Date(previousPackages[0].createdAt), 'MMM dd, yyyy')}`);
        } else {
          console.log(`   ★ NEW CUSTOMER - This is their first package`);
        }
        console.log('');
      }
    }

    // Summary
    console.log('\n========== SUMMARY ==========');
    let newCustomers = 0;
    let renewals = 0;

    for (const pkg of decemberPackages) {
      const customer = pkg.customerId as any;
      const previousPackages = await Package.find({
        customerId: customer._id,
        createdAt: { $lt: december2025Start },
      });

      if (previousPackages.length > 0) {
        renewals++;
      } else {
        newCustomers++;
      }
    }

    console.log(`New Customers (First Package): ${newCustomers}`);
    console.log(`Renewals (Repeat Purchase): ${renewals}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkDecemberPackages();
