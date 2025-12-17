import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Customer, User } from '../src/models';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function checkJaneSmith() {
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
    console.log('\nJane Smith Customer Profile:');
    console.log('Name:', jane.name);
    console.log('Email:', jane.email);
    console.log('Profile Photo:', customer?.profilePhoto || 'Not set');
    console.log('Date of Birth:', customer?.dateOfBirth || 'Not set');
    console.log('Height:', customer?.height || 'Not set');
    console.log('Weight:', customer?.weight || 'Not set');
    console.log('Gender:', customer?.gender || 'Not set');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkJaneSmith();
