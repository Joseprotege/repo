import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export const Footer: React.FC = () => (
  <footer className="mt-auto bg-white border-t border-slate-200 py-8">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
            <span className="text-white font-black text-sm leading-none">F</span>
          </div>
          <span className="text-slate-700 font-bold">Foster</span>
          <span className="text-slate-400 text-sm">— fostering the city around you</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <Link to="/browse" className="hover:text-teal-600 transition-colors">Browse Tasks</Link>
          <Link to="/create" className="hover:text-teal-600 transition-colors">Post a Task</Link>
          <Link to="/dashboard" className="hover:text-teal-600 transition-colors">Dashboard</Link>
          <Link to="/pulse" className="hover:text-teal-600 transition-colors">Community Pulse</Link>
        </div>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          Made with <Heart size={12} className="text-red-400 fill-red-400" /> for community
        </p>
      </div>
    </div>
  </footer>
);
