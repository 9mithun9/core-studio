# Analytics Dashboard - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Both API and Web servers must be running
- Admin user credentials
- Database with sample data

### Access the Dashboard
1. Open browser: `http://localhost:3000`
2. Login with admin credentials
3. Navigate to: `/admin/dashboard`
4. Dashboard loads automatically with all 5 sections

## 📊 Dashboard Sections (In Order)

### 1️⃣ Executive Overview
**What it shows:** High-level KPIs for quick business health check

**Key Metrics:**
- Total Revenue (current month)
- Revenue Growth % (MoM)
- Active Customers
- Average Revenue Per User
- Session Completion Rate

**Look for:** Green ↑ arrows indicate growth, red ↓ arrows indicate decline

---

### 2️⃣ Revenue & Operations Performance
**What it shows:** Financial trends and operational efficiency

**Charts:**
- Monthly Revenue Trend (12 months)
- Revenue by Package Type (private/duo/group)
- Sessions Sold vs Completed (6 months)

**Insights:** Identify revenue trends, popular package types, session utilization

---

### 3️⃣ Customer Intelligence & Demographics
**What it shows:** Customer behavior and demographic breakdown

**Visualizations:**
- New vs Returning Customers (6 months)
- Churn Rate (% inactive 3+ months)
- Gender Distribution (pie chart)
- Age Distribution (bar chart)

**Use for:** Understanding customer acquisition, retention, and demographics

---

### 4️⃣ Marketing & Acquisition Performance
**What it shows:** Marketing effectiveness metrics

**Displays:**
- Cost Per Acquisition (CPA)
- Customer Lifetime Value (LTV)
- Return on Investment (ROI)
- Acquisition by Channel
- Conversion Funnel

⚠️ **Note:** Currently shows placeholder data. Marketing attribution needs implementation.

---

### 5️⃣ Retention, Engagement & Growth Insights
**What it shows:** Long-term customer value and behavior patterns

**Advanced Analytics:**
- **Cohort Retention Table:** Track retention rates for each signup month
  - Green cells: Good retention (>80%)
  - Yellow cells: Moderate retention (40-80%)
  - Red cells: Poor retention (<40%)

- **LTV Over Time:** Average customer lifetime value trend

- **Peak Usage Heatmap:** Shows busiest days/hours
  - Darker green = More bookings
  - Light/white = Fewer bookings
  - Helps optimize scheduling

- **Time to First Purchase:** How quickly customers convert after signup

---

## 🎯 Common Use Cases

### Monthly Business Review
1. Check **Executive Overview** for high-level metrics
2. Review **Revenue & Operations** for financial trends
3. Analyze **Customer Intelligence** for retention issues

### Scheduling Optimization
1. Go to **Retention Insights** section
2. Review **Peak Usage Heatmap**
3. Identify busiest days/hours
4. Adjust teacher schedules accordingly

### Customer Retention Analysis
1. Check **Churn Rate** in Customer Intelligence
2. Review **Cohort Retention Table** in Retention Insights
3. Identify cohorts with low retention
4. Investigate what changed during those months

### Revenue Forecasting
1. Review **Monthly Revenue Trend**
2. Check **Revenue Growth %**
3. Analyze **LTV Over Time**
4. Project future revenue based on trends

---

## 🔍 Reading the Charts

### Line Charts
- X-axis: Time period (months)
- Y-axis: Value (revenue, LTV, etc.)
- Hover over points for exact values
- Look for upward/downward trends

### Bar Charts
- Compare values across categories
- Hover for exact numbers
- Stacked bars show composition

### Pie Charts
- Show percentage distribution
- Hover for exact counts and percentages
- Useful for demographic breakdowns

### Heatmap
- Each cell = one day/hour combination
- Color intensity = number of sessions
- Hover to see exact session count
- White/light = low activity, dark green = high activity

### Cohort Table
- Each row = one signup month
- Columns = months after signup
- Values = % of original cohort still active
- Color coding helps identify strong/weak cohorts

---

## 💡 Tips & Best Practices

### Data Interpretation
- Compare current month to previous months
- Look for patterns across multiple metrics
- Consider seasonal variations
- Don't rely on single data point

### Regular Review
- Check dashboard weekly for trends
- Monthly deep-dive for planning
- Quarterly for strategic decisions

### Taking Action
- Low completion rate → Review booking/cancellation process
- High churn rate → Improve customer engagement
- Peak usage patterns → Optimize teacher schedules
- Poor cohort retention → Investigate onboarding process

---

## ⚡ Performance Tips

### If Dashboard Loads Slowly
1. Check network tab in browser DevTools
2. Identify slow API endpoints
3. Consider reducing date ranges
4. Check database has indexes

### If Charts Don't Display
1. Open browser console (F12)
2. Look for JavaScript errors
3. Check API responses in Network tab
4. Verify admin authentication

---

## 📱 Mobile Access

The dashboard is responsive and works on tablets and mobile devices:
- Cards stack vertically on small screens
- Charts remain interactive
- Touch-friendly tooltips
- Scrollable tables

---

## 🔄 Refreshing Data

Currently, data refreshes on page load only:
1. Click browser refresh button, or
2. Press F5, or
3. Navigate away and back to dashboard

*Note: Auto-refresh feature planned for future*

---

## 📈 What to Monitor

### Daily
- New bookings vs cancellations
- Session completion rate

### Weekly
- Active customer count
- Revenue trends
- Peak usage patterns

### Monthly
- Total revenue vs last month
- Churn rate
- New vs returning customers
- Cohort retention rates

### Quarterly
- Overall revenue growth
- Customer lifetime value trends
- Marketing ROI (when implemented)
- Strategic planning metrics

---

## ❓ FAQ

**Q: Why is Marketing section showing placeholder data?**
A: Marketing attribution tracking hasn't been implemented yet. Real data will be available once UTM tracking and referral systems are in place.

**Q: How is churn rate calculated?**
A: Customers who haven't made a booking in the last 3 months are considered churned.

**Q: What does ARPU mean?**
A: Average Revenue Per User - total lifetime revenue divided by total customers.

**Q: Why do recent cohorts show 0% retention?**
A: If a cohort is very recent (less than a month old), there may not be enough data to calculate retention for future months.

**Q: Can I export this data?**
A: Export functionality is planned but not yet implemented.

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Dashboard blank | Check browser console for errors, verify API is running |
| No data in charts | Ensure database has sample data, check date ranges |
| Charts not responsive | Try refreshing page, check screen size |
| Slow loading | Check network, reduce date ranges, verify database performance |
| Authentication error | Re-login as admin user |

---

## 📞 Next Steps

After reviewing the dashboard:
1. Identify areas needing attention
2. Take action based on insights
3. Monitor changes in next review
4. Adjust strategies accordingly

For detailed documentation, see:
- `ANALYTICS_DASHBOARD.md` - Comprehensive technical documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details and architecture
