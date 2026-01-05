import mongoose from 'mongoose';
import { Package } from '../src/models';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function debugPackages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // November 2025 date range
    const startDate = new Date(2025, 10, 1); // Nov 1, 2025
    const endDate = new Date(2025, 10, 30, 23, 59, 59); // Nov 30, 2025

    console.log('\n=== Date Range ===');
    console.log('Start:', startDate.toISOString());
    console.log('End:', endDate.toISOString());

    // Check all packages
    const allPackages = await Package.find().lean();
    console.log('\n=== Total Packages in DB ===');
    console.log('Count:', allPackages.length);

    // Check packages with createdAt in November 2025
    const packagesWithCreatedAt = await Package.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    console.log('\n=== Packages with createdAt in November 2025 ===');
    console.log('Count:', packagesWithCreatedAt.length);
    packagesWithCreatedAt.forEach((pkg: any) => {
      console.log({
        name: pkg.name,
        price: pkg.price,
        createdAt: pkg.createdAt,
        validFrom: pkg.validFrom,
        validTo: pkg.validTo,
      });
    });

    // Check packages with validFrom in November 2025
    const packagesWithValidFrom = await Package.find({
      validFrom: {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    console.log('\n=== Packages with validFrom in November 2025 ===');
    console.log('Count:', packagesWithValidFrom.length);
    packagesWithValidFrom.forEach((pkg: any) => {
      console.log({
        name: pkg.name,
        price: pkg.price,
        createdAt: pkg.createdAt,
        validFrom: pkg.validFrom,
        validTo: pkg.validTo,
      });
    });

    // Show sample of all packages to see date patterns
    console.log('\n=== Sample of Recent Packages (Last 10) ===');
    const recentPackages = await Package.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    recentPackages.forEach((pkg: any) => {
      console.log({
        name: pkg.name,
        price: pkg.price,
        createdAt: pkg.createdAt,
        validFrom: pkg.validFrom,
        validTo: pkg.validTo,
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

debugPackages();
