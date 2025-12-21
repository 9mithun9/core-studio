import mongoose from 'mongoose';
import { subMonths } from 'date-fns';
import * as dotenv from 'dotenv';
import { Customer } from '../src/models/Customer';
import { Booking } from '../src/models/Booking';
import { User } from '../src/models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/core-studio';

async function checkChurnedCustomers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const threeMonthsAgo = subMonths(new Date(), 3);

    // Get all customers
    const allCustomers = await Customer.find({});
    console.log(`Total Customers: ${allCustomers.length}\n`);

    const activeCustomers = [];
    const churnedCustomers = [];

    for (const customer of allCustomers) {
      // Manually fetch user data
      const user = await User.findById(customer.userId);

      // Check if customer has any bookings in the last 3 months
      const recentBookings = await Booking.countDocuments({
        customerId: customer._id,
        createdAt: { $gte: threeMonthsAgo },
      });

      if (recentBookings > 0) {
        activeCustomers.push({
          name: user?.name || 'Unknown',
          email: user?.email || 'Unknown',
          recentBookings,
        });
      } else {
        // Check when was their last booking
        const lastBooking = await Booking.findOne({
          customerId: customer._id,
        }).sort({ createdAt: -1 });

        churnedCustomers.push({
          name: user?.name || 'Unknown',
          email: user?.email || 'Unknown',
          lastBooking: lastBooking ? new Date(lastBooking.createdAt) : null,
          registeredAt: new Date(customer.createdAt),
        });
      }
    }

    console.log('========== ACTIVE CUSTOMERS (Booked in last 3 months) ==========');
    console.log(`Count: ${activeCustomers.length}\n`);
    activeCustomers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (${c.email})`);
      console.log(`   Recent bookings: ${c.recentBookings}\n`);
    });

    console.log('\n========== CHURNED CUSTOMERS (No bookings in 3+ months) ==========');
    console.log(`Count: ${churnedCustomers.length}\n`);
    churnedCustomers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (${c.email})`);
      console.log(`   Registered: ${c.registeredAt.toLocaleDateString()}`);
      if (c.lastBooking) {
        console.log(`   Last Booking: ${c.lastBooking.toLocaleDateString()}`);
        const daysSinceLastBooking = Math.floor(
          (Date.now() - c.lastBooking.getTime()) / (1000 * 60 * 60 * 24)
        );
        console.log(`   Days since last booking: ${daysSinceLastBooking} days`);
      } else {
        console.log(`   Last Booking: Never booked`);
      }
      console.log('');
    });

    console.log('\n========== CHURN RATE ==========');
    const churnRate = (churnedCustomers.length / allCustomers.length) * 100;
    console.log(`Churn Rate: ${churnRate.toFixed(1)}%`);
    console.log(`(${churnedCustomers.length} churned out of ${allCustomers.length} total customers)`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkChurnedCustomers();
