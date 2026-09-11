import React from 'react';
import { ViewMode } from '../types';

interface FooterProps {
  onNavigateToSection: (sectionId: string) => void;
  onSwitchView: (view: ViewMode) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateToSection, onSwitchView }) => {
  return (
    <footer className="w-full bg-white border-t border-[#c8c4d8]/40 py-10">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-6 max-w-7xl mx-auto gap-6">
        {/* Brand & Title */}
        <div className="text-center md:text-left space-y-1">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-xl font-bold text-[#141b2b]">pavan.</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#e9edff] text-[#422cd8] font-semibold">
              Portfolio
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#474555]">
            Chintapalli Pavan Kumar — Software Developer & Freelancer
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap justify-center gap-6 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => onNavigateToSection('work')}
            className="text-[#474555] hover:text-[#422cd8] transition-colors cursor-pointer"
          >
            Work
          </button>
          <button
            type="button"
            onClick={() => onNavigateToSection('services')}
            className="text-[#474555] hover:text-[#422cd8] transition-colors cursor-pointer"
          >
            Services
          </button>
          <button
            type="button"
            onClick={() => onNavigateToSection('process')}
            className="text-[#474555] hover:text-[#422cd8] transition-colors cursor-pointer"
          >
            Process
          </button>
          <button
            type="button"
            onClick={() => onNavigateToSection('about')}
            className="text-[#474555] hover:text-[#422cd8] transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            type="button"
            onClick={() => onNavigateToSection('contact')}
            className="text-[#474555] hover:text-[#422cd8] transition-colors cursor-pointer"
          >
            Enquiry Desk
          </button>
        </div>

        {/* Copyright */}
        <div className="text-center md:text-right text-xs text-[#474555]">
          <p>
            © {new Date().getFullYear()} Chintapalli Pavan Kumar. Engineered with precision. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
