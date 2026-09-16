import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import CreateTaskScreen from './screens/CreateTaskScreen';
import EditTaskScreen from './screens/EditTaskScreen';
import TaskDetailScreen from './screens/TaskDetailScreen';
import MapScreen from './screens/MapScreen';
import HistoryScreen from './screens/HistoryScreen';

import {
  getTasks,
  saveTasks,
  getDeleteQueue,
  removeFromDeleteQueue,
} from './storage/taskStorage';

import {
  syncTask,
  deleteRemoteTaskById,
} from './services/syncService';

import { Task } from './types/task';

type Screen =
  | 'tasks'
  | 'create'
  | 'detail'
  | 'edit'
  | 'map'
  | 'history';

type SortOption =
  | 'added'
  | 'due'
  | 'status';

export default function App() {
  const [screen, setScreen] =
    useState<Screen>('tasks');

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [selectedTask, setSelectedTask] =
    useState<Task | null>(null);

  const [sortOption, setSortOption] =
    useState<SortOption>('added');

  async function loadTasks() {
    const savedTasks = await getTasks();

    setTasks(savedTasks);

    if (selectedTask) {
      const updatedTask = savedTasks.find(
        task => task.id === selectedTask.id
      );

      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    }
  }

  async function syncPendingTasks() {
  try {
    // 1. First process tasks that were deleted
    // locally while the server was unavailable.
    const deleteQueue =
      await getDeleteQueue();

    for (const remoteId of deleteQueue) {
      const deleted =
        await deleteRemoteTaskById(remoteId);

      if (deleted) {
        await removeFromDeleteQueue(
          remoteId
        );
      }
    }

    // 2. Then sync pending/failed tasks.
    const currentTasks =
      await getTasks();

    const pendingTasks =
      currentTasks.filter(
        task =>
          task.syncStatus === 'pending' ||
          task.syncStatus === 'failed'
      );

    if (pendingTasks.length === 0) {
      setTasks(currentTasks);
      return;
    }

    let updatedTasks = [
      ...currentTasks,
    ];

    for (const pendingTask of pendingTasks) {
      const syncedTask =
        await syncTask(pendingTask);

      if (syncedTask) {
        updatedTasks =
          updatedTasks.map(task =>
            task.id === pendingTask.id
              ? syncedTask
              : task
          );
      } else {
        updatedTasks =
          updatedTasks.map(task =>
            task.id === pendingTask.id
              ? {
                  ...task,
                  syncStatus: 'failed',
                }
              : task
          );
      }
    }

    await saveTasks(updatedTasks);

    setTasks(updatedTasks);

    if (selectedTask) {
      const updatedSelectedTask =
        updatedTasks.find(
          task =>
            task.id === selectedTask.id
        );

      if (updatedSelectedTask) {
        setSelectedTask(
          updatedSelectedTask
        );
      }
    }
  } catch (error) {
    console.error(
      'Failed to sync pending tasks:',
      error
    );
  }
}

  useEffect(() => {
    const initializeApp = async () => {
      await loadTasks();

      const state = await NetInfo.fetch();

      if (state.isConnected) {
        await syncPendingTasks();
      }
    };

    initializeApp();

    const unsubscribe =
      NetInfo.addEventListener(state => {
        if (state.isConnected) {
          syncPendingTasks();
        }
      });

    return unsubscribe;
  }, []);

  const sortedTasks = [...tasks].sort(
    (a, b) => {
      if (sortOption === 'added') {
        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      }

      if (sortOption === 'due') {
        const aDue = new Date(
          `${a.executionDate}T${a.executionTime}`
        ).getTime();

        const bDue = new Date(
          `${b.executionDate}T${b.executionTime}`
        ).getTime();

        return aDue - bDue;
      }

      const statusOrder: Record<
        Task['status'],
        number
      > = {
        new: 1,
        in_progress: 2,
        completed: 3,
        cancelled: 4,
      };

      return (
        statusOrder[a.status] -
        statusOrder[b.status]
      );
    }
  );

  /*
   * CREATE TASK
   */
  if (screen === 'create') {
    return (
      <View style={styles.screen}>
        <CreateTaskScreen
          onCreated={async () => {
            await loadTasks();
            setScreen('tasks');
          }}
        />

        <Pressable
          style={styles.floatingBackButton}
          onPress={() => setScreen('tasks')}
        >
          <Text style={styles.backButtonText}>
            ← Back
          </Text>
        </Pressable>
      </View>
    );
  }

  /*
   * EDIT TASK
   */
  if (
    screen === 'edit' &&
    selectedTask
  ) {
    return (
      <EditTaskScreen
        task={selectedTask}
        onUpdated={async () => {
          await loadTasks();
          setScreen('detail');
        }}
        onCancel={() => {
          setScreen('detail');
        }}
      />
    );
  }

  /*
   * TASK DETAIL
   */
  if (
    screen === 'detail' &&
    selectedTask
  ) {
    return (
      <TaskDetailScreen
        task={selectedTask}

        onBack={() => {
          setSelectedTask(null);
          setScreen('tasks');
        }}

        onEdit={() => {
          setScreen('edit');
        }}

        onUpdated={async () => {
          await loadTasks();
        }}

        onDeleted={async () => {
          const updatedTasks = tasks.filter(
            task =>
              task.id !== selectedTask.id
          );

          await saveTasks(updatedTasks);

          setSelectedTask(null);
          setScreen('tasks');

          await loadTasks();
        }}

        onHistory={() => {
          setScreen('history');
        }}
      />
    );
  }

  /*
   * MAP
   */
  if (screen === 'map') {
    return (
      <MapScreen
        tasks={tasks}
        onBack={() => setScreen('tasks')}
        onTaskPress={task => {
          setSelectedTask(task);
          setScreen('detail');
        }}
      />
    );
  }

  /*
   * HISTORY
   */
  if (
    screen === 'history' &&
    selectedTask
  ) {
    return (
      <HistoryScreen
        task={selectedTask}
        onBack={() => setScreen('detail')}
      />
    );
  }

  /*
   * TASK LIST
   */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>
            Field Tasks
          </Text>

          <Text style={styles.subtitle}>
            Daily productivity
          </Text>
        </View>

        <View style={styles.headerButtons}>
          <Pressable
            style={styles.mapButton}
            onPress={() => setScreen('map')}
          >
            <Text style={styles.mapButtonText}>
              Map
            </Text>
          </Pressable>

          <Pressable
            style={styles.addButton}
            onPress={() => setScreen('create')}
          >
            <Text style={styles.addButtonText}>
              + New Task
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {tasks.length}
            </Text>

            <Text style={styles.statLabel}>
              Total
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {
                tasks.filter(
                  task =>
                    task.status === 'completed'
                ).length
              }
            </Text>

            <Text style={styles.statLabel}>
              Completed
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {
                tasks.filter(
                  task =>
                    task.status === 'in_progress'
                ).length
              }
            </Text>

            <Text style={styles.statLabel}>
              Active
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Tasks
          </Text>

          <Text style={styles.taskCount}>
            {tasks.length}
          </Text>
        </View>

        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>
            Sort:
          </Text>

          <Pressable
            style={[
              styles.sortButton,
              sortOption === 'added' &&
                styles.activeSortButton,
            ]}
            onPress={() =>
              setSortOption('added')
            }
          >
            <Text
              style={[
                styles.sortButtonText,
                sortOption === 'added' &&
                  styles.activeSortButtonText,
              ]}
            >
              Added
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.sortButton,
              sortOption === 'due' &&
                styles.activeSortButton,
            ]}
            onPress={() =>
              setSortOption('due')
            }
          >
            <Text
              style={[
                styles.sortButtonText,
                sortOption === 'due' &&
                  styles.activeSortButtonText,
              ]}
            >
              Due
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.sortButton,
              sortOption === 'status' &&
                styles.activeSortButton,
            ]}
            onPress={() =>
              setSortOption('status')
            }
          >
            <Text
              style={[
                styles.sortButtonText,
                sortOption === 'status' &&
                  styles.activeSortButtonText,
              ]}
            >
              Status
            </Text>
          </Pressable>
        </View>

        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              📋
            </Text>

            <Text style={styles.emptyTitle}>
              No tasks yet
            </Text>

            <Text style={styles.emptyText}>
              Create your first field task
              to get started.
            </Text>

            <Pressable
              style={styles.emptyButton}
              onPress={() =>
                setScreen('create')
              }
            >
              <Text
                style={styles.emptyButtonText}
              >
                Create Task
              </Text>
            </Pressable>
          </View>
        ) : (
          sortedTasks.map(task => (
            <Pressable
              key={task.id}
              style={styles.taskCard}
              onPress={() => {
                setSelectedTask(task);
                setScreen('detail');
              }}
            >
              <View style={styles.taskCardTop}>
                <Text
                  style={styles.taskTitle}
                  numberOfLines={2}
                >
                  {task.title}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    task.status ===
                      'completed' &&
                      styles.completedBadge,
                    task.status ===
                      'in_progress' &&
                      styles.progressBadge,
                    task.status ===
                      'cancelled' &&
                      styles.cancelledBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      task.status ===
                        'completed' &&
                        styles.completedText,
                      task.status ===
                        'in_progress' &&
                        styles.progressText,
                      task.status ===
                        'cancelled' &&
                        styles.cancelledText,
                    ]}
                  >
                    {formatStatus(
                      task.status
                    )}
                  </Text>
                </View>
              </View>

              <Text style={styles.taskInfo}>
                📅 {task.executionDate} •{' '}
                {task.executionTime}
              </Text>

              <Text
                style={styles.taskInfo}
                numberOfLines={1}
              >
                📍 {task.address}
              </Text>

              <View
                style={styles.taskCardBottom}
              >
                <Text
                  style={styles.attachmentCount}
                >
                  📎 {task.attachments.length}{' '}
                  attachment
                  {task.attachments.length !== 1
                    ? 's'
                    : ''}
                </Text>

                <Text style={styles.syncStatus}>
                  {task.syncStatus === 'synced'
                    ? '✓ Synced'
                    : task.syncStatus ===
                        'failed'
                      ? '⚠ Failed'
                      : '○ Pending'}
                </Text>
              </View>
            </Pressable>
          ))
        )}

        <View style={styles.footer}>
          <Text style={styles.footerCode}>
            SA-RN-5837
          </Text>

          <Text style={styles.footerText}>
            Sales Automators RN Intern Test
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatStatus(
  status: Task['status']
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  screen: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  appTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },

  mapButton: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 11,
  },

  mapButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },

  addButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 11,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  statsRow: {
    flexDirection: 'row',
    marginBottom: 28,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 23,
    fontWeight: '800',
    color: '#111827',
  },

  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  taskCount: {
    marginLeft: 8,
    backgroundColor: '#E5E7EB',
    color: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
  },

  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  sortLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginRight: 8,
  },

  sortButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    marginRight: 6,
  },

  activeSortButton: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },

  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },

  activeSortButtonText: {
    color: '#FFFFFF',
  },

  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  taskCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  taskTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginRight: 10,
  },

  statusBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
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
    fontWeight: '700',
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

  taskInfo: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 10,
  },

  taskCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  attachmentCount: {
    fontSize: 12,
    color: '#6B7280',
  },

  syncStatus: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },

  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  emptyButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 11,
    marginTop: 18,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  floatingBackButton: {
    position: 'absolute',
    left: 16,
    bottom: 18,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 11,
  },

  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  footer: {
    alignItems: 'center',
    marginTop: 35,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  footerCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  footerText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
});