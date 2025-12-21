import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function testAnalyticsEndpoints() {
  console.log('🧪 Testing Analytics Endpoints...\n');

  // First, login as admin to get token
  let token: string;
  try {
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@corestudio.com',
      password: 'admin123',
    });
    token = loginResponse.data.token;
    console.log('✅ Admin login successful\n');
  } catch (error: any) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const endpoints = [
    { name: 'Executive Overview', path: '/admin/analytics/executive-overview' },
    { name: 'Revenue Operations', path: '/admin/analytics/revenue-operations' },
    { name: 'Customer Intelligence', path: '/admin/analytics/customer-intelligence' },
    { name: 'Marketing Performance', path: '/admin/analytics/marketing-performance' },
    { name: 'Retention Insights', path: '/admin/analytics/retention-insights' },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_URL}${endpoint.path}`, { headers });
      console.log(`✅ ${endpoint.name}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Data keys: ${Object.keys(response.data).join(', ')}`);

      // Show sample data structure
      if (endpoint.name === 'Executive Overview') {
        console.log(`   Sample: totalRevenue=${response.data.totalRevenue}, activeCustomers=${response.data.activeCustomers}`);
      } else if (endpoint.name === 'Retention Insights') {
        console.log(`   Cohorts count: ${response.data.cohorts?.length || 0}`);
        console.log(`   Peak usage data points: ${response.data.peakUsage?.length || 0}`);
      }
      console.log('');
    } catch (error: any) {
      console.error(`❌ ${endpoint.name}`);
      console.error(`   Error: ${error.response?.data?.error || error.message}`);
      console.error('');
    }
  }

  console.log('✅ All analytics endpoints tested!');
}

testAnalyticsEndpoints().catch(console.error);
