import React, { useEffect } from 'react';
import './App.css';
import DataVisualizer from './Data_Visualizer';
import ChatInterface from './Chatinterface';

function App() {
  useEffect(() => {
    // Load and initialize the finisher-header script for animation
    const script = document.createElement('script');
    script.src = `${process.env.PUBLIC_URL}/finisher-header.es5.min.js`;
    script.async = true;
    script.onload = () => {
      if (window.FinisherHeader) {
        setTimeout(() => {
          new window.FinisherHeader({
            "count": 100,
            "size": {
              "min": 2,
              "max": 8,
              "pulse": 0
            },
            "speed": {
              "x": {
                "min": 0,
                "max": 0.4
              },
              "y": {
                "min": 0,
                "max": 0.6
              }
            },
            "colors": {
              "background": "#201e30",
              "particles": [
                "#fbfcca",
                "#d7f3fe",
                "#ffd0a7"
              ]
            },
            "blending": "overlay",
            "opacity": {
              "center": 1,
              "edge": 0
            },
            "skew": 0,
            "shapes": [
              "c"
            ]
          });
        }, 500);
      }
    };
    document.body.appendChild(script);
  }, []);

  // Function to handle the button click and scroll to the next section
  const scrollToNextSection = () => {
    document.querySelector('.grey-section').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Background Animation Layer */}
      <div className="background-layer finisher-header"></div>

      {/* Content Layer for Home Page */}
      <div className="content-layer">
        <div className="header-content">
          <h1 className="header-title">BB8 Data Visualization Agent</h1>
          <p className="header-subtitle">A powerful tool to analyze and visualize your data seamlessly</p>
          <button className="chat-now-button" onClick={scrollToNextSection}>Chat Now</button>
        </div>
      </div>

      <div className="grey-section">
        <div className="header-container">
        </div>
        
        {/* Chat Interface with Drag-and-Drop Section */}
        <ChatInterface />
      </div>
    </div>
  );
}

export default App;