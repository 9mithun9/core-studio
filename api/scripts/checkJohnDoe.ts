import { connectDB } from '../src/config/database';
import { User, Customer, Package, Booking } from '../src/models';

async function checkJohnDoe() {
  await connectDB();

  // Find John Doe
  const user = await User.findOne({ name: /john.*doe/i });
  if (!user) {
    console.log('John Doe not found');
    process.exit(0);
  }

  const customer = await Customer.findOne({ userId: user._id });
  if (!customer) {
    console.log('Customer profile not found');
    process.exit(0);
  }

  console.log('=== JOHN DOE ===');
  console.log('User ID:', user._id);
  console.log('Customer ID:', customer._id);

  // Get all packages
  const packages = await Package.find({ customerId: customer._id }).lean();
  console.log('\n=== PACKAGES ===');

  for (const pkg of packages) {
    console.log('\n' + '='.repeat(50));
    console.log('Package:', pkg.name);
    console.log('Total Sessions:', pkg.totalSessions);
    console.log('Remaining Sessions (DB):', pkg.remainingSessions);

    // Get all bookings for this package
    const allBookings = await Booking.find({ packageId: pkg._id }).lean();
    console.log('Total Bookings:', allBookings.length);

    // Count by status
    const completed = allBookings.filter(b => b.status === 'completed').length;
    const noShow = allBookings.filter(b => b.status === 'noShow').length;
    const confirmed = allBookings.filter(b => b.status === 'confirmed').length;
    const cancelled = allBookings.filter(b => b.status === 'cancelled').length;

    // Count past confirmed
    const now = new Date();
    const pastConfirmed = allBookings.filter(b => b.status === 'confirmed' && new Date(b.endTime) < now).length;
    const futureConfirmed = allBookings.filter(b => b.status === 'confirmed' && new Date(b.endTime) >= now).length;

    console.log('\nStatus Breakdown:');
    console.log('Completed:', completed);
    console.log('No Show:', noShow);
    console.log('Confirmed (total):', confirmed);
    console.log('  - Past Confirmed:', pastConfirmed);
    console.log('  - Future Confirmed:', futureConfirmed);
    console.log('Cancelled:', cancelled);

    console.log('\n--- Calculation Check ---');
    const totalCompleted = completed + noShow + pastConfirmed;
    console.log('Total Completed (Completed + NoShow + PastConfirmed):', totalCompleted);
    console.log('Future Upcoming (FutureConfirmed):', futureConfirmed);
    console.log('Cancelled:', cancelled);
    console.log('Remaining (DB field):', pkg.remainingSessions);

    console.log('\nFormula Check:');
    console.log('Total Sessions:', pkg.totalSessions);
    console.log('Completed + Upcoming + Cancelled + Remaining =', totalCompleted, '+', futureConfirmed, '+', cancelled, '+', pkg.remainingSessions, '=', totalCompleted + futureConfirmed + cancelled + pkg.remainingSessions);
    console.log('Should equal Total Sessions:', pkg.totalSessions);
    console.log('Match:', (totalCompleted + futureConfirmed + cancelled + pkg.remainingSessions) === pkg.totalSessions ? '✓ YES' : '✗ NO');
  }

  process.exit(0);
}

checkJohnDoe();
