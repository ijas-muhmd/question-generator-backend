import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Button, Container, Typography, Box, Select, MenuItem, CircularProgress, Alert, Card, CardContent, Radio, RadioGroup,
  FormControl, FormControlLabel, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Skeleton, TextField, Accordion, AccordionSummary, AccordionDetails, Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import toast, { Toaster } from 'react-hot-toast';
import './Question.css';

// Custom Theme
const theme = createTheme({
  palette: {
    background: {
      default: '#ffffff',
    },
    text: {
      primary: '#000000',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    allVariants: {
      color: '#000000',
    },
  },
});

const Question = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState([]);
  const [error, setError] = useState(null);
  const [examType, setExamType] = useState('NEET UG');
  const [additionalFetching, setAdditionalFetching] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateQuestion, setDuplicateQuestion] = useState(null);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [timer, setTimer] = useState(5);
  const [fetchingError, setFetchingError] = useState(false);
  const [expandedAccordions, setExpandedAccordions] = useState([]);

  useEffect(() => {
    if (emailSubmitted) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev > 0) {
            return prev - 1;
          } else {
            clearInterval(interval);
            setLoading(false);
            fetchInitialQuestion();
            return 0;
          }
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [emailSubmitted]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!fetchingError && questions.length - currentQuestionIndex < 15) {
        fetchAdditionalQuestions(5);
      }
    }, 5000);
    return () => clearInterval(intervalId);
  }, [questions, currentQuestionIndex, fetchingError]);

  useEffect(() => {
    if (examType) {
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setLoading(true);
      setFetchingError(false);
      fetchInitialQuestion();
    }
  }, [examType]);

  const fetchInitialQuestion = async () => {
    setLoading(true);
    setLoadingDetails(['Starting request to fetch initial question...']);
    setError(null);

    try {
      const fetchQuestion = async () => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchPromise = axios.post(
          'http://localhost:5001/api/question',
          { examType, fetchCount: 1 },
          { signal }
        );

        setTimeout(() => {
          controller.abort();
        }, 2000);

        try {
          const response = await fetchPromise;
          if (response.data && response.data.questions) {
            return response.data.questions;
          } else {
            throw new Error('Failed to parse question data');
          }
        } catch (error) {
          if (axios.isCancel(error)) {
            throw new Error('Fetching question timed out');
          } else {
            throw error;
          }
        }
      };

      const questions = await fetchQuestion();
      setQuestions(questions);
      setCurrentQuestionIndex(0);
      setSelectedOption('');
      setIsCorrect(null);
      toast.success(`Fetched the initial question`);
      fetchAdditionalQuestions(4);
    } catch (error) {
      console.error('Error fetching initial question:', error);

      if (error.message === 'Fetching question timed out') {
        try {
          const response = await axios.post('http://localhost:5001/api/random-question', { examType });
          if (response.data && response.data.questions) {
            setQuestions(response.data.questions);
            setCurrentQuestionIndex(0);
            setSelectedOption('');
            setIsCorrect(null);
            toast.success('Fetched a random question from saved questions');
          } else {
            throw new Error('Failed to fetch random question from saved questions');
          }
        } catch (error) {
          setError(`Failed to fetch initial question: ${error.message}`);
          setLoadingDetails((prevDetails) => [...prevDetails, `Error: ${error.message}`]);
          setFetchingError(true);
        }
      } else {
        setError(`Failed to fetch initial question: ${error.message}`);
        setLoadingDetails((prevDetails) => [...prevDetails, `Error: ${error.message}`]);
        setFetchingError(true);
      }
    }

    setLoading(false);
  };

  const fetchAdditionalQuestions = async (fetchCount = 3) => {
    setAdditionalFetching(true);
    try {
      const response = await axios.post('http://localhost:5001/api/question', { examType, fetchCount });

      if (response.data && response.data.questions) {
        console.log('Additional questions received:', response.data.questions);
        const newQuestions = response.data.questions;
        const seenQuestions = JSON.parse(localStorage.getItem('seenQuestions')) || [];
        const duplicates = newQuestions.filter((q) => seenQuestions.includes(q.question));

        if (duplicates.length > 0) {
          setDuplicateQuestion(duplicates[0]);
          setDuplicateDialogOpen(true);
        } else {
          setQuestions((prevQuestions) => [...prevQuestions, ...newQuestions]);
          toast.success(`Fetched ${newQuestions.length} additional questions`);
        }
      } else {
        toast.error('Failed to parse additional question data');
      }
    } catch (error) {
      console.error('Error fetching additional questions:', error);
      toast.error(`Failed to fetch additional questions: ${error.message}`);
      setFetchingError(true);
    }
    setAdditionalFetching(false);
  };

  const handleSelectChange = (event) => {
    setExamType(event.target.value);
  };

  const handleOptionSelect = (event) => {
    const selectedOption = event.target.value;
    const currentQuestion = questions[currentQuestionIndex];
    const selectedOptionData = currentQuestion.options.find((opt) => opt.option === selectedOption);
    const isCorrectAnswer = selectedOptionData.is_correct;
    setSelectedOption(selectedOption);
    setIsCorrect(isCorrectAnswer);

    console.log(`Selected option: ${selectedOption}`);
    console.log(`Is correct: ${isCorrectAnswer}`);

    const selectedOptionIndex = currentQuestion.options.findIndex((opt) => opt.option === selectedOption);
    const correctOptionIndex = currentQuestion.options.findIndex((opt) => opt.is_correct);

    if (isCorrectAnswer) {
      setExpandedAccordions([selectedOptionIndex]);
    } else {
      setExpandedAccordions([selectedOptionIndex, correctOptionIndex]);
    }
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedAccordions((prev) => (isExpanded ? [...prev, panel] : prev.filter((p) => p !== panel)));
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex === 2 && !additionalFetching) {
      fetchAdditionalQuestions();
    }
    if (nextIndex >= questions.length - 3 && !additionalFetching) {
      fetchAdditionalQuestions();
    }
    setLoadingNext(true);
    setTimeout(() => {
      setCurrentQuestionIndex(nextIndex);
      setSelectedOption('');
      setIsCorrect(null);
      setExpandedAccordions([]);
      setLoadingNext(false);
      const seenQuestions = JSON.parse(localStorage.getItem('seenQuestions')) || [];
      if (!seenQuestions.includes(currentQuestion.question)) {
        seenQuestions.push(currentQuestion.question);
        localStorage.setItem('seenQuestions', JSON.stringify(seenQuestions));
      }
    }, 1000);
  };

  const handleDuplicateDecision = (decision) => {
    setDuplicateDialogOpen(false);
    if (decision === 'attempt') {
      setQuestions((prevQuestions) => [...prevQuestions, duplicateQuestion]);
      toast.success('Duplicate question added to the queue');
    } else if (decision === 'new') {
      fetchAdditionalQuestions(1);
    }
    setDuplicateQuestion(null);
  };

  const handleEmailSubmit = async () => {
    try {
      const response = await axios.post('http://localhost:5001/api/submit-email', { email, examType });
      if (response.status === 200) {
        setEmailSubmitted(true);
        toast.success('Email saved successfully. Starting test in 5 seconds...');
      } else {
        toast.error('Failed to save email. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting email:', error);
      toast.error('Failed to save email. Please try again.');
    }
  };

  const currentQuestion = duplicateDialogOpen && duplicateQuestion ? duplicateQuestion : questions[currentQuestionIndex];

  return (
    <ThemeProvider theme={theme}>
      <Toaster />
      <Box className="App" sx={{ width: '100%', minHeight: '100vh', backgroundColor: '#ffffff', padding: '40px 0' }}>
        <Container maxWidth="md">
          <Typography variant="h4" gutterBottom>
            Question Generator
          </Typography>
          {!emailSubmitted ? (
            <Box>
              <TextField
                label="Email Address"
                variant="outlined"
                fullWidth
                sx={{ marginBottom: 2 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button variant="contained" color="primary" onClick={handleEmailSubmit}>
                Submit Email and Start Test
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                Starting test in {timer} seconds...
              </Typography>
              <Select
                labelId="exam-type-select-label"
                id="exam-type-select"
                value={examType}
                onChange={handleSelectChange}
                fullWidth
                sx={{ marginBottom: 2 }}
              >
                <MenuItem value="NEET UG">NEET UG</MenuItem>
                <MenuItem value="NEET PG">NEET PG</MenuItem>
                <MenuItem value="MDS">MDS</MenuItem>
                <MenuItem value="UPSC">UPSC</MenuItem>
              </Select>
              {loading || loadingNext ? (
                <>
                  <Skeleton variant="text" width="100%" height={40} />
                  <Skeleton variant="rectangular" width="100%" height={118} />
                  <Skeleton variant="text" width="100%" height={40} />
                  <Skeleton variant="rectangular" width="100%" height={40} />
                </>
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : (
                currentQuestion && (
                  <>
                    <Card sx={{ marginBottom: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {currentQuestion.question}
                        </Typography>
                        <FormControl component="fieldset">
                          <RadioGroup
                            aria-label="options"
                            name="options"
                            value={selectedOption || ''}
                            onChange={handleOptionSelect}
                          >
                            {currentQuestion.options?.map((option, index) => {
                              const isSelected = selectedOption === option.option;
                              const isCorrectAnswer = option.is_correct;
                              const isIncorrectAnswer = isSelected && !isCorrectAnswer;

                              return (
                                <Accordion
                                  key={index}
                                  expanded={selectedOption && expandedAccordions.includes(index)}
                                  onChange={handleAccordionChange(index)}
                                  disabled={!!selectedOption && !isSelected && !isCorrectAnswer}
                                >
                                  <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    aria-controls={`panel${index}-content`}
                                    id={`panel${index}-header`}
                                    sx={{
                                      backgroundColor: isSelected
                                        ? isCorrectAnswer
                                          ? '#ccedd5'
                                          : '#f0dddd'
                                        : isCorrectAnswer && !!selectedOption
                                        ? '#ccedd5'
                                        : '#ffffff',
                                      borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                                    }}
                                  >
                                    <FormControlLabel
                                      value={option.option}
                                      control={<Radio />}
                                      label={
                                        <Typography variant="body1" color="text.primary">
                                          {option.option}
                                        </Typography>
                                      }
                                      sx={{
                                        color: isCorrectAnswer ? '#2e7d32' : isIncorrectAnswer ? '#d32f2f' : 'inherit',
                                      }}
                                    />
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <Typography variant="body2" color="text.secondary">
                                    {
                                        isCorrectAnswer
                                          ? option.explanation
                                          : (selectedOption === option.option && !isCorrectAnswer ? option.reason : option.explanation)
                                      }
                                    </Typography>
                                    {isCorrectAnswer && <Chip label="Correct option" color="success" />}
                                    {isIncorrectAnswer && <Chip label="Incorrect option" color="error" />}
                                  </AccordionDetails>
                                </Accordion>
                              );
                            })}
                          </RadioGroup>
                        </FormControl>
                        {isCorrect === false && (
                          <Typography variant="body2" color="red" sx={{ marginTop: 2 }}>
                            Correct answer: {currentQuestion.options.find((opt) => opt.is_correct).option}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                    <Button variant="contained" onClick={handleNextQuestion} disabled={loadingNext} sx={{ marginTop: 2 }}>
                      {loadingNext ? <CircularProgress size={24} /> : 'Next Question'}
                    </Button>
                  </>
                )
              )}
              <Dialog
                open={duplicateDialogOpen}
                onClose={() => handleDuplicateDecision('new')}
                aria-labelledby="duplicate-dialog-title"
                aria-describedby="duplicate-dialog-description"
              >
                <DialogTitle id="duplicate-dialog-title">Duplicate Question Detected</DialogTitle>
                <DialogContent>
                  <DialogContentText id="duplicate-dialog-description">
                    A duplicate question has been detected. Would you like to attempt this duplicate question or request a new one?
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => handleDuplicateDecision('new')} color="primary">
                    Request New
                  </Button>
                  <Button onClick={() => handleDuplicateDecision('attempt')} color="primary" autoFocus>
                    Attempt Duplicate
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default Question;
