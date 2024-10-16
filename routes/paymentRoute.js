const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Payment routes
router.post('/createOrder', paymentController.createOrder);
router.post('/sendPaymentEmail', paymentController.sendPaymentEmail);
router.post('/createSessionCookie', paymentController.createSessionCookie); 

router.get('/verifyToken', paymentController.verifyToken); 


module.exports = router;
