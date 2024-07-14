import React, { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Button, Drawer, IconButton, TextField } from '@mui/material';
import { Cog } from 'lucide-react';

const Sidebar = ({
  selectedExam, setSelectedExam,
  selectedSubject, setSelectedSubject,
  selectedTopic, setSelectedTopic,
  selectedSubTopic, setSelectedSubTopic,
  units, setUnits,
  topics, setTopics,
  fetchExamData
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const savedFilters = JSON.parse(localStorage.getItem('filters'));
    if (savedFilters) {
      setSelectedExam(savedFilters.exam);
      setSelectedSubject(savedFilters.subject);
      setSelectedTopic(savedFilters.topic);
      setSelectedSubTopic(savedFilters.subTopic);
    }
  }, [setSelectedExam, setSelectedSubject, setSelectedTopic, setSelectedSubTopic]);

  const saveFilters = () => {
    const filters = { exam: selectedExam, subject: selectedSubject, topic: selectedTopic, subTopic: selectedSubTopic };
    localStorage.setItem('filters', JSON.stringify(filters));
    setDrawerOpen(false);
  };

  return (
    <>
      <IconButton onClick={() => setDrawerOpen(true)} sx={{ position: 'absolute', top: 10, left: 10 }}>
        <Gear size={24} />
      </IconButton>
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box p={2} width={300}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Exam</InputLabel>
            <Select
              value={selectedExam}
              onChange={(e) => {
                setSelectedExam(e.target.value);
                fetchExamData(e.target.value);
              }}
            >
              {units.map((unit, index) => (
                <MenuItem key={index} value={unit.Name}>{unit.Name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedExam && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Subject</InputLabel>
              <Select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  const selectedUnit = units.find(unit => unit.Name === e.target.value);
                  setTopics(selectedUnit.Units);
                }}
              >
                {units.map((unit, index) => (
                  <MenuItem key={index} value={unit.Name}>{unit.Name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {selectedSubject && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Topic</InputLabel>
              <Select
                value={selectedTopic}
                onChange={(e) => {
                  setSelectedTopic(e.target.value);
                  // Assuming topics is a list of subtopics under the selected topic
                  const subTopics = topics.find(topic => topic.Name === e.target.value)?.SubTopics || [];
                  setSelectedSubTopic(subTopics.length > 0 ? subTopics[0] : '');
                }}
              >
                {topics.map((topic, index) => (
                  <MenuItem key={index} value={topic.Name}>{topic.Name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {selectedTopic && (
            <FormControl fullWidth margin="normal">
              <InputLabel>SubTopic</InputLabel>
              <Select
                value={selectedSubTopic}
                onChange={(e) => setSelectedSubTopic(e.target.value)}
              >
                {topics.find(topic => topic.Name === selectedTopic)?.SubTopics.map((subTopic, index) => (
                  <MenuItem key={index} value={subTopic}>{subTopic}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button variant="contained" color="primary" onClick={saveFilters} fullWidth sx={{ marginTop: 2 }}>
            Save Filters
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default Sidebar;
