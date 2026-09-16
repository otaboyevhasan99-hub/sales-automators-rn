import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } =
      await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Task reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  return true;
}

export async function scheduleTaskNotification(
  taskId: string,
  title: string,
  executionDate: string,
  executionTime: string
): Promise<string | null> {
  try {
    const dateTime = new Date(
      `${executionDate}T${executionTime}`
    );

    const notificationTime =
      new Date(dateTime.getTime() - 30 * 60 * 1000);

    if (notificationTime <= new Date()) {
      return null;
    }

    const notificationId =
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Task reminder',
          body: `${title} starts in 30 minutes.`,
          data: {
            taskId,
          },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notificationTime,
        },
      });

    return notificationId;
  } catch (error) {
    console.error(
      'Failed to schedule notification:',
      error
    );

    return null;
  }
}

export async function cancelTaskNotification(
  notificationId: string
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(
      notificationId
    );
  } catch (error) {
    console.error(
      'Failed to cancel notification:',
      error
    );
  }
}