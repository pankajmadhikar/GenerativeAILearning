const {GoogleGenerativeAI} = require('@google/generative-ai');``

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({model: 'gemini-3.1-flash-lite-preview'});

const response = await model.generateContent('Hello, how are you?');

console.log(response.response);