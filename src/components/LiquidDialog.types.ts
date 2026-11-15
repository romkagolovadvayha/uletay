import type { ReactNode } from 'react';

export type LiquidDialogAction = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
};

export type LiquidDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  actions?: LiquidDialogAction[];
  variant?: 'alert' | 'sheet' | 'popover';
  anchorId?: string;
  id?: string;
};

export type LiquidSelectProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  anchorId: string;
  id: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
};
