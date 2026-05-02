"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { 
  Layers, ChevronDown, ChevronUp, Circle, Clock, 
  FolderKanban, X, Sun, Moon, Monitor, 
  LayoutDashboard, Menu, User
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // STATE BURGER MENU
  const [isMobileOpen, setIsMobileOpen] = useState(false); // STATE MOBILE MENU

  useEffect(() => setMounted(true), []);

  // Close sidebar on mobile when navigating to a new route
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);
  
  const [openSections, setOpenSections] = useState({
    finance: false, schedule: false, projects: false, profile: false
  });

  const toggleSection = (section: 'finance' | 'schedule' | 'projects' | 'profile') => {
    if (isCollapsed) setIsCollapsed(false); // Buka sidebar jika sedang tertutup
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const financeMenu = [
    { name: 'Log Spend', href: '/finance/ledger'},
    { name: 'Money Analytics', href: '/finance/analytics'},
    { name: 'Wallet', href: '/finance/assets'},
    { name: 'Subscription', href: '/finance/recurring'},
  ];

  const projectMenu = [
    { name: 'Wish List', href: '/projects/wish'},
    { name: 'Anti-Impulse', href: '/projects/impulse'},
    { name: 'Oracle Scenarios', href: '/projects/scenarios'},
    { name: 'Your Projects', href: '/projects/forge'},
  ];

  const scheduleMenu = [
    { name: 'Daily Activity', href: '/schedule/daily'},
    { name: 'Calendar', href: '/schedule/calendar'},
  ];

  const profileMenu = [
    { name: 'About Me', href: '/profile/about'},
    { name: 'Network', href: '/profile/network'},
  ];

  return (
    <>
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 z-40 w-full bg-gray-50 dark:bg-[#121212] border-b border-gray-200 dark:border-gray-800 h-16 px-6 flex items-center justify-between">
        <h1 className="text-gray-900 dark:text-white font-bold text-xl tracking-tighter italic">
          CULTURE<span className="text-blue-600 dark:text-blue-500 underline decoration-2 underline-offset-4 not-italic">OS</span>
        </h1>
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="p-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* CSS FIX FOR MOBILE CONTENT OVERLAP */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          body { padding-top: 4rem; }
        }
      `}} />

      {/* MOBILE OVERLAY */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`fixed md:sticky top-0 right-0 md:right-auto md:left-0 h-screen z-50 shrink-0 bg-gray-50 dark:bg-[#121212] text-gray-600 dark:text-gray-400 flex flex-col border-l border-r-0 md:border-l-0 md:border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64 ${isMobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
      
        {/* HEADER & BURGER */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800/50">
          <div className={`overflow-hidden whitespace-nowrap ${isCollapsed ? 'md:hidden' : ''}`}>
              <h1 className="text-gray-900 dark:text-white font-bold text-xl tracking-tighter italic">
                CULTURE<span className="text-blue-600 dark:text-blue-500 underline decoration-2 underline-offset-4 not-italic">OS</span>
              </h1>
          </div>
          <button onClick={() => setIsCollapsed(!isCollapsed)} className={`hidden md:block p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}>
            <Menu size={20} />
          </button>
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-4 pb-6 mt-4">
        
          {/* DASHBOARD LINK */}
          <Link href="/" title="Command Center" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${pathname === '/' ? 'text-blue-600 dark:text-white bg-blue-50 dark:bg-gray-800/60 font-bold shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'} ${isCollapsed ? 'md:justify-center' : ''}`}>
            <LayoutDashboard size={20} className={pathname === '/' ? 'text-blue-600 dark:text-blue-500' : ''}/>
            <span className={`text-[13px] uppercase tracking-wide ${isCollapsed ? 'md:hidden' : ''}`}>Command Center</span>
          </Link>

          {/* MODUL: FINANCE */}
          <div className="space-y-1">
            <button title="Finance" onClick={() => toggleSection('finance')} className={`w-full flex items-center p-3 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-gray-800 ${openSections.finance ? 'text-gray-900 dark:text-white font-bold' : ''} ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'}`}>
              <div className="flex items-center gap-3">
                <Layers size={20} className={openSections.finance ? 'text-blue-600' : ''} />
                <span className={`text-[13px] uppercase tracking-wide ${isCollapsed ? 'md:hidden' : ''}`}>Finance</span>
              </div>
              <div className={isCollapsed ? 'md:hidden' : ''}>
                {openSections.finance ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>
            {openSections.finance && (
              <div className={`mt-1 ml-4 space-y-1 border-l border-gray-200 dark:border-gray-800/60 ${isCollapsed ? 'md:hidden' : ''}`}>
                {financeMenu.map((item) => (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-3 py-2.5 px-4 text-sm transition-all ${pathname === item.href ? 'text-blue-600 dark:text-white font-bold' : 'hover:text-gray-900 dark:hover:text-gray-200'}`}>
                    <Circle size={4} className={pathname === item.href ? 'fill-blue-600' : 'fill-gray-400'} />
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* MODUL: PROJECTS */}
          <div className="space-y-1">
            <button title="Projects" onClick={() => toggleSection('projects')} className={`w-full flex items-center p-3 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-gray-800 ${openSections.projects ? 'text-gray-900 dark:text-white font-bold' : ''} ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'}`}>
              <div className="flex items-center gap-3">
                <FolderKanban size={20} className={openSections.projects ? 'text-purple-600' : ''} />
                <span className={`text-[13px] uppercase tracking-wide ${isCollapsed ? 'md:hidden' : ''}`}>Projects</span>
              </div>
              <div className={isCollapsed ? 'md:hidden' : ''}>
                {openSections.projects ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>
            {openSections.projects && (
              <div className={`mt-1 ml-4 space-y-1 border-l border-gray-200 dark:border-gray-800/60 ${isCollapsed ? 'md:hidden' : ''}`}>
                {projectMenu.map((item) => (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-3 py-2.5 px-4 text-sm transition-all ${pathname === item.href ? 'text-purple-600 dark:text-white font-bold' : 'hover:text-gray-900 dark:hover:text-gray-200'}`}>
                    <Circle size={4} className={pathname === item.href ? 'fill-purple-600' : 'fill-gray-400'} />
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* MODUL: SCHEDULE */}
          <div className="space-y-1">
            <button title="Schedule" onClick={() => toggleSection('schedule')} className={`w-full flex items-center p-3 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-gray-800 ${openSections.schedule ? 'text-gray-900 dark:text-white font-bold' : ''} ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'}`}>
              <div className="flex items-center gap-3">
                <Clock size={20} className={openSections.schedule ? 'text-orange-600' : ''} />
                <span className={`text-[13px] uppercase tracking-wide ${isCollapsed ? 'md:hidden' : ''}`}>Schedule</span>
              </div>
              <div className={isCollapsed ? 'md:hidden' : ''}>
                {openSections.schedule ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>
            {openSections.schedule && (
              <div className={`mt-1 ml-4 space-y-1 border-l border-gray-200 dark:border-gray-800/60 ${isCollapsed ? 'md:hidden' : ''}`}>
                {scheduleMenu.map((item) => (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-3 py-2.5 px-4 text-sm transition-all ${pathname === item.href ? 'text-orange-600 dark:text-white font-bold' : 'hover:text-gray-900 dark:hover:text-gray-200'}`}>
                    <Circle size={4} className={pathname === item.href ? 'fill-orange-600' : 'fill-gray-400'} />
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* MODUL: PROFILE */}
          <div className="space-y-1">
            <button title="Profile" onClick={() => toggleSection('profile')} className={`w-full flex items-center p-3 rounded-xl transition-all hover:bg-gray-200 dark:hover:bg-gray-800 ${openSections.profile ? 'text-gray-900 dark:text-white font-bold' : ''} ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'}`}>
              <div className="flex items-center gap-3">
                <User size={20} className={openSections.profile ? 'text-sky-600' : ''} />
                <span className={`text-[13px] uppercase tracking-wide ${isCollapsed ? 'md:hidden' : ''}`}>Profile</span>
              </div>
              <div className={isCollapsed ? 'md:hidden' : ''}>
                {openSections.profile ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>
            {openSections.profile && (
              <div className={`mt-1 ml-4 space-y-1 border-l border-gray-200 dark:border-gray-800/60 ${isCollapsed ? 'md:hidden' : ''}`}>
                {profileMenu.map((item) => (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-3 py-2.5 px-4 text-sm transition-all ${pathname === item.href ? 'text-sky-600 dark:text-white font-bold' : 'hover:text-gray-900 dark:hover:text-gray-200'}`}>
                    <Circle size={4} className={pathname === item.href ? 'fill-sky-600' : 'fill-gray-400'} />
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

        </nav>

        {/* THEME TOGGLE */}
        <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-800/50">
          {mounted && (
            <div className={`bg-gray-200/50 dark:bg-[#1A1A1A] p-1 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center ${isCollapsed ? 'md:flex-col gap-2' : 'justify-between'}`}>
              <button onClick={() => setTheme('light')} className={`p-2 rounded-lg flex justify-center transition-all ${theme === 'light' ? 'bg-white shadow-sm text-yellow-500' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'} flex-1 ${isCollapsed ? 'md:flex-none md:w-full' : 'md:flex-1'}`}><Sun size={16} /></button>
              <button onClick={() => setTheme('system')} className={`p-2 rounded-lg flex justify-center transition-all ${theme === 'system' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'} flex-1 ${isCollapsed ? 'md:flex-none md:w-full' : 'md:flex-1'}`}><Monitor size={16} /></button>
              <button onClick={() => setTheme('dark')} className={`p-2 rounded-lg flex justify-center transition-all ${theme === 'dark' ? 'bg-[#2A2A2A] shadow-sm text-blue-500' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'} flex-1 ${isCollapsed ? 'md:flex-none md:w-full' : 'md:flex-1'}`}><Moon size={16} /></button>
            </div>
          )}
        </div>

      </aside>
    </>
  );
}