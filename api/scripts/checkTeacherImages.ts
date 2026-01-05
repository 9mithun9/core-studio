import mongoose from 'mongoose';
import { Teacher } from '../src/models';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkTeachers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB\n');

    const teachers = await Teacher.find()
      .populate('userId', 'name')
      .lean();

    console.log('=== TEACHERS WITH IMAGE STATUS ===\n');
    teachers.forEach((teacher: any) => {
      console.log('Teacher:', teacher.userId?.name || 'Unknown');
      console.log('Has imageUrl:', !!teacher.imageUrl);
      console.log('imageUrl:', teacher.imageUrl || 'NOT SET');
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkTeachers();
