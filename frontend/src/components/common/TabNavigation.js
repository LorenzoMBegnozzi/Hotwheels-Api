import React from 'react';
import styles from './TabNavigation.module.css';

const TabNavigation = ({ tabs, activeTab, onTabChange, className = '' }) => {
  return (
    <div className={`${styles.tabNavigation} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;