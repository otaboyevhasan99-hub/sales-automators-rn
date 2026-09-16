import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Task } from '../types/task';

type Props = {
  task: Task;
  onBack: () => void;
};

export default function HistoryScreen({
  task,
  onBack,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>History</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.taskTitle}>{task.title}</Text>

        <Text style={styles.taskId}>
          Task ID: {task.id}
        </Text>

        {task.history.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              No history yet
            </Text>

            <Text style={styles.emptyText}>
              Changes made to this task will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {task.history
              .slice()
              .reverse()
              .map((item, index) => {
                const date = new Date(item.timestamp);

                return (
                  <View
                    key={item.id}
                    style={styles.historyItem}
                  >
                    <View style={styles.timelineLeft}>
                      <View style={styles.dot} />

                      {index <
                        task.history.length - 1 && (
                        <View style={styles.line} />
                      )}
                    </View>

                    <View style={styles.historyContent}>
                      <Text style={styles.action}>
                        {formatAction(item.action)}
                      </Text>

                      <Text style={styles.description}>
                        {item.description}
                      </Text>

                      <Text style={styles.timestamp}>
                        {formatDate(date)}
                      </Text>
                    </View>
                  </View>
                );
              })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function formatAction(action: string): string {
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
      return 'Task Updated';
  }
}

function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return date.toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  backButton: {
    paddingVertical: 8,
    paddingRight: 10,
  },

  backText: {
    fontSize: 16,
    fontWeight: '600',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  headerSpacer: {
    width: 60,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },

  taskId: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 24,
  },

  timeline: {
    marginTop: 4,
  },

  historyItem: {
    flexDirection: 'row',
    minHeight: 90,
  },

  timelineLeft: {
    width: 28,
    alignItems: 'center',
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#111827',
    marginTop: 4,
  },

  line: {
    flex: 1,
    width: 2,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },

  historyContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 22,
  },

  action: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },

  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 6,
  },

  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },

  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
  },
});