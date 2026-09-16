import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Task } from '../types/task';
import { getTasks, saveTasks } from '../storage/taskStorage';
import { syncTask } from '../services/syncService';
import {
  requestNotificationPermission,
  scheduleTaskNotification,
} from '../services/notificationService';

type Props = {
  onCreated: () => void;
};

export default function CreateTaskScreen({
  onCreated,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [executionDate, setExecutionDate] = useState('');
  const [executionTime, setExecutionTime] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Please allow photo library access.'
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const validateCoordinates = () => {
    if (
      latitude.trim() === '' &&
      longitude.trim() === ''
    ) {
      return true;
    }

    if (
      latitude.trim() === '' ||
      longitude.trim() === ''
    ) {
      Alert.alert(
        'Invalid coordinates',
        'Please enter both latitude and longitude.'
      );

      return false;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      Alert.alert(
        'Invalid coordinates',
        'Latitude and longitude must be numbers.'
      );

      return false;
    }

    if (lat < -90 || lat > 90) {
      Alert.alert(
        'Invalid latitude',
        'Latitude must be between -90 and 90.'
      );

      return false;
    }

    if (lng < -180 || lng > 180) {
      Alert.alert(
        'Invalid longitude',
        'Longitude must be between -180 and 180.'
      );

      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (saving) {
      return;
    }

    if (!title.trim()) {
      Alert.alert(
        'Missing title',
        'Please enter a task title.'
      );
      return;
    }

    if (!executionDate.trim()) {
      Alert.alert(
        'Missing date',
        'Please enter the execution date.'
      );
      return;
    }

    if (!executionTime.trim()) {
      Alert.alert(
        'Missing time',
        'Please enter the execution time.'
      );
      return;
    }

    if (!address.trim()) {
      Alert.alert(
        'Missing address',
        'Please enter the task address.'
      );
      return;
    }

    if (!imageUri) {
      Alert.alert(
        'Image required',
        'Please attach at least one image.'
      );
      return;
    }

    if (!validateCoordinates()) {
      return;
    }

    try {
      setSaving(true);

      const now = new Date().toISOString();

      const taskId =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;

      const parsedLatitude =
        latitude.trim() === ''
          ? undefined
          : Number(latitude);

      const parsedLongitude =
        longitude.trim() === ''
          ? undefined
          : Number(longitude);

      const newTask: Task = {
        id: taskId,

        title: title.trim(),

        description: description.trim(),

        executionDate: executionDate.trim(),

        executionTime: executionTime.trim(),

        address: address.trim(),

        latitude: parsedLatitude,

        longitude: parsedLongitude,

        status: 'new',

        attachments: [
          {
            id: `${Date.now()}-attachment`,
            uri: imageUri,
            name: `task-image-${Date.now()}.jpg`,
            type: 'image',
            createdAt: now,
          },
        ],

        createdAt: now,

        updatedAt: now,

        history: [
          {
            id: `${Date.now()}-created`,
            taskId,
            action: 'created',
            description: 'Task created',
            timestamp: now,
          },
          {
            id: `${Date.now()}-attachment`,
            taskId,
            action: 'attachment_added',
            description: 'Image attachment added',
            timestamp: now,
          },
        ],

        syncStatus: 'pending',
      };

      // Save locally first so the app works offline.
      const existingTasks = await getTasks();

      const updatedTasks = [
        ...existingTasks,
        newTask,
      ];

      await saveTasks(updatedTasks);

      // Try to sync with JSON Server.
      const syncedTask = await syncTask(newTask);

      // Schedule local notification.
      // The notification is scheduled 30 minutes
      // before the task execution time.
      const notificationPermission =
        await requestNotificationPermission();

      if (notificationPermission) {
        await scheduleTaskNotification(
          newTask.id,
          newTask.title,
          newTask.executionDate,
          newTask.executionTime
        );
      }

      // If sync succeeded, replace the local
      // task with the synced task.
      if (syncedTask) {
        const currentTasks = await getTasks();

        const syncedTasks = currentTasks.map(
          task =>
            task.id === newTask.id
              ? syncedTask
              : task
        );

        await saveTasks(syncedTasks);
      }

      Alert.alert(
        'Task created',
        syncedTask
          ? 'Task was saved and synced.'
          : 'Task was saved locally. It will remain pending until it can sync.'
      );

      onCreated();
    } catch (error) {
      console.error(
        'Failed to create task:',
        error
      );

      Alert.alert(
        'Error',
        'Failed to create task.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          Create Task
        </Text>

        <Text style={styles.subtitle}>
          Add a new field task
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>
            Title *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter task title"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Description
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            placeholder="Enter task description"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.row}>
          <View
            style={[
              styles.field,
              styles.halfField,
            ]}
          >
            <Text style={styles.label}>
              Date *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="2026-09-20"
              placeholderTextColor="#9CA3AF"
              value={executionDate}
              onChangeText={setExecutionDate}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View
            style={[
              styles.field,
              styles.halfField,
            ]}
          >
            <Text style={styles.label}>
              Time *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="14:30"
              placeholderTextColor="#9CA3AF"
              value={executionTime}
              onChangeText={setExecutionTime}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Address *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter task address"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <Text style={styles.coordinatesTitle}>
          Coordinates (optional)
        </Text>

        <View style={styles.row}>
          <View
            style={[
              styles.field,
              styles.halfField,
            ]}
          >
            <Text style={styles.label}>
              Latitude
            </Text>

            <TextInput
              style={styles.input}
              placeholder="41.3111"
              placeholderTextColor="#9CA3AF"
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View
            style={[
              styles.field,
              styles.halfField,
            ]}
          >
            <Text style={styles.label}>
              Longitude
            </Text>

            <TextInput
              style={styles.input}
              placeholder="69.2797"
              placeholderTextColor="#9CA3AF"
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Image *
          </Text>

          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
              />

              <Pressable
                style={styles.removeButton}
                onPress={() =>
                  setImageUri(null)
                }
              >
                <Text
                  style={styles.removeButtonText}
                >
                  Remove
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.imagePicker}
              onPress={pickImage}
            >
              <Text style={styles.imageIcon}>
                📷
              </Text>

              <Text
                style={styles.imagePickerTitle}
              >
                Add Image
              </Text>

              <Text
                style={styles.imagePickerText}
              >
                At least one image is required
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          style={[
            styles.createButton,
            saving &&
              styles.createButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Text
            style={styles.createButtonText}
          >
            {saving
              ? 'Creating...'
              : 'Create Task'}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 28,
  },

  field: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 7,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },

  textArea: {
    minHeight: 100,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  halfField: {
    flex: 1,
  },

  coordinatesTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
    marginBottom: 12,
  },

  imageContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },

  image: {
    width: '100%',
    height: 210,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },

  removeButton: {
    marginTop: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center',
  },

  removeButtonText: {
    color: '#DC2626',
    fontWeight: '700',
  },

  imagePicker: {
    minHeight: 170,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  imageIcon: {
    fontSize: 35,
    marginBottom: 10,
  },

  imagePickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  imagePickerText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },

  createButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
