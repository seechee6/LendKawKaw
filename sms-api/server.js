const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import the Twilio client
const twilioClient = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID || 'ACe7c2cb76127508388c117a4cab29cbd8',
  process.env.TWILIO_AUTH_TOKEN || '52bfa462d0b91e9c0e3bbab2cbffb91a'
);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Root route
app.get('/', (req, res) => {
  res.send('SMS API is running');
});

// SMS sending endpoint
app.post('/api/send-sms', async (req, res) => {
  try {
    const { to, message, from } = req.body;
    
    // Validate input
    if (!to || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message are required' 
      });
    }
    
    // Use the configured phone number if one isn't provided
    const fromNumber = from || process.env.TWILIO_PHONE_NUMBER || '+18285768297';
    
    // Log the SMS details
    console.log(`Sending SMS to ${to} from ${fromNumber}: ${message}`);
    
    // Send the SMS using Twilio
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });
    
    // Return success response
    res.status(200).json({
      success: true,
      sid: result.sid,
      message: 'SMS sent successfully',
      details: {
        to,
        from: fromNumber,
        status: result.status,
        dateCreated: result.dateCreated
      }
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Return error response
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send SMS',
      details: error
    });
  }
});

// Batch SMS sending endpoint
app.post('/api/send-batch-sms', async (req, res) => {
  try {
    const { messages } = req.body;
    
    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Array of messages is required' 
      });
    }
    
    // Default from number
    const defaultFromNumber = process.env.TWILIO_PHONE_NUMBER || '+18285768297';
    
    // Send all messages and collect results
    const results = await Promise.all(
      messages.map(async (msg) => {
        try {
          if (!msg.to || !msg.message) {
            return {
              success: false,
              to: msg.to,
              error: 'Phone number and message are required'
            };
          }
          
          const result = await twilioClient.messages.create({
            body: msg.message,
            from: msg.from || defaultFromNumber,
            to: msg.to
          });
          
          return {
            success: true,
            to: msg.to,
            sid: result.sid,
            status: result.status
          };
        } catch (error) {
          return {
            success: false,
            to: msg.to,
            error: error.message
          };
        }
      })
    );
    
    // Count successful and failed messages
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    // Return response with all results
    res.status(200).json({
      success: true,
      summary: {
        total: results.length,
        successful,
        failed
      },
      results
    });
  } catch (error) {
    console.error('Error sending batch SMS:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send batch SMS',
      details: error
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`SMS API server is running on port ${PORT}`);
  console.log(`Twilio Account SID: ${process.env.TWILIO_ACCOUNT_SID || 'Using default value'}`);
  console.log(`Twilio Phone Number: ${process.env.TWILIO_PHONE_NUMBER || '+18285768297'}`);
});