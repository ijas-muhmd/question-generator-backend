import React from 'react';
import { CircularProgress, Typography, Box } from '@mui/material';

const Loader = ({ message }) => {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress />
      {message && <Typography variant="h6" sx={{ marginTop: 2 }}>{message}</Typography>}
    </Box>
  );
};

export default Loader;