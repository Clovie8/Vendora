// src/config/api.js

export const API_BASE_URL = 'https://vendora-htcbbye5c0b3h8gn.southafricanorth-01.azurewebsites.net/';

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    ...options,
    credentials: 'include', // CRITICAL: This allows PHP sessions to work across ports!
  };

  const response = await fetch(url, defaultOptions);
  return response.json();
};