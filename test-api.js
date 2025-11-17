/**
 * Comprehensive API Testing Script
 * Tests all endpoints in the Mutual Funds Backend API
 */

// Import fetch for Node.js < 18
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BASE_URL = 'http://localhost:3002';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
};

let testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

let authToken = null;
let refreshToken = null;
let testUserId = null;
let fundId = null;

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null, useAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (useAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      success: response.ok,
      status: response.status,
      data,
      response,
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message,
    };
  }
}

// Test result logging
function logTest(name, passed, details = '') {
  const icon = passed ? '✓' : '✗';
  const color = passed ? colors.green : colors.red;
  console.log(`${color}${icon} ${name}${colors.reset}`);
  if (details) {
    console.log(`  ${colors.gray}${details}${colors.reset}`);
  }

  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

function logSection(title) {
  console.log(
    `\n${colors.blue}═══════════════════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(
    `${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`
  );
}

// Test Functions
async function testHealthEndpoint() {
  logSection('Testing Health & Basic Endpoints');

  const result = await apiCall('/health');
  logTest(
    'GET /health',
    result.success && result.data.status === 'OK',
    result.success ? `Status: ${result.data.status}` : `Error: ${result.status}`
  );

  const testResult = await apiCall('/api/test');
  logTest(
    'GET /api/test',
    testResult.success && testResult.data.message === 'API is working!',
    testResult.success ? testResult.data.message : `Error: ${testResult.status}`
  );
}

async function testAuthEndpoints() {
  logSection('Testing Authentication Endpoints');

  const timestamp = Date.now();
  const testEmail = `test${timestamp}@example.com`;
  const testPassword = 'Test@123456';

  // Test Registration
  const registerResult = await apiCall('/api/auth/register', 'POST', {
    email: testEmail,
    password: testPassword,
    name: 'Test User',
  });

  logTest(
    'POST /api/auth/register',
    registerResult.success,
    registerResult.success
      ? `User registered: ${registerResult.data.user?.email}`
      : `Error: ${registerResult.data?.error || registerResult.status}`
  );

  if (registerResult.success) {
    authToken = registerResult.data.accessToken;
    refreshToken = registerResult.data.refreshToken;
    testUserId = registerResult.data.user.id;
  }

  // Test Login
  const loginResult = await apiCall('/api/auth/login', 'POST', {
    email: testEmail,
    password: testPassword,
  });

  logTest(
    'POST /api/auth/login',
    loginResult.success,
    loginResult.success
      ? `Logged in: ${loginResult.data.user?.email}`
      : `Error: ${loginResult.data?.error || loginResult.status}`
  );

  if (loginResult.success) {
    authToken = loginResult.data.accessToken;
    refreshToken = loginResult.data.refreshToken;
  }

  // Test Login with invalid credentials
  const invalidLoginResult = await apiCall('/api/auth/login', 'POST', {
    email: testEmail,
    password: 'wrongpassword',
  });

  logTest(
    'POST /api/auth/login (invalid credentials)',
    !invalidLoginResult.success && invalidLoginResult.status === 401,
    !invalidLoginResult.success
      ? 'Correctly rejected invalid credentials'
      : 'Should have failed'
  );

  // Test Refresh Token
  if (refreshToken) {
    const refreshResult = await apiCall('/api/auth/refresh', 'POST', {
      refreshToken: refreshToken,
    });

    logTest(
      'POST /api/auth/refresh',
      refreshResult.success,
      refreshResult.success
        ? 'Token refreshed successfully'
        : `Error: ${refreshResult.data?.error || refreshResult.status}`
    );

    if (refreshResult.success) {
      authToken = refreshResult.data.accessToken;
    }
  }

  // Test Google OAuth redirect
  const googleResult = await apiCall('/api/auth/google', 'GET');
  logTest(
    'GET /api/auth/google',
    googleResult.status === 302 || googleResult.status === 200,
    `Status: ${googleResult.status} (redirect expected)`
  );
}

async function testFundsEndpoints() {
  logSection('Testing Funds Endpoints');

  // Test Get All Funds
  const fundsResult = await apiCall('/api/funds?page=1&limit=10');
  logTest(
    'GET /api/funds',
    fundsResult.success && Array.isArray(fundsResult.data.data),
    fundsResult.success
      ? `Found ${fundsResult.data.data?.length || 0} funds, Total: ${fundsResult.data.pagination?.total || 0}`
      : `Error: ${fundsResult.status}`
  );

  if (fundsResult.success && fundsResult.data.data?.length > 0) {
    fundId = fundsResult.data.data[0].id;
  }

  // Test Search Funds
  const searchResult = await apiCall('/api/funds?search=SBI&page=1&limit=5');
  logTest(
    'GET /api/funds?search=SBI',
    searchResult.success,
    searchResult.success
      ? `Found ${searchResult.data.data?.length || 0} funds matching "SBI"`
      : `Error: ${searchResult.status}`
  );

  // Test Filter by Category
  const categoryResult = await apiCall(
    '/api/funds?category=Equity&page=1&limit=5'
  );
  logTest(
    'GET /api/funds?category=Equity',
    categoryResult.success,
    categoryResult.success
      ? `Found ${categoryResult.data.data?.length || 0} equity funds`
      : `Error: ${categoryResult.status}`
  );

  // Test Get Fund by ID
  if (fundId) {
    const fundByIdResult = await apiCall(`/api/funds/${fundId}`);
    logTest(
      `GET /api/funds/:id`,
      fundByIdResult.success,
      fundByIdResult.success
        ? `Fund: ${fundByIdResult.data.fund?.name || 'N/A'}`
        : `Error: ${fundByIdResult.status}`
    );

    // Test Get Fund NAVs
    const navsResult = await apiCall(`/api/funds/${fundId}/navs?limit=10`);
    logTest(
      `GET /api/funds/:id/navs`,
      navsResult.success,
      navsResult.success
        ? `Found ${navsResult.data.navs?.length || 0} NAV records`
        : `Error: ${navsResult.status}`
    );
  } else {
    logTest('GET /api/funds/:id', false, 'Skipped: No fund ID available');
    logTest('GET /api/funds/:id/navs', false, 'Skipped: No fund ID available');
  }

  // Test Invalid Fund ID
  const invalidFundResult = await apiCall('/api/funds/999999999');
  logTest(
    'GET /api/funds/:id (invalid ID)',
    invalidFundResult.status === 404,
    invalidFundResult.status === 404
      ? 'Correctly returns 404 for invalid ID'
      : `Unexpected status: ${invalidFundResult.status}`
  );
}

async function testUsersEndpoints() {
  logSection('Testing Users Endpoints (Authenticated)');

  if (!authToken) {
    logTest('GET /api/users/me', false, 'Skipped: No auth token available');
    logTest('PUT /api/users/me', false, 'Skipped: No auth token available');
    return;
  }

  // Test Get Current User
  const meResult = await apiCall('/api/users/me', 'GET', null, true);
  logTest(
    'GET /api/users/me',
    meResult.success,
    meResult.success
      ? `User: ${meResult.data.user?.email || 'N/A'}`
      : `Error: ${meResult.data?.error || meResult.status}`
  );

  // Test Update Current User
  const updateResult = await apiCall(
    '/api/users/me',
    'PUT',
    {
      name: 'Updated Test User',
      preferences: {
        theme: 'dark',
        notifications: true,
      },
    },
    true
  );

  logTest(
    'PUT /api/users/me',
    updateResult.success,
    updateResult.success
      ? `Updated user: ${updateResult.data.user?.name || 'N/A'}`
      : `Error: ${updateResult.data?.error || updateResult.status}`
  );

  // Test Unauthorized Access
  const unauthorizedResult = await apiCall('/api/users/me', 'GET', null, false);
  logTest(
    'GET /api/users/me (without auth)',
    unauthorizedResult.status === 401,
    unauthorizedResult.status === 401
      ? 'Correctly requires authentication'
      : `Unexpected status: ${unauthorizedResult.status}`
  );
}

async function testWatchlistEndpoints() {
  logSection('Testing Watchlist Endpoints (Authenticated)');

  if (!authToken) {
    logTest('POST /api/watchlist', false, 'Skipped: No auth token available');
    logTest('GET /api/watchlist', false, 'Skipped: No auth token available');
    logTest(
      'DELETE /api/watchlist/:id',
      false,
      'Skipped: No auth token available'
    );
    return;
  }

  if (!fundId) {
    logTest('POST /api/watchlist', false, 'Skipped: No fund ID available');
    logTest('GET /api/watchlist', false, 'Skipped: No fund ID available');
    logTest(
      'DELETE /api/watchlist/:id',
      false,
      'Skipped: No fund ID available'
    );
    return;
  }

  // Test Add to Watchlist
  const addResult = await apiCall(
    '/api/watchlist',
    'POST',
    {
      fundId: fundId,
    },
    true
  );

  logTest(
    'POST /api/watchlist',
    addResult.success,
    addResult.success
      ? 'Fund added to watchlist'
      : `Error: ${addResult.data?.error || addResult.status}`
  );

  let watchlistItemId = null;
  if (addResult.success && addResult.data.watchlistItem) {
    watchlistItemId = addResult.data.watchlistItem.id;
  }

  // Test Get Watchlist
  const getResult = await apiCall('/api/watchlist', 'GET', null, true);
  logTest(
    'GET /api/watchlist',
    getResult.success,
    getResult.success
      ? `Watchlist has ${getResult.data.watchlist?.length || 0} items`
      : `Error: ${getResult.data?.error || getResult.status}`
  );

  // Test Remove from Watchlist
  if (watchlistItemId) {
    const removeResult = await apiCall(
      `/api/watchlist/${watchlistItemId}`,
      'DELETE',
      null,
      true
    );
    logTest(
      'DELETE /api/watchlist/:id',
      removeResult.success,
      removeResult.success
        ? 'Fund removed from watchlist'
        : `Error: ${removeResult.data?.error || removeResult.status}`
    );
  } else {
    logTest(
      'DELETE /api/watchlist/:id',
      false,
      'Skipped: No watchlist item ID'
    );
  }
}

async function testAlertsEndpoints() {
  logSection('Testing Alerts Endpoints (Authenticated)');

  if (!authToken) {
    logTest('POST /api/alerts', false, 'Skipped: No auth token available');
    logTest('GET /api/alerts', false, 'Skipped: No auth token available');
    return;
  }

  if (!fundId) {
    logTest('POST /api/alerts', false, 'Skipped: No fund ID available');
    logTest('GET /api/alerts', false, 'Skipped: No fund ID available');
    return;
  }

  // Test Create Alert
  const createResult = await apiCall(
    '/api/alerts',
    'POST',
    {
      fundId: fundId,
      type: 'NAV_THRESHOLD',
      threshold: 100,
      condition: 'ABOVE',
    },
    true
  );

  logTest(
    'POST /api/alerts',
    createResult.success,
    createResult.success
      ? 'Alert created successfully'
      : `Error: ${createResult.data?.error || createResult.status}`
  );

  // Test Get Alerts
  const getResult = await apiCall('/api/alerts', 'GET', null, true);
  logTest(
    'GET /api/alerts',
    getResult.success,
    getResult.success
      ? `User has ${getResult.data.alerts?.length || 0} alerts`
      : `Error: ${getResult.data?.error || getResult.status}`
  );
}

async function testErrorHandling() {
  logSection('Testing Error Handling & Edge Cases');

  // Test 404 for non-existent route
  const notFoundResult = await apiCall('/api/nonexistent');
  logTest(
    'GET /api/nonexistent (404 test)',
    notFoundResult.status === 404,
    notFoundResult.status === 404
      ? 'Correctly returns 404'
      : `Unexpected status: ${notFoundResult.status}`
  );

  // Test malformed JSON
  const malformedResult = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid json',
  })
    .then((r) => ({ status: r.status, ok: r.ok }))
    .catch((e) => ({ status: 0 }));

  logTest(
    'POST with malformed JSON',
    malformedResult.status === 400 || malformedResult.status === 500,
    `Status: ${malformedResult.status} (error expected)`
  );

  // Test missing required fields
  const missingFieldsResult = await apiCall('/api/auth/register', 'POST', {
    email: 'test@example.com',
    // missing password and name
  });

  logTest(
    'POST /api/auth/register (missing fields)',
    !missingFieldsResult.success,
    !missingFieldsResult.success
      ? 'Correctly rejects incomplete data'
      : 'Should have failed validation'
  );
}

// Print Summary
function printSummary() {
  logSection('Test Summary');

  const total = testResults.passed + testResults.failed;
  const passRate =
    total > 0 ? ((testResults.passed / total) * 100).toFixed(2) : 0;

  console.log(`Total Tests: ${total}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`Pass Rate: ${passRate}%\n`);

  if (testResults.failed > 0) {
    console.log(`${colors.yellow}Failed Tests:${colors.reset}`);
    testResults.tests
      .filter((t) => !t.passed)
      .forEach((t) => {
        console.log(`  ${colors.red}✗ ${t.name}${colors.reset}`);
        if (t.details) {
          console.log(`    ${colors.gray}${t.details}${colors.reset}`);
        }
      });
  }

  console.log(
    `\n${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`
  );
}

// Main Test Runner
async function runAllTests() {
  console.log(`${colors.blue}
╔═══════════════════════════════════════════════╗
║   Mutual Funds API - Comprehensive Testing   ║
║              Server: ${BASE_URL}        ║
╚═══════════════════════════════════════════════╝
${colors.reset}`);

  try {
    await testHealthEndpoint();
    await testAuthEndpoints();
    await testFundsEndpoints();
    await testUsersEndpoints();
    await testWatchlistEndpoints();
    await testAlertsEndpoints();
    await testErrorHandling();

    printSummary();

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(`${colors.red}Fatal Error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
