import mongoose from 'mongoose';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import Customer from '../src/models/Customer';
import Booking from '../src/models/Booking';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/core-studio';

async function checkNewVsReturningCustomers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const now = new Date();

    // Check last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthName = format(monthStart, 'MMMM yyyy');

      console.log(`\n========== ${monthName} ==========\n`);

      // NEW CUSTOMERS: Registered in this month
      const newCustomers = await Customer.find({
        createdAt: { $gte: monthStart, $lte: monthEnd },
      }).select('name email createdAt');

      console.log(`NEW CUSTOMERS (${newCustomers.length}):`);
      if (newCustomers.length === 0) {
        console.log('  None');
      } else {
        newCustomers.forEach((customer, index) => {
          console.log(`  ${index + 1}. ${customer.name} (${customer.email})`);
          console.log(`     Registered: ${format(new Date(customer.createdAt), 'MMM dd, yyyy')}`);
        });
      }

      // RETURNING CUSTOMERS: Made bookings this month but registered before this month
      const bookingsThisMonth = await Booking.find({
        createdAt: { $gte: monthStart, $lte: monthEnd },
      }).populate('customerId');

      const returningCustomerIds = new Set();
      const returningCustomerMap = new Map();

      for (const booking of bookingsThisMonth) {
        if (booking.customerId && typeof booking.customerId === 'object') {
          const customer = booking.customerId as any;
          const customerCreatedAt = new Date(customer.createdAt);

          // Only count as returning if they registered BEFORE this month
          if (customerCreatedAt < monthStart) {
            if (!returningCustomerIds.has(customer._id.toString())) {
              returningCustomerIds.add(customer._id.toString());
              returningCustomerMap.set(customer._id.toString(), {
                name: customer.name,
                email: customer.email,
                registeredAt: customer.createdAt,
                bookingDate: booking.createdAt,
              });
            }
          }
        }
      }

      console.log(`\nRETURNING CUSTOMERS (${returningCustomerIds.size}):`);
      if (returningCustomerIds.size === 0) {
        console.log('  None');
      } else {
        let index = 1;
        returningCustomerMap.forEach((data) => {
          console.log(`  ${index}. ${data.name} (${data.email})`);
          console.log(`     Originally Registered: ${format(new Date(data.registeredAt), 'MMM dd, yyyy')}`);
          console.log(`     Booked in ${monthName}: ${format(new Date(data.bookingDate), 'MMM dd, yyyy')}`);
          index++;
        });
      }

      console.log('\n' + '='.repeat(50));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkNewVsReturningCustomers();
