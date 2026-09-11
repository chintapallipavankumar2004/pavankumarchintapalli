import { createContext, useContext } from 'react';
import type { PortfolioSettings } from '../types';
import { PROFILE_INFO } from '../data/initialData';
export const defaultSettings: PortfolioSettings = {
  headshot: PROFILE_INFO.headshot,
  resumeUrl: import.meta.env.VITE_RESUME_URL || '',
  availability: '',
  bookingsWindow: '',
  responseWindow: '',
};
export const SettingsContext = createContext(defaultSettings);
export const useSettings = () => useContext(SettingsContext);
