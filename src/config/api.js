// src/config/api.js
import Swal from 'sweetalert2';

export const API_BASE_URL = 'https://vendora-htcbbye5c0b3h8gn.southafricanorth-01.azurewebsites.net/backend/';

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    ...options,
    credentials: 'include', // CRITICAL: This allows PHP sessions to work across ports!
  };

  try {
    const response = await fetch(url, defaultOptions);
    const data = await response.json();

    // --- NEW: THE GLOBAL AUTO-LOGOUT INTERCEPTOR ---
    if (response.status === 401 || data.status === 'session_expired' || data.code === 'SESSION_TIMEOUT') {
      
      // 1. Alert the user exactly why they are being kicked out
      await Swal.fire({
        icon: 'warning',
        title: 'Session Ended',
        text: data.message || 'Your session has expired. Please log in again.',
        confirmButtonText: 'Back to Login',
        confirmButtonColor: '#2563eb', // Matches your Vendora blue
        allowOutsideClick: false, // Forces them to acknowledge the alert
        customClass: { popup: 'rounded-2xl shadow-xl' }
      });

      // 2. Hard redirect to the login screen
      // (Using window.location because we are outside the React Router context)
      window.location.href = '/login';

      // 3. Abort the current API promise so the frontend doesn't crash trying to render undefined data
      return Promise.reject(new Error('Session Expired'));
    }
    // -----------------------------------------------

    return data;
    
  } catch (error) {
    // Prevent our intentional reject from logging as a massive red error in the console
    if (error.message !== 'Session Expired') {
      console.error('API Request Failed:', error);
    }
    throw error;
  }
};