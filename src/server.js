const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/fetchSubjects', async (req, res) => {
  const { examName } = req.query;
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/completions',
      {
        model: "text-davinci-002",
        prompt: `Generate a detailed list of subjects for the exam: ${examName}`,
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data.choices[0].text.split('\n').filter(Boolean));
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).send('Failed to fetch subjects');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
