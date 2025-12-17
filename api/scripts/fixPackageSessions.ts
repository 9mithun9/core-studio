import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Package } from '../src/models/Package';
import { Booking } from '../src/models/Booking';
import { Customer } from '../src/models/Customer';
import { User } from '../src/models/User';
import { BookingStatus, PackageStatus } from '../src/types';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function fixPackageSessions() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all packages
    const packages = await Package.find();

    console.log(`\nFound ${packages.length} packages. Fixing session counts...\n`);

    for (const pkg of packages) {
      // Count confirmed and completed bookings for this package
      const confirmedBookings = await Booking.countDocuments({
        packageId: pkg._id,
        status: { $in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      });

      // Calculate correct remaining sessions
      const correctRemaining = pkg.totalSessions - confirmedBookings;

      if (pkg.remainingSessions !== correctRemaining) {
        console.log(`Package: ${pkg.name}`);
        console.log(`  Total Sessions: ${pkg.totalSessions}`);
        console.log(`  Confirmed/Completed Bookings: ${confirmedBookings}`);
        console.log(`  Current Remaining: ${pkg.remainingSessions} ❌`);
        console.log(`  Correct Remaining: ${correctRemaining} ✓`);
        console.log(`  Updating...`);

        pkg.remainingSessions = correctRemaining;

        // Update status based on remaining sessions
        if (correctRemaining === 0 && pkg.status === PackageStatus.ACTIVE) {
          pkg.status = PackageStatus.USED;
          console.log(`  Status changed to: used`);
        } else if (correctRemaining > 0 && pkg.status === PackageStatus.USED) {
          pkg.status = PackageStatus.ACTIVE;
          console.log(`  Status changed to: active`);
        }

        await pkg.save();
        console.log(`  ✓ Fixed!\n`);
      } else {
        console.log(`Package: ${pkg.name} - OK (${pkg.remainingSessions}/${pkg.totalSessions})`);
      }
    }

    console.log('\n✓ All packages fixed!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixPackageSessions();
