# Comprehensive Analytics Dashboard

## Overview
The admin analytics dashboard has been enhanced with 5 comprehensive sections providing deep insights into business performance, customer behavior, and operational metrics.

## Sections

### 1. Executive Overview
**Endpoint:** `GET /api/admin/analytics/executive-overview`

Key metrics displayed:
- **Total Revenue** - Current month revenue with MoM growth percentage
- **Revenue Growth** - Month-over-month percentage change
- **Active Customers** - Customers with active packages this month
- **Average Revenue Per User (ARPU)** - Total lifetime revenue / total customers
- **Session Completion Rate** - Percentage of sessions marked as completed

### 2. Revenue & Operations Performance
**Endpoint:** `GET /api/admin/analytics/revenue-operations`

Visualizations:
- **Monthly Revenue Trend** - Line chart showing last 12 months of revenue
- **Revenue by Package Type** - Bar chart breaking down revenue by private/duo/group
- **Sessions Sold vs Completed** - Comparison chart of sessions purchased vs actually completed (last 6 months)

### 3. Customer Intelligence & Demographics
**Endpoint:** `GET /api/admin/analytics/customer-intelligence`

Insights:
- **New vs Returning Customers** - Stacked bar chart showing acquisition vs retention (last 6 months)
- **Churn Rate** - Percentage of customers inactive for 3+ months
- **Gender Distribution** - Pie chart of customer demographics
- **Age Distribution** - Bar chart showing age ranges (18-25, 26-35, 36-45, 46-55, 56+)

### 4. Marketing & Acquisition Performance
**Endpoint:** `GET /api/admin/analytics/marketing-performance`

Metrics (Note: Currently using placeholder data):
- **Cost Per Acquisition (CPA)** - Average cost to acquire a customer
- **Customer Lifetime Value (LTV)** - Average revenue per customer
- **Return on Investment (ROI)** - Marketing effectiveness ratio
- **Acquisition by Channel** - Bar chart showing customer sources
- **Conversion Funnel** - Visual funnel from visitors to active bookings

⚠️ **Note:** Marketing attribution tracking is not yet implemented. Channel data and CPA/ROI are placeholder values for demonstration.

### 5. Retention, Engagement & Growth Insights
**Endpoint:** `GET /api/admin/analytics/retention-insights`

Advanced Analytics:
- **Cohort Retention Analysis** - Table showing retention rates for each signup cohort over 6 months
  - Color-coded cells: Green (good retention), Yellow (moderate), Red (poor)
- **Customer Lifetime Value Trend** - Area chart showing LTV evolution over 12 months
- **Peak Usage Heatmap** - Day/hour heatmap (Mon-Sun, 7 AM - 10 PM) showing session density
  - Helps identify optimal scheduling times
- **Time to First Purchase** - Distribution of days from signup to first package purchase
  - Buckets: Same Day, 1-3 Days, 4-7 Days, 1-2 Weeks, 2+ Weeks

## Implementation Details

### Backend Structure
Location: `api/src/modules/admin/analytics.controller.ts`

All endpoints require:
- Authentication middleware (`authMiddleware`)
- Admin role (`requireAdmin`)

### Frontend Components
Location: `web/src/app/admin/dashboard/page.tsx`

Features:
- Responsive grid layouts
- Recharts library for all visualizations
- Color-coded KPI cards
- Interactive tooltips and legends
- Smooth data loading states

### Color Palette
- Blue gradient: Revenue metrics
- Green gradient: Growth/positive metrics
- Purple gradient: Customer metrics
- Orange gradient: ARPU
- Teal gradient: Completion rates
- Red gradient: Churn/warning metrics

## Data Flow

```
Frontend (Admin Dashboard)
    ↓
API Routes (/api/admin/analytics/*)
    ↓
Analytics Controllers
    ↓
MongoDB Aggregations & Queries
    ↓
Formatted Response
```

## Future Enhancements

### Planned Features
1. **Marketing Attribution**
   - UTM parameter tracking
   - Referral code system
   - Real CPA/ROI calculations

2. **Advanced Cohort Analysis**
   - Cohort-based revenue tracking
   - Segmentation by package type
   - Geographic cohorts

3. **Predictive Analytics**
   - Churn prediction model
   - Revenue forecasting
   - Customer lifetime value predictions

4. **Export Capabilities**
   - CSV/Excel export for all charts
   - PDF report generation
   - Scheduled email reports

5. **Real-time Updates**
   - WebSocket integration
   - Live KPI updates
   - Real-time booking notifications

## Performance Considerations

### Current Optimization
- Parallel data fetching on frontend
- MongoDB aggregation pipelines for complex queries
- Indexed fields for fast lookups

### Recommended Improvements
- Implement caching layer (Redis) for frequently accessed analytics
- Background jobs for complex calculations
- Materialized views for historical data

## Usage

### Accessing the Dashboard
1. Login as admin user
2. Navigate to `/admin/dashboard`
3. Dashboard loads all 5 sections automatically

### Data Refresh
- Data is fetched on page load
- To refresh, reload the page
- Consider adding a manual refresh button for future versions

## API Response Examples

### Executive Overview
```json
{
  "totalRevenue": 45000,
  "revenueGrowth": 12.5,
  "activeCustomers": 42,
  "activeCustomersLastMonth": 38,
  "averageRevenuePerUser": 2500,
  "sessionCompletionRate": 87.3,
  "lastMonthRevenue": 40000
}
```

### Cohort Data
```json
{
  "cohorts": [
    {
      "cohort": "Dec 2025",
      "month0": 100,
      "month1": 85.5,
      "month2": 72.1,
      "month3": 65.3,
      "month4": 58.7,
      "month5": 52.4
    }
  ]
}
```

## Dependencies

### Backend
- `date-fns` - Date manipulation and formatting
- `mongoose` - MongoDB queries and aggregations
- `express` - API routing

### Frontend
- `recharts` - Chart library
- `@radix-ui/react-*` - UI components
- `tailwindcss` - Styling
- `next` - React framework

## Troubleshooting

### Common Issues

**Issue:** No data showing in charts
- **Solution:** Ensure database has sample data, check browser console for API errors

**Issue:** Cohort table shows all zeros
- **Solution:** Verify customers have bookings in their data, check date calculations

**Issue:** Performance slow with large datasets
- **Solution:** Implement pagination, add database indexes, use caching

## Maintenance

### Regular Tasks
- Monitor query performance
- Update color schemes as needed
- Add new metrics based on business needs
- Review and optimize MongoDB queries

### Data Quality
- Ensure all bookings have proper status
- Validate customer data (gender, DOB)
- Clean up orphaned records
- Regular data integrity checks
