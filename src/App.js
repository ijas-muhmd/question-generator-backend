import React from 'react';
import './App.css';
import Question from './components/Question';

const App = () => {
  return (
    <div className="App">
      <header className="App-header">
        <Question />
      </header>
    </div>
  );
};

export default App;