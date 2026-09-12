import { createContext, useContext } from 'react';
import type { CategoryItem, ProcessItem, ServiceItem, SiteContent, SkillItem } from '../types';
import { defaultContent } from '../data/defaultContent';
export const ContentContext=createContext<{content:SiteContent;services:ServiceItem[];skills:SkillItem[];process:ProcessItem[];categories:CategoryItem[]}>({content:defaultContent,services:[],skills:[],process:[],categories:[]});
export const useContent=()=>useContext(ContentContext);
