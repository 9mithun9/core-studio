import mongoose from 'mongoose';
import { hashPassword } from '../src/utils/password';
import { User, Customer, Teacher, Package, MessageTemplate } from '../src/models';
import { UserRole, UserStatus, PackageType, PackageStatus, NotificationChannel } from '../src/types';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('\nClearing existing data...');
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Teacher.deleteMany({});
    await Package.deleteMany({});
    await MessageTemplate.deleteMany({});

    // Create Admin User
    console.log('\n Creating Admin User...');
    const adminPasswordHash = await hashPassword('admin123');
    const adminUser = await User.create({
      role: UserRole.ADMIN,
      name: 'Admin User',
      email: 'admin@corestudio.com',
      phone: '+66-111-111-1111',
      passwordHash: adminPasswordHash,
      status: UserStatus.ACTIVE,
    });
    console.log('✓ Admin created:', adminUser.email);

    // Create Teachers
    console.log('\n Creating Teachers...');
    const teachers = [
      {
        name: 'Sarah Johnson',
        email: 'sarah@corestudio.com',
        phone: '+66-222-222-2222',
        bio: 'Certified Pilates instructor with 10+ years of experience specializing in rehabilitation and athletic performance.',
        specialties: ['Reformer', 'Mat', 'Rehabilitation'],
        hourlyRate: 2000,
      },
      {
        name: 'Michael Chen',
        email: 'michael@corestudio.com',
        phone: '+66-333-333-3333',
        bio: 'Former professional dancer turned Pilates instructor. Specializes in flexibility and core strength.',
        specialties: ['Mat', 'Chair', 'Flexibility'],
        hourlyRate: 1800,
      },
    ];

    for (const teacherData of teachers) {
      const teacherPasswordHash = await hashPassword('teacher123');
      const teacherUser = await User.create({
        role: UserRole.TEACHER,
        name: teacherData.name,
        email: teacherData.email,
        phone: teacherData.phone,
        passwordHash: teacherPasswordHash,
        status: UserStatus.ACTIVE,
      });

      await Teacher.create({
        userId: teacherUser._id,
        bio: teacherData.bio,
        specialties: teacherData.specialties,
        hourlyRate: teacherData.hourlyRate,
        isActive: true,
      });

      console.log('✓ Teacher created:', teacherUser.email);
    }

    // Create Sample Customers
    console.log('\n Creating Sample Customers...');
    const customers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+66-444-444-4444',
        healthNotes: 'Lower back pain, avoid heavy weights',
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+66-555-555-5555',
        healthNotes: 'Pregnant, 2nd trimester',
      },
      {
        name: 'David Lee',
        email: 'david@example.com',
        phone: '+66-666-666-6666',
        healthNotes: 'Recovering from knee surgery',
      },
    ];

    const createdCustomers = [];
    for (const customerData of customers) {
      const customerPasswordHash = await hashPassword('customer123');
      const customerUser = await User.create({
        role: UserRole.CUSTOMER,
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        passwordHash: customerPasswordHash,
        status: UserStatus.ACTIVE,
      });

      const customer = await Customer.create({
        userId: customerUser._id,
        healthNotes: customerData.healthNotes,
        tags: ['Active'],
      });

      createdCustomers.push(customer);
      console.log('✓ Customer created:', customerUser.email);
    }

    // Create Sample Packages
    console.log('\n Creating Sample Packages...');
    const now = new Date();
    const threeMonthsLater = new Date(now);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    for (const customer of createdCustomers) {
      await Package.create({
        customerId: customer._id,
        name: '10 Private Sessions Package',
        type: PackageType.PRIVATE,
        totalSessions: 10,
        remainingSessions: 10,
        validFrom: now,
        validTo: threeMonthsLater,
        price: 15000,
        currency: 'THB',
        status: PackageStatus.ACTIVE,
      });
      console.log('✓ Package created for customer:', customer._id);
    }

    // Create Message Templates
    console.log('\n Creating Message Templates...');
    const templates = [
      {
        key: 'booking_confirmed',
        channel: NotificationChannel.LINE,
        body: 'Hi {{name}}! Your Pilates session on {{date}} at {{time}} with {{teacher}} has been confirmed. See you there!',
        variables: ['name', 'date', 'time', 'teacher'],
      },
      {
        key: 'booking_rejected',
        channel: NotificationChannel.LINE,
        body: 'Hi {{name}}, we couldn\'t confirm your booking request for {{date}} at {{time}}. Reason: {{reason}}. Please contact us to reschedule.',
        variables: ['name', 'date', 'time', 'reason'],
      },
      {
        key: 'reminder_24h',
        channel: NotificationChannel.LINE,
        body: 'Reminder: You have a Pilates session tomorrow at {{time}} with {{teacher}}. Looking forward to seeing you!',
        variables: ['time', 'teacher'],
      },
      {
        key: 'inactive_30d',
        channel: NotificationChannel.LINE,
        body: 'Hi {{name}}, we haven\'t seen you in a while! You have {{sessions}} sessions remaining. Book your next session today!',
        variables: ['name', 'sessions'],
      },
    ];

    for (const template of templates) {
      await MessageTemplate.create(template);
      console.log('✓ Template created:', template.key);
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nAdmin:');
    console.log('  Email: admin@corestudio.com');
    console.log('  Password: admin123');
    console.log('\nTeachers:');
    console.log('  Email: sarah@corestudio.com');
    console.log('  Password: teacher123');
    console.log('  ---');
    console.log('  Email: michael@corestudio.com');
    console.log('  Password: teacher123');
    console.log('\nCustomers:');
    console.log('  Email: john@example.com');
    console.log('  Password: customer123');
    console.log('  ---');
    console.log('  Email: jane@example.com');
    console.log('  Password: customer123');
    console.log('  ---');
    console.log('  Email: david@example.com');
    console.log('  Password: customer123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
