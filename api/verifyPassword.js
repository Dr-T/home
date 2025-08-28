// api/verifyPassword.js
// Vercel Serverless Function to verify a password against an environment variable.

export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { GROUP_PASSWORD } = process.env;

  if (!GROUP_PASSWORD) {
    return response.status(500).json({ error: 'Server configuration error. Missing GROUP_PASSWORD environment variable.' });
  }

  try {
    const { password } = request.body;

    if (!password) {
      return response.status(400).json({ error: 'Password is required.' });
    }

    if (password === GROUP_PASSWORD) {
      return response.status(200).json({ success: true, message: 'Password verified.' });
    } else {
      return response.status(401).json({ success: false, error: 'Invalid password.' });
    }

  } catch (error) {
    console.error('Error in password verification:', error);
    return response.status(500).json({ error: 'An internal server error occurred.' });
  }
}