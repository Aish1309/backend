const admin = require('firebase-admin');

const serviceAccount = require('./config/serviceAccountKey.json')

// Initialize Firebase Admin SDK
// Make sure you either use `applicationDefault()` or provide your service account key file
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount), // or specify the path to the service account key JSON file
  projectId:'trafyai-loginsignup',
  databaseURL: 'https://trafyai-loginsignup-default-rtdb.firebaseio.com/',
  storageBucket: 'trafyai-loginsignup.appspot.com' 
});

module.exports =
  admin;
  // getAuth: admin.auth,
  // getStorage: admin.storage,
  // database: admin.database(),
