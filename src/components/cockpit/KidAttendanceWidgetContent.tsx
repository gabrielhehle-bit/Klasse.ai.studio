import React from 'react';
import { AppState, Student, CockpitWidgetConfig } from '../../types';
import { KidAttendanceWidget } from './widgets/KidAttendanceWidget';
import { getDisplayStudentName } from './studentSelectionUtils';

export interface KidAttendanceWidgetContentProps {
  app: AppState;
  setApp: React.Dispatch<React.SetStateAction<AppState>>;
  currentIsLight: boolean;
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

/**
 * Backward compatibility helper for unique display names
 */
export function computeKidDisplayNames(students: Student[]): Map<string, string> {
  const result = new Map<string, string>();
  if (!students || students.length === 0) return result;

  students.forEach((s) => {
    result.set(s.id, getDisplayStudentName(s, students));
  });

  return result;
}

/**
 * KidAttendanceWidgetContent: Standard-konformer Check-In für Cockpit & Smartboard
 */
export const KidAttendanceWidgetContent: React.FC<KidAttendanceWidgetContentProps> = (props) => {
  return <KidAttendanceWidget {...props} />;
};

export default KidAttendanceWidgetContent;
