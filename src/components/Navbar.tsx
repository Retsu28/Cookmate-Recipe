import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChefHat, Search, Camera, Book, User, Menu, X, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Discover', path: '/', icon: <Search className="w-5 h-5" /> },
    { name: 'AI Camera', path: '/camera', icon: <Camera className="w-5 h-5" /> },
    { name: 'Pantry', path: '/search', icon: <ShoppingBag className="w-5 h-5" /> },
    { name: 'My Recipes', path: '/profile', icon: <Book className="w-5 h-5" /> },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-orange-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-orange-500 p-2 rounded-xl text-white shadow-sm">
              <ChefHat className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl text-stone-900 tracking-tight">CookMate</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isActive
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-orange-500'
                    }`}
                >
                  {link.icon}
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* User & Mobile Toggle */}
          <div className="flex items-center gap-4">
            <Link to="/profile" className="hidden md:flex">
              <Button variant="ghost" size="icon" className="rounded-full bg-stone-100 hover:bg-orange-100 text-stone-600 hover:text-orange-600">
                <User className="w-5 h-5" />
              </Button>
            </Link>
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-stone-600">
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-orange-100 px-4 pt-2 pb-4 space-y-1 shadow-lg absolute w-full left-0">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 ${isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-stone-600 hover:bg-stone-50'
                  }`}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
