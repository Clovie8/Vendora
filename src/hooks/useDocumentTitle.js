import { useEffect } from 'react';

export default function useDocumentTitle(title) {
  useEffect(() => {
    // This dynamically changes the browser tab text!
    document.title = `${title} | Vendora`;
    
    // Optional: Reset it back if the component unmounts
    return () => {
      document.title = 'Vendora';
    };
  }, [title]);
}