import React from 'react';
import { API_BASE } from '../api';

export default function SettingsPage() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 pb-16">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500 mt-2">Access runs inside Xadmin and uses the Xadmin PIN lock.</p>
      </header>
      <div className="nm-flat p-6 space-y-4">
        <div className="nm-pressed p-5 rounded-2xl">
          <p className="text-sm font-semibold text-gray-700">Drive server</p>
          <p className="text-xs text-gray-500 mt-1 break-all">{API_BASE}</p>
        </div>
      </div>
    </div>
  );
}
