'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [message, setMessage] = useState<string>('Connecting to backend...');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API || 'http://localhost:8000';
    
    fetch(`${apiUrl}/`)
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message || JSON.stringify(data));
      })
      .catch((err) => {
        console.error(err);
        setMessage('Failed to connect to FastAPI backend.');
      });
  }, []);

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center font-sans">
      {/* Header with Logo and Title */}
      <div className="flex items-center gap-3 mb-6">
        <img 
          src="/logo.png" 
          alt="AI Question Bank Logo" 
          width={40} 
          height={40} 
          className="rounded-md"
        />
        <h1 className="text-3xl font-bold">AI Question Bank</h1>
      </div>
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
        <p className="text-lg">
          Backend Status: <span className="font-semibold text-blue-500">{message}</span>
        </p>
      </div>
    </div>
  );
}