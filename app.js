require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');  // To parse cookies
const app = express();
var http = require('http').Server(app);

const paymentRoute = require('./routes/paymentRoute');

// Firebase Admin
const admin = require('./firebaseAdmin');

// Use CORS to allow requests from your frontend
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001','https://trafywebsite-backend-865611889264.us-central1.run.app', 'https://trafyai.com'], // Allow both local and GCP origins
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true, // Allow credentials (cookies)
}));

app.use(cookieParser());  // Parse cookies
app.use(express.json());  // To parse JSON bodies
app.use('/api', paymentRoute);

// Middleware to verify session cookies
app.use(async (req, res, next) => {
    const sessionCookie = req.cookies.session || ''; // Get session cookie
    try {
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
        req.user = decodedClaims;  // Attach user information to request
        next();
    } catch (error) {
        res.status(401).send('Unauthorized');
    }
});

http.listen(5000, function(){
    console.log('Server is running on port 5000');
});
