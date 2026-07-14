// src/config/hq-api.js

// Notice the /hq-api/ added to the end!
export const HQ_BASE_URL = 'https://vendora-htcbbye5c0b3h8gn.southafricanorth-01.azurewebsites.net/backend/hq-api';

export const hqFetch = async (endpoint, options = {}) => {
  const url = `${HQ_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    ...options,
    credentials: 'include', 
  };

  const response = await fetch(url, defaultOptions);
  return response.json();
};  