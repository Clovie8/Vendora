// src/utils/formatters.js

export function formatRwf(amount) {
  if (amount === undefined || amount === null) return '0 Rwf';
  return parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2
  }) + " Rwf";
}

export function formatDateCell(dateString) {
  if (!dateString) return { date: '-', time: '' };
  
  const parts = dateString.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] ? parts[1].substring(0, 5) : ''; 
  
  return { date: datePart, time: timePart };
}

export function getImageUrl(imgStr) {
  // If no image, return a placeholder
  if (!imgStr) return null;
  // Make sure the image URL points to the backend if it's a relative path
  if (imgStr.startsWith('uploads/')) {
    return `https://vendora-htcbbye5c0b3h8gn.southafricanorth-01.azurewebsites.net/backend/public/${imgStr}`;
  }
  return imgStr;
}