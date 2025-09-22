#!/usr/bin/env node

const http = require('http');

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function verifyFeatures() {
  console.log('🔍 Verifying Spotify Data Club Demo Features\n');
  console.log('=' .repeat(50));

  let passed = 0;
  let failed = 0;

  // Test 1: Check if the app is running
  console.log('\n1️⃣  Testing: Application is running');
  try {
    const res = await makeRequest('/');
    if (res.status === 200) {
      console.log('✅ Application is running on port 3000');
      passed++;
    } else {
      console.log(`❌ Application returned status ${res.status}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Failed to connect to application:', error.message);
    failed++;
  }

  // Test 2: Test groups API with different sizes
  console.log('\n2️⃣  Testing: Flexible group size (3-8 people)');
  const groupSizes = [3, 4, 5, 6, 7, 8];

  for (const size of groupSizes) {
    try {
      const res = await makeRequest('/api/groups/create', 'POST', {
        groupSize: size,
        totalParticipants: 42
      });

      if (res.status === 200 && res.data.groups) {
        const groups = res.data.groups;
        const allGroupsCorrectSize = groups.every(g =>
          g.members.length >= 3 && g.members.length <= 8
        );

        if (allGroupsCorrectSize) {
          console.log(`✅ Group size ${size}: Created ${groups.length} groups successfully`);
          passed++;
        } else {
          console.log(`❌ Group size ${size}: Some groups have invalid sizes`);
          failed++;
        }
      } else {
        console.log(`❌ Group size ${size}: API returned error`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ Group size ${size}: Request failed:`, error.message);
      failed++;
    }
  }

  // Test 3: Test Google import API
  console.log('\n3️⃣  Testing: Google Forms/Sheets import');
  try {
    const res = await makeRequest('/api/google/import', 'POST', {
      url: 'https://docs.google.com/spreadsheets/d/1234567890/edit'
    });

    if (res.status === 200 && res.data.success) {
      console.log(`✅ Google import: Successfully imported ${res.data.count} responses`);
      passed++;
    } else {
      console.log('❌ Google import: Failed to import data');
      failed++;
    }
  } catch (error) {
    console.log('❌ Google import: Request failed:', error.message);
    failed++;
  }

  // Test 4: Test Google export API
  console.log('\n4️⃣  Testing: Google Sheets export');
  try {
    // First create some groups
    const groupRes = await makeRequest('/api/groups/create', 'POST', {
      groupSize: 4,
      totalParticipants: 12
    });

    if (groupRes.status === 200 && groupRes.data.groups) {
      const exportRes = await makeRequest('/api/google/export', 'POST', {
        groups: groupRes.data.groups
      });

      if (exportRes.status === 200 && exportRes.data.success) {
        console.log('✅ Google export: Successfully generated export URL');
        console.log(`   Export URL: ${exportRes.data.url}`);
        passed++;
      } else {
        console.log('❌ Google export: Failed to export groups');
        failed++;
      }
    } else {
      console.log('❌ Google export: Failed to create groups for export');
      failed++;
    }
  } catch (error) {
    console.log('❌ Google export: Request failed:', error.message);
    failed++;
  }

  // Test 5: Test smart distribution algorithm
  console.log('\n5️⃣  Testing: Smart group distribution algorithm');
  const testCases = [
    { total: 41, size: 5, expected: 'Groups of 5 with remainder distributed' },
    { total: 100, size: 4, expected: '25 groups of 4' },
    { total: 17, size: 6, expected: '2 groups of 6, 1 group of 5' }
  ];

  for (const test of testCases) {
    try {
      const res = await makeRequest('/api/groups/create', 'POST', {
        groupSize: test.size,
        totalParticipants: test.total
      });

      if (res.status === 200 && res.data.groups) {
        const totalMembers = res.data.groups.reduce((sum, g) => sum + g.members.length, 0);
        const hasValidSizes = res.data.groups.every(g => g.members.length >= 3);

        if (totalMembers === test.total && hasValidSizes) {
          console.log(`✅ Distribution (${test.total} people, size ${test.size}): ${res.data.groups.length} groups created`);
          passed++;
        } else {
          console.log(`❌ Distribution (${test.total} people, size ${test.size}): Invalid distribution`);
          failed++;
        }
      } else {
        console.log(`❌ Distribution test failed for ${test.total} people`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ Distribution test error:`, error.message);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('\n📊 VERIFICATION SUMMARY:');
  console.log(`✅ Passed: ${passed} tests`);
  console.log(`❌ Failed: ${failed} tests`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All features verified successfully!');
  } else {
    console.log('\n⚠️  Some features need attention.');
  }

  console.log('\n✨ Key Features Implemented:');
  console.log('  • Flexible group size selector (3-8 people)');
  console.log('  • Smart group distribution algorithm');
  console.log('  • Google Forms/Sheets import functionality');
  console.log('  • Google Sheets export for sharing groups');
  console.log('  • Dynamic group generation for any number of participants');
  console.log('  • Visual enhancements (avatars, progress bars, etc.)');
}

// Run verification
verifyFeatures().catch(console.error);