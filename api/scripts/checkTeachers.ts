import mongoose from 'mongoose';
import { Teacher } from '../src/models/Teacher';
import { User } from '../src/models/User';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function checkTeachers() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Get all teachers
    const teachers = await Teacher.find().populate('userId', 'name email role');

    console.log('\n=== Teachers in Database ===');
    console.log('Total teachers:', teachers.length);

    if (teachers.length === 0) {
      console.log('\nNo teachers found in the database.');

      // Check if there are any users with teacher role
      const teacherUsers = await User.find({ role: 'teacher' });
      console.log('\nUsers with teacher role:', teacherUsers.length);

      if (teacherUsers.length > 0) {
        console.log('\nTeacher users found but no Teacher profiles:');
        teacherUsers.forEach(user => {
          console.log(`- ${user.name} (${user.email})`);
        });
      }
    } else {
      console.log('\nTeachers:');
      teachers.forEach((teacher, i) => {
        console.log(`\n${i + 1}. ${(teacher.userId as any).name}`);
        console.log(`   Email: ${(teacher.userId as any).email}`);
        console.log(`   Bio: ${teacher.bio || 'N/A'}`);
        console.log(`   Years of experience: ${teacher.yearsOfExperience || 'N/A'}`);
        console.log(`   Specialties: ${teacher.specialties?.join(', ') || 'N/A'}`);
        console.log(`   Active: ${teacher.isActive}`);
        console.log(`   Image URL: ${teacher.imageUrl || 'N/A'}`);
      });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

checkTeachers();
