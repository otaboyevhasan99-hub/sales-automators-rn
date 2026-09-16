export type TaskStatus =
  | 'new'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type HistoryAction =
  | 'created'
  | 'edited'
  | 'status_changed'
  | 'attachment_added'
  | 'attachment_removed'
  | 'deleted'
  | 'synced';

export interface TaskAttachment {
  id: string;
  uri: string;
  name: string;
  type: string;
  createdAt: string;
}

export interface TaskHistoryItem {
  id: string;
  taskId: string;
  action: HistoryAction;
  description: string;
  timestamp: string;
}

export interface Task {
  id: string;

  // JSON Server's ID is stored separately
  // from the app's local/offline ID.
  remoteId?: string;

  title: string;
  description: string;

  executionDate: string;
  executionTime: string;

  address: string;

  latitude?: number;
  longitude?: number;

  status: TaskStatus;

  attachments: TaskAttachment[];

  createdAt: string;
  updatedAt: string;

  history: TaskHistoryItem[];

  syncStatus: 'pending' | 'synced' | 'failed';
}