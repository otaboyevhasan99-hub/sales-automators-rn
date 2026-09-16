import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Task, TaskStatus } from '../types/task';
import {
  getTasks,
  saveTasks,
  addToDeleteQueue,
} from '../storage/taskStorage';
import {
  updateRemoteTask,
  deleteRemoteTask,
} from '../services/syncService';

type Props = {
  task: Task;
  onBack: () => void;
  onEdit: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onHistory: () => void;
};

export default function TaskDetailScreen({
  task,
  onBack,
  onEdit,
  onUpdated,
  onDeleted,
  onHistory,
}: Props) {
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const updateStatus = async (
    newStatus: TaskStatus
  ) => {
    if (updating || newStatus === task.status) {
      return;
    }

    try {
      setUpdating(true);

      const now = new Date().toISOString();

      const updatedTask: Task = {
        ...task,
        status: newStatus,
        updatedAt: now,
        syncStatus: 'pending',
        history: [
          ...task.history,
          {
            id: `${Date.now()}-status`,
            taskId: task.id,
            action: 'status_changed',
            description: `Status changed to ${formatStatus(
              newStatus
            )}`,
            timestamp: now,
          },
        ],
      };

      const tasks = await getTasks();

      const updatedTasks = tasks.map(item =>
        item.id === task.id
          ? updatedTask
          : item
      );

      await saveTasks(updatedTasks);

      const synced = await updateRemoteTask(
        updatedTask
      );

      if (synced) {
        const latestTasks = await getTasks();

        await saveTasks(
          latestTasks.map(item =>
            item.id === task.id
              ? {
                  ...item,
                  syncStatus: 'synced' as const,
                }
              : item
          )
        );
      }

      onUpdated();
    } catch (error) {
      console.error(
        'Failed to update status:',
        error
      );

      Alert.alert(
        'Error',
        'Failed to update task status.'
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete task',
      'Are you sure you want to delete this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteTask,
        },
      ]
    );
  };

  const deleteTask = async () => {
    if (deleting) {
      return;
    }

    try {
      setDeleting(true);

      const remoteDeleted =
        await deleteRemoteTask(task);

      /*
       * If the task already exists on the server
       * but cannot be deleted now, remember its
       * remote ID so App.tsx can delete it when
       * the connection becomes available.
       */
      if (
        task.remoteId &&
        !remoteDeleted
      ) {
        await addToDeleteQueue(
          task.remoteId
        );
      }

      const tasks = await getTasks();

      const remainingTasks = tasks.filter(
        item => item.id !== task.id
      );

      await saveTasks(remainingTasks);

      if (
        task.remoteId &&
        !remoteDeleted
      ) {
        Alert.alert(
          'Deleted locally',
          'The task was deleted from this device. The server copy will be deleted automatically when the connection is restored.',
          [
            {
              text: 'OK',
              onPress: onDeleted,
            },
          ]
        );
      } else {
        onDeleted();
      }
    } catch (error) {
      console.error(
        'Failed to delete task:',
        error
      );

      Alert.alert(
        'Error',
        'Failed to delete task.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={onBack}
        >
          <Text style={styles.headerButtonText}>
            ← Back
          </Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Task Details
        </Text>

        <Pressable
          style={styles.headerButton}
          onPress={onEdit}
        >
          <Text style={styles.headerButtonText}>
            Edit
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>
              {task.title}
            </Text>

            <View
              style={[
                styles.statusBadge,
                task.status === 'completed' &&
                  styles.completedBadge,
                task.status === 'in_progress' &&
                  styles.progressBadge,
                task.status === 'cancelled' &&
                  styles.cancelledBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  task.status === 'completed' &&
                    styles.completedText,
                  task.status === 'in_progress' &&
                    styles.progressText,
                  task.status === 'cancelled' &&
                    styles.cancelledText,
                ]}
              >
                {formatStatus(task.status)}
              </Text>
            </View>
          </View>

          {task.description ? (
            <Text style={styles.description}>
              {task.description}
            </Text>
          ) : (
            <Text style={styles.noDescription}>
              No description
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Schedule
          </Text>

          <InfoRow
            label="Date"
            value={task.executionDate}
          />

          <InfoRow
            label="Time"
            value={task.executionTime}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Location
          </Text>

          <InfoRow
            label="Address"
            value={task.address}
          />

          {task.latitude !== undefined &&
            task.longitude !== undefined && (
              <>
                <InfoRow
                  label="Latitude"
                  value={String(task.latitude)}
                />

                <InfoRow
                  label="Longitude"
                  value={String(task.longitude)}
                />
              </>
            )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Sync
          </Text>

          <InfoRow
            label="Local ID"
            value={task.id}
          />

          <InfoRow
            label="Remote ID"
            value={
              task.remoteId ??
              'Not synced yet'
            }
          />

          <InfoRow
            label="Status"
            value={formatSyncStatus(
              task.syncStatus
            )}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              Attachments
            </Text>

            <Text style={styles.countText}>
              {task.attachments.length}
            </Text>
          </View>

          {task.attachments.length === 0 ? (
            <Text style={styles.emptyText}>
              No attachments
            </Text>
          ) : (
            task.attachments.map(
              attachment => (
                <View
                  key={attachment.id}
                  style={styles.attachment}
                >
                  <Image
                    source={{
                      uri: attachment.uri,
                    }}
                    style={styles.attachmentImage}
                  />

                  <View
                    style={styles.attachmentInfo}
                  >
                    <Text
                      style={styles.attachmentName}
                      numberOfLines={2}
                    >
                      {attachment.name}
                    </Text>

                    <Text
                      style={
                        styles.attachmentDate
                      }
                    >
                      {formatDate(
                        attachment.createdAt
                      )}
                    </Text>
                  </View>
                </View>
              )
            )
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Update Status
          </Text>

          <View style={styles.statusButtons}>
            <StatusButton
              label="New"
              active={task.status === 'new'}
              disabled={updating}
              onPress={() =>
                updateStatus('new')
              }
            />

            <StatusButton
              label="In Progress"
              active={
                task.status === 'in_progress'
              }
              disabled={updating}
              onPress={() =>
                updateStatus('in_progress')
              }
            />

            <StatusButton
              label="Completed"
              active={
                task.status === 'completed'
              }
              disabled={updating}
              onPress={() =>
                updateStatus('completed')
              }
            />

            <StatusButton
              label="Cancelled"
              active={
                task.status === 'cancelled'
              }
              disabled={updating}
              onPress={() =>
                updateStatus('cancelled')
              }
            />
          </View>
        </View>

        <Pressable
          style={styles.historyButton}
          onPress={onHistory}
        >
          <Text style={styles.historyButtonText}>
            View Full History
          </Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Recent Activity
          </Text>

          {task.history.length === 0 ? (
            <Text style={styles.emptyText}>
              No activity yet
            </Text>
          ) : (
            task.history
              .slice()
              .reverse()
              .slice(0, 3)
              .map(item => (
                <View
                  key={item.id}
                  style={styles.activity}
                >
                  <View
                    style={styles.activityDot}
                  />

                  <View
                    style={
                      styles.activityContent
                    }
                  >
                    <Text
                      style={styles.activityTitle}
                    >
                      {formatHistoryAction(
                        item.action
                      )}
                    </Text>

                    <Text
                      style={
                        styles.activityDescription
                      }
                    >
                      {item.description}
                    </Text>

                    <Text
                      style={styles.activityDate}
                    >
                      {formatDate(
                        item.timestamp
                      )}
                    </Text>
                  </View>
                </View>
              ))
          )}
        </View>

        <Pressable
          style={[
            styles.deleteButton,
            deleting &&
              styles.deleteButtonDisabled,
          ]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={styles.deleteButtonText}>
            {deleting
              ? 'Deleting...'
              : 'Delete Task'}
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerCode}>
            SA-RN-5837
          </Text>

          <Text style={styles.footerText}>
            Sales Automators RN Intern Test
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={styles.infoValue}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

function StatusButton({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.statusButton,
        active && styles.statusButtonActive,
        disabled &&
          styles.statusButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.statusButtonText,
          active &&
            styles.statusButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatStatus(
  status: TaskStatus
): string {
  switch (status) {
    case 'new':
      return 'New';

    case 'in_progress':
      return 'In Progress';

    case 'completed':
      return 'Completed';

    case 'cancelled':
      return 'Cancelled';

    default:
      return status;
  }
}

function formatSyncStatus(
  status: Task['syncStatus']
): string {
  switch (status) {
    case 'synced':
      return 'Synced';

    case 'pending':
      return 'Pending';

    case 'failed':
      return 'Failed';

    default:
      return status;
  }
}

function formatHistoryAction(
  action: string
): string {
  switch (action) {
    case 'created':
      return 'Task Created';

    case 'edited':
      return 'Task Edited';

    case 'status_changed':
      return 'Status Changed';

    case 'attachment_added':
      return 'Attachment Added';

    case 'attachment_removed':
      return 'Attachment Removed';

    case 'deleted':
      return 'Task Deleted';

    case 'synced':
      return 'Task Synced';

    default:
      return action;
  }
}

function formatDate(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  headerButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },

  headerTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  titleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  title: {
    flex: 1,
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
    marginRight: 12,
  },

  statusBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  completedBadge: {
    backgroundColor: '#ECFDF5',
  },

  progressBadge: {
    backgroundColor: '#FFF7ED',
  },

  cancelledBadge: {
    backgroundColor: '#FEF2F2',
  },

  statusText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '800',
  },

  completedText: {
    color: '#047857',
  },

  progressText: {
    color: '#C2410C',
  },

  cancelledText: {
    color: '#B91C1C',
  },

  description: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
  },

  noDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 14,
    fontStyle: 'italic',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },

  countText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  infoLabel: {
    width: 90,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },

  infoValue: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },

  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 9,
    marginBottom: 9,
  },

  attachmentImage: {
    width: 70,
    height: 70,
    borderRadius: 9,
    backgroundColor: '#E5E7EB',
  },

  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },

  attachmentName: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },

  attachmentDate: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 5,
  },

  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  statusButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  statusButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },

  statusButtonDisabled: {
    opacity: 0.5,
  },

  statusButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },

  statusButtonTextActive: {
    color: '#FFFFFF',
  },

  historyButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },

  historyButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },

  emptyText: {
    color: '#9CA3AF',
    fontSize: 13,
  },

  activity: {
    flexDirection: 'row',
    paddingVertical: 8,
  },

  activityDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#111827',
    marginTop: 5,
    marginRight: 11,
  },

  activityContent: {
    flex: 1,
  },

  activityTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },

  activityDescription: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 3,
  },

  activityDate: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
  },

  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },

  deleteButtonDisabled: {
    opacity: 0.5,
  },

  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '800',
  },

  footer: {
    alignItems: 'center',
    marginTop: 35,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  footerCode: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },

  footerText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
  },
});