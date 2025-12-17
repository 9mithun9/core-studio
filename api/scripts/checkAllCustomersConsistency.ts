import mongoose from 'mongoose';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function checkAllCustomersConsistency() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const customersCollection = db.collection('customers');
    const packagesCollection = db.collection('packages');
    const bookingsCollection = db.collection('bookings');

    // Get all customers
    const customers = await customersCollection.find({}).toArray();
    logger.info(`Found ${customers.length} customers\n`);

    const issues = [];

    for (const customer of customers) {
      const user = await usersCollection.findOne({ _id: customer.userId });
      if (!user) continue;

      const packages = await packagesCollection.find({ customerId: customer._id }).toArray();

      for (const pkg of packages) {
        const bookings = await bookingsCollection.find({ packageId: pkg._id }).sort({ startTime: 1 }).toArray();

        if (bookings.length > 0) {
          const userCreated = new Date(user.createdAt);
          const customerCreated = new Date(customer.createdAt);
          const packageCreated = new Date(pkg.createdAt);
          const packageValidFrom = new Date(pkg.validFrom);
          const packageValidTo = new Date(pkg.validTo);
          const earliestSession = new Date(bookings[0].startTime);

          // Check consistency
          const hasIssue =
            userCreated > packageValidFrom ||
            customerCreated > packageValidFrom ||
            packageCreated > packageValidFrom ||
            packageValidFrom > earliestSession;

          // Check validity period (should be 12 months)
          const validityMonths = (packageValidTo.getTime() - packageValidFrom.getTime()) / (1000 * 60 * 60 * 24 * 30);
          const wrongValidity = Math.abs(validityMonths - 12) > 1; // Allow 1 month tolerance

          if (hasIssue || wrongValidity) {
            issues.push({
              userName: user.name,
              userEmail: user.email,
              userCreated,
              customerCreated,
              packageCreated,
              packageValidFrom,
              packageValidTo,
              earliestSession,
              packageName: pkg.name,
              validityMonths: Math.round(validityMonths * 10) / 10,
              issue: hasIssue ? 'DATE_INCONSISTENCY' : 'WRONG_VALIDITY_PERIOD'
            });
          }
        }
      }
    }

    if (issues.length === 0) {
      logger.info('✅ All customers have consistent data!\n');
    } else {
      logger.error(`❌ Found ${issues.length} issues:\n`);

      issues.forEach((issue, index) => {
        logger.error(`\n--- Issue ${index + 1}: ${issue.userName} (${issue.userEmail}) ---`);
        logger.error(`Package: ${issue.packageName}`);
        logger.error(`Issue Type: ${issue.issue}`);
        logger.error(`User Created: ${issue.userCreated.toISOString()}`);
        logger.error(`Package Valid From: ${issue.packageValidFrom.toISOString()}`);
        logger.error(`Earliest Session: ${issue.earliestSession.toISOString()}`);
        if (issue.issue === 'WRONG_VALIDITY_PERIOD') {
          logger.error(`Package Validity: ${issue.validityMonths} months (should be 12)`);
          logger.error(`Valid To: ${issue.packageValidTo.toISOString()}`);
        }
      });
    }

    await mongoose.disconnect();
    logger.info('\nDisconnected from MongoDB');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

checkAllCustomersConsistency();
