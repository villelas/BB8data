import React, { useState } from 'react';
import * as d3 from 'd3-dsv';

const DataVisualizer = ({ setCsvData }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [showData, setShowData] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // For drag-and-drop feedback

  const handleFileUpload = async (uploadedFile) => {
    if (uploadedFile && uploadedFile.type === 'text/csv') {
      setError('');
      setFile(uploadedFile);
      const reader = new FileReader();
  
      reader.onload = async (event) => {
        const csvText = event.target.result;
        const parsedData = d3.csvParse(csvText, d3.autoType);
  
        // Previewing data only inside this component
        const preview = parsedData.slice(0, 10);
        setPreviewData(preview);
        setShowData(true);

        setCsvData(parsedData);
  
        // Send the CSV file to the backend
        const formData = new FormData();
        formData.append('file', uploadedFile);
        
        // successful run on local host we haven't run backend in render yet 
        try {
          const response = await fetch('http://localhost:8000/upload-csv', {
            method: 'POST',
            body: formData,
          });
  
          if (!response.ok) {
            throw new Error('Failed to upload CSV.');
          }
  
          const result = await response.json();
          console.log('Upload result:', result);
        } catch (error) {
          console.error('Upload error:', error);
          setError('Error uploading the CSV file.');
        }
      };
      reader.readAsText(uploadedFile);
    } else {
      setError('Only CSV files are allowed.');
      setFile(null);
      setPreviewData([]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const toggleDataVisibility = () => {
    setShowData(!showData);
  }
  return (
    <div className="relative flex flex-col items-center data-visualizer p-4" style={{ top: '-80px' }}>
      {/* Drag-and-Drop Container */}
      <div
         className={`border-2 border-dashed rounded-lg p-8 mb-4 data-visualizer-container ${
          isDragging ? 'border-accent bg-blue-700 shadow-md' : 'border-info'
        } flex items-center justify-center transition-all duration-300`}
        style={{
          width: '80%',
          height: '-100px',
          transition: 'all 0.3s ease',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={(e) => handleFileUpload(e.target.files[0])}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="btn btn-outline btn-accent mt-2">
          Choose File
        </label>
      </div>

      {/* Separate div for Error or Success Message, Centered Below Drag-and-Drop Box */}
      {file && !error && (
  <p className="text-green-500 mb-4 text-center flex items-center">
    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="..."/></svg>
    Uploaded File: {file.name}
  </p>
)}
{error && (
  <p className="text-red-500 mb-4 text-center flex items-center">
    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="..."/></svg>
    {error}
  </p>
)}

      {/* Toggle Button for Showing/Hiding Data */}
      {previewData.length > 0 && (
        <div className="w-full flex justify-center mb-4">
          <button className="btn btn-primary" onClick={toggleDataVisibility}>
            {showData ? 'Hide CSV Data' : 'Show CSV Data'}
          </button>
        </div>
      )}

      {/* Show only first 5-10 rows (df.head equivalent) */}
      {showData && previewData.length > 0 && (
        <table className="text-white bg-gray-900 p-4 rounded-md mt-4 w-full text-center">
          <thead>
            <tr>
              {Object.keys(previewData[0]).map((key) => (
                <th key={key} className="p-2">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, i) => (
                  <td key={i} className="p-2">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DataVisualizer;