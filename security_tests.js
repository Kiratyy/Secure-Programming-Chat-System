import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000'; // Replace with your application URL

async function runTests() {
    console.log('Starting security tests...');

    // XSS tests
    await testXSS();

    // SQL Injection tests
    await testSQLInjection();

    console.log('Security tests completed.');
}

async function testXSS() {
    console.log('\nTesting XSS vulnerabilities:');

    const xssPayloads = [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg/onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '&lt;script&gt;alert("XSS")&lt;/script&gt;',
        '<scr<script>ipt>alert("XSS")</scr</script>ipt>',
        '"><s"%2b"cript>alert(document.cookie)</script>',
        '&#x3C;script&#x3E;alert(&#x27;XSS&#x27;)&#x3C;/script&#x3E;',
        '`<img/src/onerror=alert("XSS")>`',
        '<a href="javascript:alert(\'XSS\')">Click me</a>',
        '<iframe src="javascript:alert(`XSS`)"></iframe>'
    ];

    for (const payload of xssPayloads) {
        // Test registration
        const registerResponse = await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: payload, password: 'test123' })
        });
        console.log(`XSS test (Register) with payload "${payload}": ${registerResponse.ok ? 'Potentially vulnerable' : 'Passed'}`);

        // Test login
        const loginResponse = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: payload, password: 'test123' })
        });
        console.log(`XSS test (Login) with payload "${payload}": ${loginResponse.ok ? 'Potentially vulnerable' : 'Passed'}`);

        // Additional XSS tests can be added here, such as testing message sending functionality
    }
}

async function testSQLInjection() {
    console.log('\nTesting SQL Injection vulnerabilities:');

    const sqlInjectionPayloads = [
        "' OR '1'='1",
        "admin'--",
        "1'; DROP TABLE users; --",
        "1' UNION SELECT username, password FROM users--",
        "1' ; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --"
    ];

    for (const payload of sqlInjectionPayloads) {
        // Test login
        const loginResponse = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: payload, password: payload })
        });
        console.log(`SQL Injection test (Login) with payload "${payload}": ${loginResponse.ok ? 'Potentially vulnerable' : 'Passed'}`);

        // Additional SQL injection tests can be added here
    }
}

runTests().catch(console.error);
