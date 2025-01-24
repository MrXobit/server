const admin = require('firebase-admin');

async function getUidFromToken(req) {
  const token = req.headers['authorization']?.split('Bearer ')[1];
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

module.exports = { getUidFromToken };
