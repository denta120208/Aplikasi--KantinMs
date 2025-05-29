const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint untuk check payment status
app.get('/api/check-payment-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const serverKey = process.env.MIDTRANS_SERVER_KEY; // Fixed: Use proper env variable name
    
    if (!serverKey) {
      return res.status(500).json({ error: 'Server key not configured' });
    }
    
    // Encode server key untuk Basic Auth
    const encodedServerKey = Buffer.from(serverKey + ':').toString('base64');
    
    // URL Midtrans API
    const midtransUrl = process.env.NODE_ENV === 'production' 
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;
    
    // Call Midtrans API
    const response = await axios.get(midtransUrl, {
      headers: {
        'Authorization': `Basic ${encodedServerKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Error checking payment status:', error.response?.data || error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data || 'Payment status check failed'
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});