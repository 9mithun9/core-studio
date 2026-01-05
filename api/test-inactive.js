// Simple test script to trigger inactive customer check
const http = require('http');

// Just call the scheduler function directly
async function test() {
  try {
    // Connect to MongoDB first
    require('tsconfig-paths/register');
    const { connectDB } = require('./src/config/db');
    await connectDB();

    // Run the check
    const { checkInactiveCustomers } = require('./src/services/inactiveCustomerScheduler');
    await checkInactiveCustomers();

    console.log('\n✓ Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

test();
