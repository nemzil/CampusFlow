'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

/**
 * AnimatedTabs Component
 * 
 * A tabs component with smooth layoutId animation matching the sidebar pattern.
 * 
 * @param {Array} tabs - Array of tab objects with { value, label, content }
 * @param {string} defaultValue - Initial active tab value
 * @param {string} className - Additional classes for the container
 * @param {Function} onTabChange - Callback when tab changes
 */
export default function AnimatedTabs({ 
  tabs, 
  defaultValue, 
  className = '',
  onTabChange 
}) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  const handleTabChange = (value) => {
    setActiveTab(value);
    onTabChange?.(value);
  };

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={handleTabChange}
      className={`w-full flex flex-col ${className}`}
    >
      <TabsList className="bg-white/5 border border-white/10 p-1 mb-5 h-11 w-full relative">
        {/* Animated background indicator */}
        {tabs.map((tab, index) => {
          if (tab.value === activeTab) {
            return (
              <motion.div
                key="active-tab-bg"
                layoutId="active-tab-bg"
                className="absolute inset-y-1 bg-gradient-to-r from-violet-500/15 to-indigo-500/15 border border-violet-500/25 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.1)]"
                initial={false}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 35,
                  mass: 0.8
                }}
                style={{
                  left: `${index * (100 / tabs.length)}%`,
                  width: `${100 / tabs.length}%`,
                  willChange: 'transform'
                }}
              />
            );
          }
          return null;
        })}
        
        {/* Tab triggers */}
        {tabs.map((tab) => (
          <TabsTrigger 
            key={tab.value} 
            value={tab.value}
            className="data-[state=active]:bg-transparent data-[state=active]:text-white flex-1 relative z-10"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tab content */}
      {tabs.map((tab) => (
        <TabsContent 
          key={tab.value} 
          value={tab.value}
          className="space-y-3 m-0 focus:outline-none"
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
