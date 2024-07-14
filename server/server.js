const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const stringSimilarity = require('string-similarity');
const mongoose = require('mongoose')

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: "*", 
}));

app.use(express.json());

mongoose.connect(process.env.MONGODB_URL).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.log('Error connecting to MongoDB:', err);
});

const questionSchema = new mongoose.Schema({
  question: String,
  question_type: String,
  explanation: String,
  topic: String,
  options: [{
      option: String,
      is_correct: Boolean,
      explanation: String,
      reason: String,
      study_topic: String
  }],
  examType: String
});

const Question = mongoose.model('Question', questionSchema, 'questions'); 

const emailSchema = new mongoose.Schema({
  email: String,
  examType: String,
  timestamp: { type: Date, default: Date.now }
});

const Email = mongoose.model('Email', emailSchema, 'emails');


async function getRandomQuestionByExamType(examType) {
  const questions = await Question.find({ examType });
  if (questions.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
}



async function isDuplicateQuestion(newQuestion) {
  const existingQuestions = await Question.find();
  return existingQuestions.some(q => {
    const similarity = stringSimilarity.compareTwoStrings(q.question, newQuestion);
    return similarity > 0.85; // Adjust the threshold as needed
  });
}

function validateQuestionFormat(question) {
  const requiredFields = ['question', 'question_type', 'explanation', 'topic', 'options'];
  const optionFields = ['option', 'is_correct', 'explanation', 'reason', 'study_topic'];

  for (let field of requiredFields) {
    if (!question.hasOwnProperty(field)) return false;
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) return false;

  for (let option of question.options) {
    for (let field of optionFields) {
      if (!option.hasOwnProperty(field) || option[field] === '') return false;
    }
  }

  return true;
}

async function fetchQuestionFromOpenAI(prompt) {
  console.log('Sending request to OpenAI with prompt:', prompt);
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    console.log('Received response from OpenAI:', response.data);
    if (response && response.data.choices && response.data.choices.length > 0) {
      const generatedContent = response.data.choices[0].message.content;
      console.log('Generated content from OpenAI:', generatedContent);
      const parsedContent = JSON.parse(generatedContent);
      if (validateQuestionFormat(parsedContent)) {
        return parsedContent;
      } else {
        throw new Error('Generated question does not follow the required format');
      }
    } else {
      throw new Error('No choices received from OpenAI API');
    }
  } catch (error) {
    if (error.response) {
      console.error('Error from OpenAI API:', error.response.data);
      throw new Error(`Error from OpenAI API: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received from OpenAI API:', error.request);
      throw new Error('No response received from OpenAI API');
    } else if (error.message === 'Unexpected end of JSON input') {
      console.error('Malformed JSON received from OpenAI API');
      throw new Error('Malformed JSON received from OpenAI API');
    } else {
      console.error('Error in OpenAI API request:', error.message);
      throw new Error(`Error in OpenAI API request: ${error.message}`);
    }
  }
}


app.post('/api/question', async (req, res) => {
  const { examType, fetchCount = 5 } = req.body;
  const examDetails = {
    'NEET UG': 'Focus on applying biological concepts to medical scenarios, including questions on human physiology, biochemistry, and anatomy.',
    'NEET PG': 'Emphasize clinical applications, patient management, and problem-solving skills required at the postgraduate medical level.',
    'MDS': 'Cover in-depth dental scenarios, clinical case studies, and advanced dental techniques relevant to Master in Dental Surgery.',
    'UPSC': 'Involve broad socio-economic impacts, governance, and administrative strategies essential for civil services examination.'
  };

  if (!examDetails[examType]) {
    return res.status(400).json({ error: 'Invalid exam type provided' });
  }

  const prompt = `Generate a ${examType} level multiple-choice question based on the following topic: ${examDetails[examType]}. 
                  The question should have four options. For each option, provide the following details:
                  1. Explanation for the option
                  2. Reason for the option being correct or incorrect
                  3. Study topic related to the option

                  Format the output as follows:
                  {
                    "question": "Your question text",
                    "question_type": "MCQ",
                    "explanation": "Explanation of the correct answer",
                    "topic": "${examType}",
                    "options": [
                      {
                        "option": "Option text",
                        "is_correct": false,
                        "explanation": "Explanation for the option",
                        "reason": "Reason for the option",
                        "study_topic": "Related study topic"
                      }
                    ]
                  }`;

  try {
    const newQuestions = [];
    const startTime = Date.now();

    for (let i = 0; i < fetchCount; i++) {
      console.log(`Requesting question ${i + 1}...`);

      const questionData = await fetchQuestionFromOpenAI(prompt);
      if (!await isDuplicateQuestion(questionData.question)) {
        if (validateQuestionFormat(questionData)) {
          const question = new Question({
            ...questionData,
            examType
          });

          await question.save();
          newQuestions.push(question);
        } else {
          console.log(`Invalid format for question ${i + 1}. Skipping.`);
        }
      } else {
        console.log(`Duplicate question detected for question ${i + 1}. Skipping.`);
      }

      console.log(`Question ${i + 1} received and processed.`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`All questions generated in ${totalTime} ms.`);
    res.json({ questions: newQuestions, totalTime });

  } catch (error) {
    console.error('Error while fetching questions from OpenAI:', error.message);

    if (error.message.includes('timed out')) {
      const randomQuestion = await getRandomQuestionByExamType(examType);
      if (randomQuestion) {
        return res.json({ questions: [randomQuestion] });
      } else {
        return res.status(500).json({ error: `Failed to fetch questions: ${error.message}. No local questions available.` });
      }
    } else {
      return res.status(500).json({ error: `Failed to fetch questions: ${error.message}` });
    }
  }
});

app.post('/api/random-question', async(req, res) => {
  console.log('Received request for random question:', req.body);
  const { examType } = req.body;
  try {
    const randomQuestion = await getRandomQuestionByExamType(examType);
    if (randomQuestion) {
        res.json({ questions: [randomQuestion] });
    } else {
        res.status(404).json({ error: 'No questions available for the specified exam type.' });
    }
} catch (err) {
    res.status(500).json({ error: 'An error occurred while fetching the random question' });
}
});


app.post('/api/submit-email', async(req, res) => {
  const { email, examType } = req.body;

  if (!email || !examType) {
    return res.status(400).json({ error: 'Email and exam type are required' });
  }

  const newEmail = new Email({
    email,
    examType
  });

  try {
    await newEmail.save();
    res.status(200).json({ message: 'Email saved successfully' });
} catch (err) {
    res.status(500).json({ error: 'An error occurred while saving the email' });
}
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
