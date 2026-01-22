// Native fetch is available in Node 18+

async function testPasswordReset() {
  try {
    console.log('=== Testing Password Recovery ===');

    // Step 1: Request password recovery
    const recoveryResponse = await fetch('http://localhost:5000/api/password-recovery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernameOrEmail: 'cicerosilva.ifce@gmail.com'
      })
    });

    const recoveryResult = await recoveryResponse.json();
    console.log('Recovery response:', recoveryResult);

    if (recoveryResponse.ok) {
      console.log('\n=== Waiting 2 seconds then testing password reset ===');

      // Wait a bit for the email to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Try to reset password with a test code
      const resetResponse = await fetch('http://localhost:5000/api/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'cti.maracanau@ifce.edu.br',
          code: '123456', // Test code
          newPassword: 'newPassword123'
        })
      });

      const resetResult = await resetResponse.json();
      console.log('Reset response:', resetResult);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testPasswordReset();
