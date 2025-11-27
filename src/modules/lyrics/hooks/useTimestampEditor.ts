import { useState, useCallback } from 'react';
import { parseLrcTime } from '@/modules/lyrics';

export function useTimestampEditor() {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = useCallback((index: number, currentValue: string) => {
    setEditingIndex(index);
    setEditValue(currentValue);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditValue('');
  }, []);

  const saveEdit = useCallback((
    onSave: (index: number, value: number) => void
  ) => {
    if (editingIndex === null) return;
    
    const parsed = parseLrcTime(editValue);
    if (!isNaN(parsed)) {
      onSave(editingIndex, Number(parsed.toFixed(2)));
    }
    cancelEdit();
  }, [editingIndex, editValue, cancelEdit]);

  return {
    editingIndex,
    editValue,
    setEditValue,
    startEdit,
    cancelEdit,
    saveEdit
  };
}
