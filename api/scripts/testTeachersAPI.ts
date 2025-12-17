import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function testTeachersAPI() {
  try {
    console.log('Testing GET /api/teachers endpoint...\n');

    const response = await axios.get(`${API_URL}/teachers`);

    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.data.teachers) {
      console.log('\nNumber of teachers:', response.data.teachers.length);
    }
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testTeachersAPI();
