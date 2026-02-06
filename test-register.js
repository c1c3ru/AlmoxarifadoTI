
// Native fetch is available in Node 18+

async function testRegister() {
    try {
        console.log('=== Testing User Registration ===');

        const randomId = Math.floor(Math.random() * 1000000);
        const payload = {
            username: `testuser${randomId}@example.com`,
            email: `testuser${randomId}@example.com`,
            matricula: `${randomId}`,
            password: "Password123!",
            name: "Test User",
            role: "tech",
            isActive: true
        };

        console.log('Registering user:', payload.username);

        const response = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response body:', result);

        if (response.ok) {
            console.log('✅ Registration successful!');
        } else {
            console.error('❌ Registration failed.');
        }

    } catch (error) {
        console.error('Test error:', error);
    }
}

testRegister();
