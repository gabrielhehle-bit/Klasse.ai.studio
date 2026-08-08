
import { AppState } from '../types';

export const triggerBackupDownload = (app: AppState) => {
  const dataStr = JSON.stringify(app, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const fileName = `lehrkraft_manager_backup_${app.vorname || 'user'}_${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', url);
  linkElement.setAttribute('download', fileName);
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
  URL.revokeObjectURL(url);
  
  localStorage.setItem('lastBackupTimestamp', Date.now().toString());
  localStorage.removeItem('backupRemindLater');
};

export const isBackupDue = (app: AppState) => {
  if (app.settings?.disableBackupReminders) return false;
  
  const lastBackup = localStorage.getItem('lastBackupTimestamp');
  if (!lastBackup) return true;
  
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const now = Date.now();
  
  // Check if 24h passed
  const timeSinceLast = now - parseInt(lastBackup);
  if (timeSinceLast < day) return false;
  
    // Check if postponed (Remind in 24h logic)
    const remindLater = localStorage.getItem('backupRemindLater');
    if (remindLater) {
      const remindTime = parseInt(remindLater);
      if (now < remindTime) return false;
    }
  
  // Last lesson logic - Trigger during the last hour or after 15:00
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const todayName = days[new Date().getDay()];
  
  // Check if we have a plan for today (app.stammplan uses capitalized German names)
  const todayPlan = app.stammplan?.[todayName];
  if (todayPlan) {
    const hourNumbers = Object.keys(todayPlan).map(Number).filter(n => !!todayPlan[n]);
    if (hourNumbers.length > 0) {
      const lastHour = Math.max(...hourNumbers);
      const timeStr = app.stundenZeiten?.[lastHour];
      
      if (timeStr && timeStr.includes('-')) {
        const timeParts = timeStr.split('-').map(p => p.trim());
        const startStr = timeParts[0];
        const endStr = timeParts[1];
        
        if (startStr.includes(':')) {
          const [h, m] = startStr.split(':').map(Number);
          const startOfLastLesson = new Date();
          startOfLastLesson.setHours(h, m, 0, 0);

          // If we are in the last lesson or after it, trigger
          // If we haven't reached the start of the last lesson yet, wait
          if (now < startOfLastLesson.getTime() && new Date().getHours() < 15) {
            return false;
          }
        }
      }
    } else {
        // No plan for today, maybe weekend? Show after 15:00 if user is working
        if (new Date().getHours() < 15) return false;
    }
  } else {
      // No plan defined for this day string, show after 15:00
      if (new Date().getHours() < 15) return false;
  }
  
  return true;
};

export const postponeBackup = () => {
  const twentyFourHours = 24 * 60 * 60 * 1000;
  localStorage.setItem('backupRemindLater', (Date.now() + twentyFourHours).toString());
};
