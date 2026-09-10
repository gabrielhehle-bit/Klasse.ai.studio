import React from 'react';
import { TodoWidget, TodoWidgetProps } from './widgets/TodoWidget';

export interface TodoWidgetContentProps extends Partial<TodoWidgetProps> {
  widget?: any;
  onUpdate?: (updates: any) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
  todoList?: any[];
  setTodoList?: (items: any) => void;
}

export const TodoWidgetContent: React.FC<TodoWidgetContentProps> = (props) => {
  return <TodoWidget {...(props as any)} />;
};

export default TodoWidgetContent;
