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
    // console.log(idToken)  
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    try {
        global.sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
        // console.log(global.sessionCookie)

        // Set cookie options
        const options = {
            maxAge: expiresIn, // Session expiration time
            httpOnly: true, // The cookie is not accessible via JavaScript
            secure: process.env.NODE_ENV === 'production', // Set to true in production (HTTPS only)
            domain: 'localhost', // Set domain to 'localhost' for local testing
            sameSite: 'None' // Required to allow cross-domain cookies  
        };
        res.cookie('session', global.sessionCookie, options);
        console.log()
        res.status(200).json({ success: true, message: 'Session cookie created successfully' });
        
    } catch (error) {
        console.error('Error creating session cookie:', error);
        res.status(401).send('Unauthorized request');
    }
};


const bucket = admin.storage().bucket();

const getSessionCookie = async (req, res) => {
    try {
        const session =  global.sessionCookie;// Read the session cookie from request headers
        if(session === 0 || !session ){
            return res.status(200).json({
                success: false,
            });
        } 
       else {
        const decodedClaims = await admin.auth().verifySessionCookie(session, true);
        const uid = decodedClaims.uid; 
        const userRef = admin.database().ref('usersData/' + uid);
        const snapshot = await userRef.once('value');

        if (!snapshot.exists()) {
            console.log(`No user data found for UID ${uid}`);
            return res.status(404).json({ success: false, message: 'User data not found' });
        }

        const userData = snapshot.val();
        const email = userData.email;
        const firstName = userData.firstName;

        const fileName = `profilePictures/${uid}/cropped-profile.jpg`;  // Construct the file path


        let publicUrl = "";
        if (!fileName) {
             publicUrl = "https://firebasestorage.googleapis.com/v0/b/testing-f9c8c.appspot.com/o/profileImg.jpg?alt=media&token=f110f91a-bbf8-422f-be2d-a0223ee319ef";
        }
        else{

            const encodedFilePath = encodeURIComponent(fileName);
             publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedFilePath}?alt=media`;
        }
        
        // Return the public URL and user data as part of the response to be accessed by the client
        return res.status(200).json({
            success: true,
            profilePicURL: publicUrl,
            email: email,
            firstName: firstName,
            session:session,
        });
    }
 
    } catch (err) {
        console.error('Error fetching user data or image:', err);
        return res.status(500).json({ success: false, message: 'Error fetching user data or image' });
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
        // console.log(decodedToken); // Log for debugging

        // Send back user info
        res.status(200).json({ uid: decodedToken.uid, email: decodedToken.email });
    } catch (error) {
        console.error('Error verifying token:', error); // Log the error
        res.status(401).json({ error: 'Invalid token' });
    }
};

const clearSessionCookie = async (req, res) => {
    try {
        const { clearSession } = req.body;

        if (clearSession) {
            global.sessionCookie = null;
            console.log("SEssion cookiesss:", global.sessionCookie)
        }
    } catch (err) {
        console.error('Error clearing session cookie:', err);
    }
};

module.exports = {
    createOrder,
    sendPaymentEmail,
    createSessionCookie,
    getSessionCookie,
    clearSessionCookie,
    verifyToken, // Don't forget to export this function
};