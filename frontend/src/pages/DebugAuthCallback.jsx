import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/slices/authSlice';

const DebugAuthCallback = () => {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  useEffect(() => {
    async function handleOAuth() {
      try {
        addLog("Starting OAuth callback processing");
        
        // Get code and state from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        addLog(`Received code: ${code ? "Yes" : "No"}, state: ${state ? "Yes" : "No"}`);
        
        if (!code) {
          throw new Error("No authorization code received from GitHub");
        }
        
        // Send to your API directly
        addLog("Sending code to backend API");
        
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
        addLog(`API URL: ${apiUrl}`);
        
        try {
          const response = await fetch(`${apiUrl}/auth/github/callback?code=${code}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          addLog(`Backend response status: ${response.status}`);
          
          // Get the raw text first for debugging
          const responseText = await response.text();
          addLog(`Response body: ${responseText}`);
          
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            addLog(`Error parsing JSON: ${e.message}`);
            throw new Error("Invalid response from server");
          }
          
          addLog(`Parsed response: ${JSON.stringify(data)}`);
          
          if (data.token) {
            addLog(`Received token: ${data.token.substring(0, 10)}...`);
            localStorage.setItem('auth_token', data.token);
            
            // IMPORTANT: This is the fix - dispatch the user data to Redux
            if (data.user) {
              addLog("Updating Redux state with user data");
              dispatch(setUser(data.user));
            }
            
            addLog("Authentication successful!");
            setSuccess(true);
            
            // Wait 3 seconds so user can see the success message
            setTimeout(() => {
              navigate('/');
            }, 3000);
          } else {
            throw new Error("No token received from server");
          }
        } catch (fetchError) {
          addLog(`Fetch error details: ${fetchError.message}`);
          throw fetchError;
        }
      } catch (error) {
        addLog(`Error: ${error.message}`);
        setError(error.message);
      }
    }

    handleOAuth();
  }, [navigate, dispatch]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-4">Authentication {success ? "Successful!" : "Processing"}</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            <h2 className="font-bold">Error</h2>
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
            <p>Successfully authenticated! Redirecting to homepage...</p>
          </div>
        )}
        
        <div className="border border-gray-200 rounded p-3 bg-gray-50 h-60 overflow-auto text-sm font-mono">
          <h2 className="font-bold mb-2">Debug Logs:</h2>
          {logs.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-center">
          <Link to="/login" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DebugAuthCallback;