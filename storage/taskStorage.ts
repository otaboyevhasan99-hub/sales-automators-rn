import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types/task';

const TASKS_KEY = '@sales_automators_tasks';
const DELETE_QUEUE_KEY = '@sales_automators_delete_queue';

export async function getTasks(): Promise<Task[]> {
  try {
    const data = await AsyncStorage.getItem(TASKS_KEY);

    if (!data) {
      return [];
    }

    return JSON.parse(data);
  } catch (error) {
    console.error(
      'Failed to load tasks:',
      error
    );

    return [];
  }
}

export async function saveTasks(
  tasks: Task[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      TASKS_KEY,
      JSON.stringify(tasks)
    );
  } catch (error) {
    console.error(
      'Failed to save tasks:',
      error
    );

    throw error;
  }
}

export async function clearTasks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TASKS_KEY);
  } catch (error) {
    console.error(
      'Failed to clear tasks:',
      error
    );

    throw error;
  }
}

export async function getDeleteQueue(): Promise<string[]> {
  try {
    const data =
      await AsyncStorage.getItem(
        DELETE_QUEUE_KEY
      );

    if (!data) {
      return [];
    }

    return JSON.parse(data);
  } catch (error) {
    console.error(
      'Failed to load delete queue:',
      error
    );

    return [];
  }
}

export async function addToDeleteQueue(
  remoteId: string
): Promise<void> {
  try {
    const queue =
      await getDeleteQueue();

    if (!queue.includes(remoteId)) {
      queue.push(remoteId);
    }

    await AsyncStorage.setItem(
      DELETE_QUEUE_KEY,
      JSON.stringify(queue)
    );
  } catch (error) {
    console.error(
      'Failed to add task to delete queue:',
      error
    );

    throw error;
  }
}

export async function removeFromDeleteQueue(
  remoteId: string
): Promise<void> {
  try {
    const queue =
      await getDeleteQueue();

    const updatedQueue =
      queue.filter(
        id => id !== remoteId
      );

    await AsyncStorage.setItem(
      DELETE_QUEUE_KEY,
      JSON.stringify(updatedQueue)
    );
  } catch (error) {
    console.error(
      'Failed to remove task from delete queue:',
      error
    );

    throw error;
  }
}