import { useState } from 'react';

import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { getTasks, saveTasks } from '../storage/taskStorage';
import { syncTask } from '../services/syncService';
import { Task } from '../types/task';

type Props = {
  task: Task;
  onUpdated: () => void;
  onCancel: () => void;
};

export default function EditTaskScreen({
  task,
  onUpdated,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [executionDate, setExecutionDate] = useState(
    task.executionDate,
  );
  const [executionTime, setExecutionTime] = useState(
    task.executionTime,
  );
  const [address, setAddress] = useState(task.address);

  const [latitude, setLatitude] = useState(
    task.latitude !== undefined
      ? String(task.latitude)
      : '',
  );

  const [longitude, setLongitude] = useState(
    task.longitude !== undefined
      ? String(task.longitude)
      : '',
  );

  const [selectedImage, setSelectedImage] =
    useState<string | null>(
      task.attachments.length > 0
        ? task.attachments[0].uri
        : null,
    );

  const [isSaving, setIsSaving] = useState(false);

  async function pickImage() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Please allow access to your photos.',
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });

      if (
        !result.canceled &&
        result.assets.length > 0
      ) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error(
        'Image picker error:',
        error,
      );

      Alert.alert(
        'Error',
        'Could not open the photo library.',
      );
    }
  }

  function removeImage() {
    setSelectedImage(null);
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert(
        'Validation',
        'Please enter a task title.',
      );
      return;
    }

    if (!executionDate.trim()) {
      Alert.alert(
        'Validation',
        'Please enter the execution date.',
      );
      return;
    }

    if (!executionTime.trim()) {
      Alert.alert(
        'Validation',
        'Please enter the execution time.',
      );
      return;
    }

    if (!address.trim()) {
      Alert.alert(
        'Validation',
        'Please enter the address.',
      );
      return;
    }

    if (!selectedImage) {
      Alert.alert(
        'Validation',
        'Please add at least one image attachment.',
      );
      return;
    }

    const parsedLatitude = latitude.trim()
      ? Number(latitude.trim())
      : undefined;

    const parsedLongitude = longitude.trim()
      ? Number(longitude.trim())
      : undefined;

    if (
      latitude.trim() &&
      (parsedLatitude === undefined ||
        Number.isNaN(parsedLatitude) ||
        parsedLatitude < -90 ||
        parsedLatitude > 90)
    ) {
      Alert.alert(
        'Validation',
        'Latitude must be between -90 and 90.',
      );
      return;
    }

    if (
      longitude.trim() &&
      (parsedLongitude === undefined ||
        Number.isNaN(parsedLongitude) ||
        parsedLongitude < -180 ||
        parsedLongitude > 180)
    ) {
      Alert.alert(
        'Validation',
        'Longitude must be between -180 and 180.',
      );
      return;
    }

    try {
      setIsSaving(true);

      const tasks: Task[] = await getTasks();
      const now = new Date().toISOString();

      const oldAttachment =
        task.attachments.length > 0
          ? task.attachments[0]
          : null;

      const imageChanged =
        oldAttachment?.uri !== selectedImage;

      let updatedTask: Task | null = null;

      const updatedTasks: Task[] = tasks.map(
        (currentTask): Task => {
          if (currentTask.id !== task.id) {
            return currentTask;
          }

          const updatedAttachments =
            imageChanged
              ? [
                  {
                    id:
                      oldAttachment?.id ??
                      `${task.id}-attachment`,
                    uri: selectedImage,
                    name: `attachment-${task.id}.jpg`,
                    type: 'image/jpeg',
                    createdAt:
                      oldAttachment?.createdAt ??
                      now,
                  },
                ]
              : currentTask.attachments;

          const newHistory = [
            ...currentTask.history,
            {
              id: `${currentTask.id}-edited-${Date.now()}`,
              taskId: currentTask.id,
              action: 'edited' as const,
              description: 'Task information edited',
              timestamp: now,
            },
          ];

          if (imageChanged) {
            newHistory.push({
              id: `${currentTask.id}-attachment-${Date.now()}`,
              taskId: currentTask.id,
              action: 'attachment_added' as const,
              description: 'Image attachment updated',
              timestamp: now,
            });
          }

          updatedTask = {
            ...currentTask,
            title: title.trim(),
            description: description.trim(),
            executionDate: executionDate.trim(),
            executionTime: executionTime.trim(),
            address: address.trim(),
            latitude: parsedLatitude,
            longitude: parsedLongitude,
            attachments: updatedAttachments,
            updatedAt: now,
            syncStatus: 'pending',
            history: newHistory,
          };

          return updatedTask;
        },
      );

      await saveTasks(updatedTasks);

      if (updatedTask) {
        const syncedTask = await syncTask(updatedTask);

        if (syncedTask) {
          const currentTasks = await getTasks();

          const syncedTasks = currentTasks.map(
            currentTask =>
              currentTask.id === updatedTask!.id
                ? syncedTask
                : currentTask,
          );

          await saveTasks(syncedTasks);

          Alert.alert(
            'Success',
            'Task updated and synced successfully.',
            [
              {
                text: 'OK',
                onPress: onUpdated,
              },
            ],
          );
        } else {
          Alert.alert(
            'Saved locally',
            'Task was updated locally. It will remain pending until it can sync.',
            [
              {
                text: 'OK',
                onPress: onUpdated,
              },
            ],
          );
        }
      } else {
        Alert.alert(
          'Error',
          'Task could not be updated.',
        );
      }
    } catch (error) {
      console.error(
        'Failed to update task:',
        error,
      );

      Alert.alert(
        'Error',
        'Failed to update the task. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={onCancel}
            style={styles.headerButton}
          >
            <Text style={styles.backText}>
              ← Back
            </Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            Edit Task
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>
            Title *
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Task title"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            editable={!isSaving}
          />

          <Text style={styles.label}>
            Description
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Task description"
            placeholderTextColor="#9CA3AF"
            style={[
              styles.input,
              styles.textArea,
            ]}
            multiline
            textAlignVertical="top"
            editable={!isSaving}
          />

          <Text style={styles.label}>
            Execution date *
          </Text>

          <TextInput
            value={executionDate}
            onChangeText={setExecutionDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            editable={!isSaving}
          />

          <Text style={styles.label}>
            Execution time *
          </Text>

          <TextInput
            value={executionTime}
            onChangeText={setExecutionTime}
            placeholder="HH:MM"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            editable={!isSaving}
          />

          <Text style={styles.label}>
            Address *
          </Text>

          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Task location"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            editable={!isSaving}
          />

          <View style={styles.locationBox}>
            <Text style={styles.locationTitle}>
              📍 Coordinates
            </Text>

            <Text style={styles.locationHint}>
              Optional. Used for the task map.
            </Text>

            <Text style={styles.coordinateLabel}>
              Latitude
            </Text>

            <TextInput
              value={latitude}
              onChangeText={setLatitude}
              placeholder="e.g. 41.3111"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              keyboardType="numbers-and-punctuation"
              editable={!isSaving}
            />

            <Text style={styles.coordinateLabel}>
              Longitude
            </Text>

            <TextInput
              value={longitude}
              onChangeText={setLongitude}
              placeholder="e.g. 69.2797"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              keyboardType="numbers-and-punctuation"
              editable={!isSaving}
            />
          </View>

          <Text style={styles.label}>
            Attachment *
          </Text>

          {selectedImage ? (
            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri: selectedImage,
                }}
                style={styles.previewImage}
              />

              <View style={styles.imageActions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={pickImage}
                  disabled={isSaving}
                >
                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    Change Image
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.removeButton}
                  onPress={removeImage}
                  disabled={isSaving}
                >
                  <Text
                    style={styles.removeButtonText}
                  >
                    Remove
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.attachmentButton}
              onPress={pickImage}
              disabled={isSaving}
            >
              <Text style={styles.attachmentIcon}>
                +
              </Text>

              <Text style={styles.attachmentTitle}>
                Add Image
              </Text>

              <Text style={styles.attachmentHint}>
                At least one image is required
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[
              styles.saveButton,
              isSaving &&
                styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving
                ? 'Saving...'
                : 'Save Changes'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>
              Cancel
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  headerButton: {
    width: 60,
  },

  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  headerSpacer: {
    width: 60,
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 18,
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
  },

  textArea: {
    minHeight: 110,
  },

  locationBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
  },

  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  locationHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 5,
  },

  coordinateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 14,
    marginBottom: 7,
  },

  imageContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },

  imageActions: {
    flexDirection: 'row',
    marginTop: 10,
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 6,
  },

  secondaryButtonText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },

  removeButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 6,
  },

  removeButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },

  attachmentButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
  },

  attachmentIcon: {
    fontSize: 30,
    fontWeight: '300',
    color: '#4F46E5',
  },

  attachmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 6,
  },

  attachmentHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },

  saveButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
  },
});