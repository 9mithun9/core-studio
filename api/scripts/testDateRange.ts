// Test the new date range function
function getDateRange(year: number, month: number, reportType: string) {
  switch (reportType) {
    case 'monthly':
      return {
        startDate: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
      };
    default:
      return {
        startDate: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
      };
  }
}

const { startDate, endDate } = getDateRange(2025, 11, 'monthly');

console.log('November 2025 Date Range:');
console.log('Start:', startDate.toISOString());
console.log('End:', endDate.toISOString());
console.log('\nPackage dates from DB:');
console.log('2025-11-05T03:00:00.000Z - Should be INCLUDED?',
  startDate <= new Date('2025-11-05T03:00:00.000Z') && new Date('2025-11-05T03:00:00.000Z') <= endDate);
console.log('2025-11-06T03:00:00.000Z - Should be INCLUDED?',
  startDate <= new Date('2025-11-06T03:00:00.000Z') && new Date('2025-11-06T03:00:00.000Z') <= endDate);
console.log('2025-11-07T03:00:00.000Z - Should be INCLUDED?',
  startDate <= new Date('2025-11-07T03:00:00.000Z') && new Date('2025-11-07T03:00:00.000Z') <= endDate);
console.log('2025-11-08T03:00:00.000Z - Should be INCLUDED?',
  startDate <= new Date('2025-11-08T03:00:00.000Z') && new Date('2025-11-08T03:00:00.000Z') <= endDate);
