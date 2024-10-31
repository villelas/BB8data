import React, { useState } from 'react';
import DataVisualizer from './Data_Visualizer';
import botAvatar from './images/bb8.webp'; // Example import for bot avatar
import userAvatar from './images/user.png'; // Example import for user avatar
import { VegaLite } from 'react-vega'; // Import VegaLite for chart rendering
import Spinner from './Spinner'; // Import Spinner component

const ChatInterface = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [csvData, setCsvData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBotLoading, setIsBotLoading] = useState(false);

  // Handle user input
  function handleMessage(event) {
    setMessage(event.target.value);
  }

  // Clear chat history
  function clearChat() {
    setChatHistory([]);
  }

  // Function to limit messages in chat to the last 4
  function limitChatHistory(messages) {
    return messages.slice(-4); // Keep only the last 4 messages
  }
  
  const unrelatedKeywords = ['monster truck', 'toy sales', 'car race', 'alien', 'sports game'];
  async function sendMessage() {

    if (message === '') return;
    if (!csvData) {
      const noDataMessage = { type: 'bot', content: "Please upload a dataset to proceed with your request." };
      setChatHistory((prev) => limitChatHistory([...prev, noDataMessage]));
      return;
    }
    const isUnrelated = unrelatedKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
  );

  if (isUnrelated) {
      // If the message is unrelated, show a warning bot message
      const errorResponse = {
          type: 'bot',
          content: "Please enter something relevant to the dataset.",
      };
      setChatHistory((prev) => limitChatHistory([...prev, errorResponse]));
      setMessage(''); // Clear input
      return;
  }



    const userMessage = { type: 'user', content: message };
    setChatHistory((prev) => limitChatHistory([...prev, userMessage]));
    setIsLoading(true);
    setIsBotLoading(true); // Start bot loading state

    const loadingMessage = { type: 'bot', content: "Generating response..." };
    setChatHistory((prev) => limitChatHistory([...prev, loadingMessage]));

    try {
        const response = await fetch('http://localhost:8000/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: message }),
        });

        if (!response.ok) {
            const errorDetail = await response.json();
            throw new Error(errorDetail.detail || 'Unknown server error');
        }

        const data = await response.json();
        console.log('Response from /query:', data); // Log the response for debugging

        // Remove the temporary "Generating response..." message by slicing the last entry
        setChatHistory((prev) => {
            const newChatHistory = limitChatHistory(prev.slice(0, -1)); // Remove last message (loading)
            let botResponse;

            if (data.visualization) {
                botResponse = {
                    type: 'vega',
                    content: data.visualization, // Vega-Lite JSON specification
                    description: data.description || "Here’s your data visualization:",
                };
            } else {
                botResponse = {
                    type: 'bot',
                    content: data.description || "Here’s the analysis of your data.",
                };
            }

            return [...newChatHistory, botResponse];
        });
    } catch (error) {
        console.error('Error:', error.message);
        const errorResponse = {
            type: 'bot',
            content: error.message || 'There was an error contacting the server.',
        };

        setChatHistory((prev) => limitChatHistory([...prev.slice(0, -1), errorResponse])); // Replace loading message with error
    }

    setMessage(''); // Clear input
    setIsLoading(false); // Clear loading state
    setIsBotLoading(false); // End bot loading state
  }

  return (
    <div className="flex flex-col justify-between items-center min-h-screen p-7 bg-base-500">
      <div className="w-full max-w-lg mb-3">
        <DataVisualizer setCsvData={setCsvData} />
      </div>
      <div className="flex flex-col w-full max-w-full lg:max-w-5xl flex-grow mb-8">
        <div className="flex gap-2 justify-center items-end">
          <input
            type="text"
            placeholder="Type here"
            value={message}
            className="input input-bordered input-accent w-full max-w-xs h-12 p-3 rounded-lg focus:outline-none focus:ring focus:ring-accent"
            onInput={handleMessage}
          />
         <button
            className="btn btn-accent h-12 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out"
            onClick={sendMessage}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
          <button
            className="btn btn-error h-12 ml-2 shadow-lg rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200 ease-in-out"
            onClick={clearChat}
          >
            Clear Messages
          </button>
        </div>
        <div className="card mt-3 p-4 bg-base-100 shadow-lg border border-yellow-200 rounded-lg w-full h-[500px] overflow-y-auto">
          <h2 className="text-xl font-semibold">Chat</h2>
          <div className="mt-2 space-y-2">
            {chatHistory.map((chat, index) => (
              <div key={index} className={`chat ${chat.type === 'user' ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-image avatar">
                  <div className="w-10 rounded-full">
                    <img
                      alt={chat.type === 'bot' ? 'Bot Avatar' : 'User Avatar'}
                      src={chat.type === 'bot' || chat.type === 'vega' ? botAvatar : userAvatar}
                      className="w-10 rounded-full"
                    />
                  </div>
                </div>
                <div className="chat-header">
                  {chat.type === 'bot' || chat.type === 'vega' ? 'Bot' : 'User'}
                  <time className="text-xs opacity-50"> {new Date().toLocaleTimeString()}</time>
                </div>
                <div className={`chat-bubble ${chat.type === 'bot' || chat.type === 'vega' ? 'chat-bubble-info' : 'chat-bubble-primary'}`}>
                  {chat.type === 'vega' ? (
                    <div>
                      <p className="text-sm">{chat.description}</p>
                      {chat.content ? (
                        <VegaLite spec={JSON.parse(chat.content)} width={400} height={300} />
                      ) : (
                        <p>No valid visualization was generated.</p>
                      )}
                    </div>
                  ) : (
                    chat.content
                  )}
                </div>
                <div className="chat-footer opacity-50">Delivered</div>
              </div>
            ))}
            {isBotLoading && (
              <div className="chat chat-start">
                <div className="chat-image avatar">
                  <div className="w-10 rounded-full">
                    <img alt="Bot Avatar" src={botAvatar} />
                  </div>
                </div>
                <div className="chat-bubble chat-bubble-info">
                  <Spinner /> {/* Show spinner while loading */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
