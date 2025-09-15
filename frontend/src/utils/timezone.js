/**
 * Timezone utilities for CAT (Central Africa Time) display
 */

// CAT timezone offset is UTC+2
const CAT_TIMEZONE = 'Africa/Harare';

/**
 * Format a timestamp to CAT timezone
 * @param {string|Date} timestamp - The timestamp to format
 * @param {string} format - The format string (default: 'HH:mm:ss')
 * @returns {string} Formatted time string in CAT
 */
export const formatTimeCAT = (timestamp, format = 'HH:mm:ss') => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = new Date(timestamp);
    
    if (format === 'HH:mm:ss') {
      return date.toLocaleTimeString('en-US', {
        timeZone: CAT_TIMEZONE,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    
    if (format === 'HH:mm') {
      return date.toLocaleTimeString('en-US', {
        timeZone: CAT_TIMEZONE,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    if (format === 'full') {
      return date.toLocaleString('en-US', {
        timeZone: CAT_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }
    
    return date.toLocaleTimeString('en-US', {
      timeZone: CAT_TIMEZONE,
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting time to CAT:', error);
    return 'Invalid time';
  }
};

/**
 * Format a date to CAT timezone
 * @param {string|Date} timestamp - The timestamp to format
 * @param {string} format - The format string (default: 'YYYY-MM-DD')
 * @returns {string} Formatted date string in CAT
 */
export const formatDateCAT = (timestamp, format = 'YYYY-MM-DD') => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = new Date(timestamp);
    
    if (format === 'YYYY-MM-DD') {
      return date.toLocaleDateString('en-CA', {
        timeZone: CAT_TIMEZONE
      });
    }
    
    if (format === 'DD/MM/YYYY') {
      return date.toLocaleDateString('en-GB', {
        timeZone: CAT_TIMEZONE
      });
    }
    
    if (format === 'long') {
      return date.toLocaleDateString('en-US', {
        timeZone: CAT_TIMEZONE,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    return date.toLocaleDateString('en-US', {
      timeZone: CAT_TIMEZONE
    });
  } catch (error) {
    console.error('Error formatting date to CAT:', error);
    return 'Invalid date';
  }
};

/**
 * Get current CAT time
 * @returns {Date} Current time in CAT
 */
export const getCurrentCATTime = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: CAT_TIMEZONE }));
};

/**
 * Check if a timestamp is today in CAT timezone
 * @param {string|Date} timestamp - The timestamp to check
 * @returns {boolean} True if the timestamp is today in CAT
 */
export const isTodayCAT = (timestamp) => {
  if (!timestamp) return false;
  
  try {
    const date = new Date(timestamp);
    const today = new Date();
    
    const dateCAT = formatDateCAT(date);
    const todayCAT = formatDateCAT(today);
    
    return dateCAT === todayCAT;
  } catch (error) {
    console.error('Error checking if timestamp is today in CAT:', error);
    return false;
  }
};

/**
 * Format relative time in CAT (e.g., "2 minutes ago")
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Relative time string
 */
export const formatRelativeTimeCAT = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = new Date(timestamp);
    const now = getCurrentCATTime();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return formatDateCAT(date, 'DD/MM/YYYY');
    }
  } catch (error) {
    console.error('Error formatting relative time in CAT:', error);
    return 'Invalid time';
  }
};

const timezoneUtils = {
  formatTimeCAT,
  formatDateCAT,
  getCurrentCATTime,
  isTodayCAT,
  formatRelativeTimeCAT,
  CAT_TIMEZONE
};

export default timezoneUtils;