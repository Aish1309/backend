const Razorpay = require('razorpay');
const nodemailer = require('nodemailer');
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY, GMAIL_USER, GMAIL_PASS } = process.env;

const admin = require('../firebaseAdmin');


const razorpayInstance = new Razorpay({
    key_id: RAZORPAY_ID_KEY,
    key_secret: RAZORPAY_SECRET_KEY
});

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Replace with your SMTP host
    port: 465, // Common port for SMTP with STARTTLS
    secure: true, // Set to true for port 465 (SSL), or false for port 587 (STARTTLS)
    auth: {
        user: 'info@trafyai.com', // Your custom email address
        pass: 'ifcy tffc tbai kgtx' // Your email password
    }
});
console.log('Razorpay Key:', process.env.RAZORPAY_ID_KEY);


const createOrder = async (req, res) => {
    try {
        const { amount, name, description, type } = req.body;

        // Define the receipt prefix based on the type of payment (MasterClass or Course)
        const receiptPrefix = type === "masterclass" ? "MC" : "COURSE";

        // Prepare Razorpay order options
        const options = {
            amount: amount * 100, // Razorpay requires the amount in paise (1 INR = 100 paise)
            currency: 'INR',
            receipt: `${receiptPrefix}_${Math.floor(Math.random() * 100000)}`, // Unique receipt ID
            payment_capture: 1 // Auto-capture payments after successful payment
        };

        // Create the Razorpay order
        razorpayInstance.orders.create(options, (err, order) => {
            if (!err) {
                res.status(200).json({
                    success: true,
                    order_id: order.id,
                    amount: amount * 100, // Amount in paise
                    key_id: RAZORPAY_ID_KEY,
                    product_name: name,
                    description: description,
                    type: type // Send the type back to the frontend for confirmation
                });
            } else {
                res.status(400).json({ success: false, msg: 'Something went wrong!' });
            }
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
};

const sendEmailNotification = async (email, subject, message) => {
    try {
        await transporter.sendMail({
            from: "info@trafyai.com",
            to: email,
            subject: subject,
            text: message
        });
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// Controller function to handle sending email after payment
const sendPaymentEmail = async (req, res) => {
    try {
        const { email, paymentStatus } = req.body;
        

        let subject, message;

        if (paymentStatus === 'success') {
            subject = 'Payment Successful';
            message = 'Payment is collected. Thanks for submitting the form, we will reach out to you soon.';
        } else {
            subject = 'Payment Failed';
            message = 'Unfortunately, the payment failed. Please try again.';
        }

        // Send the email
        await sendEmailNotification(email, subject, message);

        res.status(200).json({ success: true, msg: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, msg: 'Failed to send email' });
    }
};


const createSessionCookie = async (req, res) => {
    const { idToken } = req.body;
    console.log(idToken)  
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    try {
        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

        // Set cookie options
        const options = {
            maxAge: expiresIn, // Session expiration time
            httpOnly: true, // The cookie is not accessible via JavaScript
            secure: false, // Set to true in production (HTTPS only), false for local development
            domain: 'localhost', // Set domain to 'localhost' for local testing
            sameSite: 'None' // Required to allow cross-domain cookies  
        };

        res.cookie('session', sessionCookie, options);
        res.status(200).json({ success: true, message: 'Session cookie created successfully' });
    } catch (error) {
        console.error('Error creating session cookie:', error);
        res.status(401).send('Unauthorized request');
    }
};

const verifyToken = async (req, res) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        // Verify the ID token
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log(decodedToken); // Log for debugging

        // Send back user info
        res.status(200).json({ uid: decodedToken.uid, email: decodedToken.email });
    } catch (error) {
        console.error('Error verifying token:', error); // Log the error
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = {
    createOrder,
    sendPaymentEmail,
    createSessionCookie,
    verifyToken, // Don't forget to export this function
};