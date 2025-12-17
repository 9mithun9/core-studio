import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Customer, User, Package } from '../src/models';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function checkJanePackage() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const jane = await User.findOne({ name: /Jane Smith/i });
    if (!jane) {
      console.log('Jane Smith not found');
      await mongoose.disconnect();
      return;
    }

    const customer = await Customer.findOne({ userId: jane._id });
    if (!customer) {
      console.log('Customer profile not found');
      await mongoose.disconnect();
      return;
    }

    console.log('\n=== Jane Smith Customer Info ===');
    console.log('Customer ID:', customer._id);

    const packages = await Package.find({ customerId: customer._id }).lean();
    console.log('\n=== Packages ===');
    console.log('Total packages:', packages.length);

    packages.forEach((pkg: any, index: number) => {
      console.log(`\nPackage ${index + 1}:`);
      console.log('  ID:', pkg._id);
      console.log('  Name:', pkg.name);
      console.log('  Type:', pkg.type);
      console.log('  Status:', pkg.status);
      console.log('  Total Sessions:', pkg.totalSessions);
      console.log('  Remaining Sessions:', pkg.remainingSessions);
      console.log('  Valid From:', pkg.validFrom);
      console.log('  Valid Until:', pkg.validUntil);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkJanePackage();
