const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const Groq = require('groq-sdk');
const dotenv = require('dotenv').config();
console.log('Starting server initialization...');

const app = express();

// API key (Note: It's better to use environment variables for sensitive data)
const GROQ_API_KEY = process.env.GROQ_API_KEY_AI;
console.log(GROQ_API_KEY);

console.log('Initializing Groq client...');

// Initialize Groq with API key
let groq;
try {
    groq = new Groq({ apiKey: GROQ_API_KEY });
    console.log('Groq client initialized successfully');
} catch (error) {
    console.error('Failed to initialize Groq client:', error.message);
    process.exit(1);
}

// Setup multer for multiple file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

console.log('Setting up CORS...');
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

console.log('Setting up routes...');
// Route to handle multiple file uploads and text
app.post('/', upload.array('files'), async (req, res) => {
    console.log('Received POST request');
    console.log('Request body:', req.body);
    console.log('Files:', req.files);

    try {
        if (!req.files || req.files.length === 0) {
            console.log('No files in request');
            return res.status(400).send('At least one file is required.');
        }

        console.log('Processing uploaded files...');
        const results = [];

        for (const file of req.files) {
            console.log(`Processing file: ${file.originalname}`);
            const imagePath = path.join(__dirname, file.path);
            const imageBuffer = await fs.promises.readFile(imagePath);
            const base64Image = imageBuffer.toString('base64');

            const messages = [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Generate test cases based on this image and description: ${req.body.text}. You are a test case generator. Based on the image and description provided, generate a set of white box test cases that could be used to verify the functionality of the system or application shown in the image and how can they be performed. The format required is Description, Test Cases, and Result. Also, provide test cases in a stepwise format.`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${file.mimetype};base64,${base64Image}`
                            }
                        }
                    ]
                }
            ];

            console.log(`Sending request to Groq for file: ${file.originalname}`);
            
            // Make request to Groq API
            const chatCompletion = await groq.chat.completions.create({
                messages: messages,
                model: "llava-v1.5-7b-4096-preview",
            });

            console.log(`Received response from Groq for file: ${file.originalname}`);
            
            // Extract and format test cases from the response
            const testCases = chatCompletion.choices[0].message.content;

            // Format test cases into structured response
            const sections = testCases.split(/\n(?=Description:|Test Cases:|Result:)/);
           /* const formattedResponse = {
                Description: sections.find(s => s.startsWith('Description:'))?.replace('Description:', '').trim() || '',
                'Test Cases': sections.find(s => s.startsWith('Test Cases:'))?.replace('Test Cases:', '').trim() || '',
                Result: sections.find(s => s.startsWith('Result:'))?.replace('Result:', '').trim() || ''
            };*/
            // Extract each section if it exists
            const description = sections.find(s => s.startsWith('Description:'))?.replace('Description:', '').trim();
            const testCasesSection = sections.find(s => s.startsWith('Test Cases:'))?.replace('Test Cases:', '').trim();
            const result = sections.find(s => s.startsWith('Result:'))?.replace('Result:', '').trim();

            // Prepare response based on available content
            const formattedResponse = {};
            if (description) formattedResponse.Description = description;
            if (testCasesSection) formattedResponse['Test Cases'] = testCasesSection;
            if (result) formattedResponse.Result = result;

            results.push({ filename: file.originalname, testCases: formattedResponse });
        }

        console.log('Sending response with test cases');
       // console.log(results);
        // Send response with all test cases
        res.json({ results });

    } catch (error) {
        console.error('Error in request handler:', error);

        res.status(500).json({
            message: 'An error occurred while processing the request.',
            error: error.message,
        });
    }
});

// Start server
const PORT = 8000;
try {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
} catch (error) {
    console.error('Failed to start server:', error);
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Server initialization complete');