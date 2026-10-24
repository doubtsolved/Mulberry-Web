import React from 'react';
import { motion } from 'motion/react';
import {
  LibraryRegular,
  LibraryFilled,
  DeskRegular,
  DeskFilled,
  SettingsRegular,
  SettingsFilled,
} from '@fluentui/react-icons';
import { ActiveTab } from '../types/catalog';

interface BottomNavBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  shelfCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  shelfCount,
}) => {
  const tabs = [
    {
      id: 'library' as ActiveTab,
      label: 'Library',
      iconOutline: LibraryRegular,
      iconFilled: LibraryFilled,
    },
    {
      id: 'desk' as ActiveTab,
      label: 'Desk',
      iconOutline: DeskRegular,
      iconFilled: DeskFilled,
      badge: shelfCount > 0 ? shelfCount : undefined,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      iconOutline: SettingsRegular,
      iconFilled: SettingsFilled,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 m3-glass border-t border-neutral-300 dark:border-neutral-800 pb-safe transition-colors shadow-md">
      <div className="max-w-md mx-auto h-16 px-6 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconOutline = tab.iconOutline;
          const IconFilled = tab.iconFilled;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center flex-1 h-full py-1 text-center select-none group"
            >
              {/* Material 3 Expressive Active Indicator Pill */}
              <div className="relative flex items-center justify-center w-16 h-8 rounded-full mb-1">
                {isActive && (
                  <motion.div
                    layoutId="m3-active-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-[#ffd8ec] dark:bg-[#5f0340] rounded-full shadow-xs"
                  />
                )}
                <div className="relative z-10 transition-colors">
                  {isActive ? (
                    <IconFilled className="w-5 h-5 text-[#370024] dark:text-[#ffd8ec]" />
                  ) : (
                    <IconOutline className="w-5 h-5 text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white" />
                  )}
                  {tab.badge !== undefined && !isActive && (
                    <span className="absolute -top-1 -right-2 text-[10px] font-bold px-1.5 min-w-[16px] text-center text-white bg-[#7b1e58] dark:bg-[#f6b1d9] dark:text-[#370024] rounded-full leading-none py-0.5 shadow-xs">
                      {tab.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Minimal caption with WCAG AA compliance */}
              <span
                className={`text-[11px] transition-colors tracking-tight ${
                  isActive
                    ? 'text-[#7b1e58] dark:text-[#f6b1d9] font-bold'
                    : 'text-neutral-700 dark:text-neutral-300 font-medium group-hover:text-neutral-900 dark:group-hover:text-white'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
