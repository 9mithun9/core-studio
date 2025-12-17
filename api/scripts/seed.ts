import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { hashPassword } from '../src/utils/password';
import { User, Customer, Teacher, Package, Booking, MessageTemplate } from '../src/models';
import { UserRole, UserStatus, PackageType, PackageStatus, NotificationChannel, BookingStatus } from '../src/types';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

// Helper to create dates in Bangkok timezone (UTC+7)
function createDate(year: number, month: number, day: number, hour: number = 10): Date {
  // Create date in Bangkok timezone by creating a UTC date and offsetting by 7 hours
  const bangkokDate = new Date(Date.UTC(year, month - 1, day, hour - 7, 0, 0));
  return bangkokDate;
}

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // Clear existing data
    console.log('\nClearing existing data...');
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Teacher.deleteMany({});
    await Package.deleteMany({});
    await Booking.deleteMany({});
    await MessageTemplate.deleteMany({});

    // Create Admin User
    console.log('\nCreating Admin User...');
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
    console.log('\nCreating Teachers...');
    const teachersData = [
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

    const createdTeachers = [];
    for (const teacherData of teachersData) {
      const teacherPasswordHash = await hashPassword('teacher123');
      const teacherUser = await User.create({
        role: UserRole.TEACHER,
        name: teacherData.name,
        email: teacherData.email,
        phone: teacherData.phone,
        passwordHash: teacherPasswordHash,
        status: UserStatus.ACTIVE,
      });

      const teacher = await Teacher.create({
        userId: teacherUser._id,
        bio: teacherData.bio,
        specialties: teacherData.specialties,
        hourlyRate: teacherData.hourlyRate,
        isActive: true,
      });

      createdTeachers.push(teacher);
      console.log('✓ Teacher created:', teacherUser.email);
    }

    // Create 10 Customers
    console.log('\nCreating 10 Customers...');
    const customersData = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+66-444-444-4444',
        dateOfBirth: new Date(1985, 3, 15),
        height: 175,
        weight: 78,
        medicalNotes: 'Lower back pain, avoid heavy weights. History of disc herniation.',
        healthNotes: 'Lower back pain, avoid heavy weights',
        profession: 'Software Engineer',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+66-444-444-4445',
        profilePhoto: 'https://i.pravatar.cc/150?img=12',
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+66-555-555-5555',
        dateOfBirth: new Date(1992, 6, 22),
        height: 165,
        weight: 62,
        medicalNotes: 'Pregnant, 2nd trimester. Cleared by doctor for light exercise.',
        healthNotes: 'Pregnant, 2nd trimester',
        profession: 'Marketing Manager',
        emergencyContactName: 'Robert Smith',
        emergencyContactPhone: '+66-555-555-5556',
        profilePhoto: 'https://i.pravatar.cc/150?img=5',
      },
      {
        name: 'David Lee',
        email: 'david@example.com',
        phone: '+66-666-666-6666',
        dateOfBirth: new Date(1988, 10, 8),
        height: 180,
        weight: 85,
        medicalNotes: 'Recovering from ACL surgery on right knee. 3 months post-op. Avoid deep squats.',
        healthNotes: 'Recovering from knee surgery',
        profession: 'Architect',
        emergencyContactName: 'Sarah Lee',
        emergencyContactPhone: '+66-666-666-6667',
      },
      {
        name: 'Emma Wilson',
        email: 'emma@example.com',
        phone: '+66-777-777-7777',
        dateOfBirth: new Date(1995, 2, 18),
        height: 168,
        weight: 58,
        healthNotes: 'No health issues',
        profession: 'Graphic Designer',
        emergencyContactName: 'Tom Wilson',
        emergencyContactPhone: '+66-777-777-7778',
        profilePhoto: 'https://i.pravatar.cc/150?img=9',
      },
      {
        name: 'Robert Brown',
        email: 'robert@example.com',
        phone: '+66-888-888-8888',
        dateOfBirth: new Date(1990, 8, 25),
        height: 183,
        weight: 92,
        medicalNotes: 'Rotator cuff injury from tennis. Physiotherapy ongoing.',
        healthNotes: 'Shoulder injury from sports',
        profession: 'Finance Director',
        emergencyContactName: 'Maria Brown',
        emergencyContactPhone: '+66-888-888-8889',
      },
      {
        name: 'Lisa Anderson',
        email: 'lisa@example.com',
        phone: '+66-999-999-9999',
        dateOfBirth: new Date(1987, 11, 30),
        height: 170,
        weight: 65,
        healthNotes: 'Wants to improve flexibility',
        profession: 'School Teacher',
        emergencyContactName: 'Paul Anderson',
        emergencyContactPhone: '+66-999-999-9998',
        profilePhoto: 'https://i.pravatar.cc/150?img=10',
      },
      {
        name: 'Michael Taylor',
        email: 'michael.t@example.com',
        phone: '+66-100-100-1000',
        dateOfBirth: new Date(1982, 4, 12),
        height: 172,
        weight: 82,
        medicalNotes: 'Office worker with chronic neck and upper back tension. Mild scoliosis.',
        healthNotes: 'Office worker, bad posture',
        profession: 'Accountant',
        emergencyContactName: 'Linda Taylor',
        emergencyContactPhone: '+66-100-100-1001',
      },
      {
        name: 'Sophia Martinez',
        email: 'sophia@example.com',
        phone: '+66-200-200-2000',
        dateOfBirth: new Date(1993, 1, 5),
        height: 163,
        weight: 55,
        medicalNotes: 'Marathon runner. Needs core strengthening to prevent injuries.',
        healthNotes: 'Runner, needs core strength',
        profession: 'Nurse',
        emergencyContactName: 'Carlos Martinez',
        emergencyContactPhone: '+66-200-200-2001',
        profilePhoto: 'https://i.pravatar.cc/150?img=20',
      },
      {
        name: 'James White',
        email: 'james@example.com',
        phone: '+66-300-300-3000',
        dateOfBirth: new Date(1958, 7, 14),
        height: 178,
        weight: 75,
        medicalNotes: 'Senior, 65+ years old. Mild arthritis in knees. Take it slow with modifications.',
        healthNotes: 'Senior, 65 years old',
        profession: 'Retired Professor',
        emergencyContactName: 'Margaret White',
        emergencyContactPhone: '+66-300-300-3001',
      },
      {
        name: 'Olivia Garcia',
        email: 'olivia@example.com',
        phone: '+66-400-400-4000',
        dateOfBirth: new Date(1996, 9, 20),
        height: 160,
        weight: 50,
        medicalNotes: 'Professional dancer. Hypermobile joints. Focus on stability rather than flexibility.',
        healthNotes: 'Dancer, very flexible',
        profession: 'Professional Dancer',
        emergencyContactName: 'Sofia Garcia',
        emergencyContactPhone: '+66-400-400-4001',
        profilePhoto: 'https://i.pravatar.cc/150?img=1',
      },
    ];

    const createdCustomers = [];
    for (const customerData of customersData) {
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
        dateOfBirth: (customerData as any).dateOfBirth,
        height: (customerData as any).height,
        weight: (customerData as any).weight,
        medicalNotes: (customerData as any).medicalNotes,
        profilePhoto: (customerData as any).profilePhoto,
        profession: (customerData as any).profession,
        healthNotes: customerData.healthNotes,
        emergencyContactName: (customerData as any).emergencyContactName,
        emergencyContactPhone: (customerData as any).emergencyContactPhone,
        tags: ['Active'],
      });

      createdCustomers.push(customer);
      console.log('✓ Customer created:', customerUser.email);
    }

    // Create Packages and Bookings across 4 months (September - December 2025)
    console.log('\nCreating Packages and Bookings for Sep-Dec 2025...');

    const packageTypes = [
      { name: '10 Session Package', sessions: 10, price: 10000, type: PackageType.PRIVATE },
      { name: '20 Session Package', sessions: 20, price: 20000, type: PackageType.PRIVATE },
      { name: '30 Session Package', sessions: 30, price: 30000, type: PackageType.PRIVATE },
      { name: '10 Session Package', sessions: 10, price: 8000, type: PackageType.DUO },
      { name: '20 Session Package', sessions: 20, price: 16000, type: PackageType.DUO },
      { name: '30 Session Package', sessions: 30, price: 24000, type: PackageType.DUO },
      { name: '10 Session Package', sessions: 10, price: 6000, type: PackageType.GROUP },
      { name: '20 Session Package', sessions: 20, price: 12000, type: PackageType.GROUP },
      { name: '30 Session Package', sessions: 30, price: 18000, type: PackageType.GROUP },
    ];

    // Customer package and booking scenarios
    const scenarios = [
      // Customer 0: John - Bought 10 private sessions in Sep, completed all, bought 20 private in Nov
      {
        customerIndex: 0,
        packages: [
          {
            typeIndex: 0, // 10 Session Private
            purchaseDate: createDate(2025, 9, 1),
            sessions: [
              { date: createDate(2025, 9, 5, 9), teacherIndex: 0, completed: true },
              { date: createDate(2025, 9, 10, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 9, 15, 14), teacherIndex: 1, completed: true },
              { date: createDate(2025, 9, 20, 11), teacherIndex: 0, completed: true },
              { date: createDate(2025, 9, 25, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 2, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 8, 15), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 15, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 22, 11), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 28, 14), teacherIndex: 1, completed: true },
            ],
          },
          {
            typeIndex: 1, // 20 Session Private
            purchaseDate: createDate(2025, 11, 1),
            sessions: [
              { date: createDate(2025, 11, 5, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 10, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 15, 14), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 20, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 25, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 12, 2, 9), teacherIndex: 0, completed: true },
              { date: createDate(2025, 12, 8, 15), teacherIndex: 1, completed: true },
              { date: createDate(2025, 12, 10, 10), teacherIndex: 0, completed: false }, // Future
              { date: createDate(2025, 12, 15, 14), teacherIndex: 1, completed: false }, // Future
            ],
          },
        ],
      },
      // Customer 1: Jane - Bought 30 duo sessions in Dec, active user
      {
        customerIndex: 1,
        packages: [
          {
            typeIndex: 5, // 30 Session Duo
            purchaseDate: createDate(2025, 12, 1),
            sessions: [
              { date: createDate(2025, 9, 7, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 9, 12, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 9, 18, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 9, 23, 14), teacherIndex: 0, completed: true },
              { date: createDate(2025, 9, 28, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 3, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 9, 9), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 14, 15), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 19, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 24, 14), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 30, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 4, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 9, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 14, 15), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 19, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 24, 9), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 29, 14), teacherIndex: 1, completed: true },
              { date: createDate(2025, 12, 3, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 12, 7, 11), teacherIndex: 0, completed: false }, // Future
              { date: createDate(2025, 12, 12, 9), teacherIndex: 1, completed: false }, // Future
            ],
          },
        ],
      },
      // Customer 2: David - Bought 10 group in Dec, completed most
      {
        customerIndex: 2,
        packages: [
          {
            typeIndex: 6, // 10 Session Group
            purchaseDate: createDate(2025, 12, 1),
            sessions: [
              { date: createDate(2025, 10, 5, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 12, 14), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 18, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 25, 11), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 1, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 8, 15), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 15, 9), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 22, 14), teacherIndex: 0, completed: true },
              { date: createDate(2025, 12, 6, 10), teacherIndex: 1, completed: false }, // Future
            ],
          },
        ],
      },
      // Customer 3: Emma - Bought 20 duo in Sep
      {
        customerIndex: 3,
        packages: [
          {
            typeIndex: 4, // 20 Session Duo
            purchaseDate: createDate(2025, 9, 5),
            sessions: [
              { date: createDate(2025, 9, 9, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 9, 16, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 9, 22, 14), teacherIndex: 1, completed: true },
              { date: createDate(2025, 9, 29, 9), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 6, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 13, 15), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 20, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 27, 14), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 3, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 11, 11), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 18, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 26, 15), teacherIndex: 0, completed: true },
              { date: createDate(2025, 12, 4, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 12, 9, 14), teacherIndex: 0, completed: false }, // Future
            ],
          },
        ],
      },
      // Customer 4: Robert - Bought 10 group in Nov
      {
        customerIndex: 4,
        packages: [
          {
            typeIndex: 6, // 10 Session Group
            purchaseDate: createDate(2025, 11, 2),
            sessions: [
              { date: createDate(2025, 11, 6, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 12, 14), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 17, 9), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 23, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 30, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 12, 5, 15), teacherIndex: 1, completed: false }, // Future
            ],
          },
        ],
      },
      // Customer 5: Lisa - Bought 30 group in Oct
      {
        customerIndex: 5,
        packages: [
          {
            typeIndex: 8, // 30 Session Group
            purchaseDate: createDate(2025, 10, 2),
            sessions: [
              { date: createDate(2025, 10, 7, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 11, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 16, 14), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 21, 11), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 26, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 31, 15), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 5, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 10, 14), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 16, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 21, 11), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 27, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 12, 1, 15), teacherIndex: 0, completed: true },
              { date: createDate(2025, 12, 11, 9), teacherIndex: 1, completed: false }, // Future
            ],
          },
        ],
      },
      // Customer 6: Michael T - Bought 20 private in Nov
      {
        customerIndex: 6,
        packages: [
          {
            typeIndex: 1, // 20 Session Private
            purchaseDate: createDate(2025, 11, 3),
            sessions: [
              { date: createDate(2025, 11, 7, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 13, 14), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 20, 9), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 28, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 12, 14, 10), teacherIndex: 0, completed: false }, // Future
            ],
          },
        ],
      },
      // Customer 7: Sophia - Bought 10 duo in Sep, 10 private in Nov (recurrent)
      {
        customerIndex: 7,
        packages: [
          {
            typeIndex: 3, // 10 Session Duo
            purchaseDate: createDate(2025, 9, 8),
            sessions: [
              { date: createDate(2025, 9, 13, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 9, 19, 14), teacherIndex: 0, completed: true },
              { date: createDate(2025, 9, 24, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 9, 30, 11), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 4, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 10, 15), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 17, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 23, 14), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 29, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 2, 10), teacherIndex: 0, completed: true },
            ],
          },
          {
            typeIndex: 0, // 10 Session Private
            purchaseDate: createDate(2025, 11, 5),
            sessions: [
              { date: createDate(2025, 11, 8, 14), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 14, 9), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 21, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 28, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 12, 13, 15), teacherIndex: 1, completed: false }, // Future
            ],
          },
        ],
      },
      // Customer 8: James - Bought 20 group in Oct
      {
        customerIndex: 8,
        packages: [
          {
            typeIndex: 7, // 20 Session Group
            purchaseDate: createDate(2025, 10, 3),
            sessions: [
              { date: createDate(2025, 10, 8, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 14, 14), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 19, 9), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 24, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 29, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 4, 15), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 9, 9), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 16, 14), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 23, 11), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 30, 10), teacherIndex: 1, completed: true },
            ],
          },
        ],
      },
      // Customer 9: Olivia - Bought 30 private in Sep
      {
        customerIndex: 9,
        packages: [
          {
            typeIndex: 2, // 30 Session Private
            purchaseDate: createDate(2025, 9, 10),
            sessions: [
              { date: createDate(2025, 9, 14, 11), teacherIndex: 0, completed: true },
              { date: createDate(2025, 9, 20, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 9, 26, 14), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 1, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 7, 11), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 12, 10), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 18, 15), teacherIndex: 0, completed: true },
              { date: createDate(2025, 10, 23, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 10, 28, 14), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 3, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 8, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 13, 9), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 19, 15), teacherIndex: 0, completed: true },
              { date: createDate(2025, 11, 24, 11), teacherIndex: 1, completed: true },
              { date: createDate(2025, 11, 29, 10), teacherIndex: 0, completed: true },
              { date: createDate(2025, 12, 3, 14), teacherIndex: 1, completed: true },
            ],
          },
        ],
      },
    ];

    let totalPackages = 0;
    let totalBookings = 0;

    for (const scenario of scenarios) {
      const customer = createdCustomers[scenario.customerIndex];

      for (const packageScenario of scenario.packages) {
        const packageType = packageTypes[packageScenario.typeIndex];
        const validTo = new Date(packageScenario.purchaseDate);
        validTo.setMonth(validTo.getMonth() + 12); // Valid for 1 year

        const sessionsUsed = packageScenario.sessions.length;
        const remainingSessions = packageType.sessions - sessionsUsed;

        const pkg = await Package.create({
          customerId: customer._id,
          name: packageType.name,
          type: packageType.type,
          totalSessions: packageType.sessions,
          remainingSessions: remainingSessions,
          validFrom: packageScenario.purchaseDate,
          validTo: validTo,
          price: packageType.price,
          currency: 'THB',
          status: remainingSessions > 0 ? PackageStatus.ACTIVE : PackageStatus.USED,
          createdAt: packageScenario.purchaseDate,
        });

        totalPackages++;
        console.log(`✓ Package created: ${packageType.name} for customer ${scenario.customerIndex + 1}`);

        // Create bookings for this package
        for (const session of packageScenario.sessions) {
          const teacher = createdTeachers[session.teacherIndex];
          const endTime = new Date(session.date);
          endTime.setHours(endTime.getHours() + 1);

          // Today is December 3, 2025
          const today = new Date(2025, 11, 3); // Month is 0-indexed, so 11 = December
          const isPastSession = session.date < today;

          // Mark sessions before today as COMPLETED, today and future sessions as CONFIRMED
          const status = isPastSession ? BookingStatus.COMPLETED : BookingStatus.CONFIRMED;

          await Booking.create({
            customerId: customer._id,
            teacherId: teacher._id,
            packageId: pkg._id,
            type: packageType.type,
            startTime: session.date,
            endTime: endTime,
            status: status,
            isRequestedByCustomer: false,
            createdBy: adminUser._id,
            createdAt: packageScenario.purchaseDate,
          });

          totalBookings++;
        }
      }
    }

    console.log(`\n✓ Total packages created: ${totalPackages}`);
    console.log(`✓ Total bookings created: ${totalBookings}`);

    // Create Message Templates
    console.log('\nCreating Message Templates...');
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
    console.log('\n📊 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Total Customers: 10`);
    console.log(`  Total Teachers: 2`);
    console.log(`  Total Packages: ${totalPackages}`);
    console.log(`  Total Bookings: ${totalBookings}`);
    console.log(`  Date Range: September - December 2025`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
    console.log('\nCustomers (All use password: customer123):');
    customersData.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.email}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
