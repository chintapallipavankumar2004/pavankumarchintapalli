import React, { useState } from 'react';
import { Lock, Menu, X } from 'lucide-react';
import { ViewMode } from '../types';
import { useSettings } from '../lib/settings';

interface TopNavbarProps {
  onNavigateToSection: (sectionId: string) => void;
  onSwitchView: (view: ViewMode) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onNavigateToSection, onSwitchView }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const settings = useSettings();

  const handleNavClick = (sectionId: string) => {
    onNavigateToSection(sectionId);
    setMobileMenuOpen(false);
  };

  return (
    <header
      id="main-header"
      className="sticky top-0 z-50 bg-[#f9f9ff]/90 backdrop-blur-md border-b border-[#c8c4d8]/40 shadow-xs transition-all duration-200"
    >
      <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto h-20">
        {/* Brand Logo */}
        <button
          id="nav-brand"
          type="button"
          onClick={() => handleNavClick('hero')}
          className="flex items-center gap-1.5 group text-left cursor-pointer"
        >
          <span className="text-2xl font-bold tracking-tight text-[#141b2b] group-hover:text-[#422cd8] transition-colors">
            Pavan Kumar
          </span>
          <span className="inline-block w-2 h-2 rounded-full bg-[#5b4cf0]"></span>
        </button>

        {/* Desktop Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-8">
          <button
            id="nav-link-work"
            type="button"
            onClick={() => handleNavClick('work')}
            className="text-[#422cd8] font-semibold transition-colors text-[15px] hover:text-[#5b4cf0] cursor-pointer"
          >
            Work
          </button>
          <button
            id="nav-link-services"
            type="button"
            onClick={() => handleNavClick('services')}
            className="text-[#474555] hover:text-[#141b2b] transition-colors text-[15px] cursor-pointer"
          >
            Services
          </button>
          <button
            id="nav-link-about"
            type="button"
            onClick={() => handleNavClick('about')}
            className="text-[#474555] hover:text-[#141b2b] transition-colors text-[15px] cursor-pointer"
          >
            About
          </button>
          <button
            id="nav-link-contact"
            type="button"
            onClick={() => handleNavClick('contact')}
            className="text-[#474555] hover:text-[#141b2b] transition-colors text-[15px] cursor-pointer"
          >
            Contact
          </button>
        </nav>

        {/* Trailing Actions & Availability */}
        <div className="flex items-center gap-4">
          {/* Availability Pill */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{settings.availability || 'Let’s discuss your project'}</span>
          </div>

          {/* Primary CTA Button */}
          <button
            id="btn-header-cta"
            type="button"
            onClick={() => handleNavClick('contact')}
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-[#5b4cf0] text-white text-[15px] font-semibold hover:bg-[#422cd8] transition-all duration-200 shadow-sm active:scale-[0.98] cursor-pointer"
          >
            Start a Project
          </button>

          {/* Mobile Hamburger */}
          <button
            id="btn-mobile-toggle"
            type="button"
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#474555] hover:bg-[#e9edff] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden border-t border-[#c8c4d8]/30 bg-[#f9f9ff] px-6 py-4 space-y-3 shadow-lg"
        >
          <div className="sm:hidden pb-2 mb-2 border-b border-[#c8c4d8]/30 flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{settings.availability || 'Let’s discuss your project'}</span>
          </div>
          <button
            type="button"
            onClick={() => handleNavClick('work')}
            className="block w-full text-left text-[#422cd8] font-semibold py-1.5 text-[15px]"
          >
            Work
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('services')}
            className="block w-full text-left text-[#474555] hover:text-[#141b2b] py-1.5 text-[15px]"
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('about')}
            className="block w-full text-left text-[#474555] hover:text-[#141b2b] py-1.5 text-[15px]"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('contact')}
            className="block w-full text-left text-[#474555] hover:text-[#141b2b] py-1.5 text-[15px]"
          >
            Contact
          </button>
        </div>
      )}
    </header>
  );
};
