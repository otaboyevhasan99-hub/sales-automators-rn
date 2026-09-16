import { Task } from '../types/task';

const API_URL = 'http://192.168.1.6:3000';

export async function syncTask(
  task: Task
): Promise<Task | null> {
  try {
    // Existing remote task:
    // compare local and remote updatedAt first.
    if (task.remoteId) {
      const response = await fetch(
        `${API_URL}/tasks/${encodeURIComponent(
          task.remoteId
        )}`
      );

      // If the remote task does not exist anymore,
      // keep the local task pending instead of
      // accidentally creating a duplicate.
      if (response.status === 404) {
        console.error(
          'Remote task was not found.'
        );

        return null;
      }

      if (!response.ok) {
        console.error(
          `Failed to fetch remote task: HTTP ${response.status}`
        );

        return null;
      }

      const remoteTask =
        (await response.json()) as Task;

      const localTime = Date.parse(
        task.updatedAt
      );

      const remoteTime = Date.parse(
        remoteTask.updatedAt
      );

      // If timestamps are invalid, do not make
      // a potentially destructive conflict decision.
      if (
        Number.isNaN(localTime) ||
        Number.isNaN(remoteTime)
      ) {
        console.error(
          'Invalid updatedAt value. Conflict was not resolved.'
        );

        return null;
      }

      // Remote version is newer.
      // Last Write Wins -> keep remote version.
      if (remoteTime > localTime) {
        return {
          ...remoteTask,
          remoteId: String(
            remoteTask.id ?? task.remoteId
          ),
          syncStatus: 'synced',
        };
      }

      // Local version is newer, or timestamps
      // are exactly equal.
      // Send local version to the server.
      const updateResponse =
        await fetch(
          `${API_URL}/tasks/${encodeURIComponent(
            task.remoteId
          )}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify(task),
          }
        );

      if (!updateResponse.ok) {
        console.error(
          `Remote update failed: HTTP ${updateResponse.status}`
        );

        return null;
      }

      return {
        ...task,
        syncStatus: 'synced',
      };
    }

    // New local task -> create it remotely.
    const response = await fetch(
      `${API_URL}/tasks`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify(task),
      }
    );

    if (!response.ok) {
      console.error(
        `Remote create failed: HTTP ${response.status}`
      );

      return null;
    }

    const remoteTask =
      await response.json();

    if (!remoteTask.id) {
      console.error(
        'Remote server did not return an ID.'
      );

      return null;
    }

    return {
      ...task,
      remoteId: String(
        remoteTask.id
      ),
      syncStatus: 'synced',
    };
  } catch (error) {
    console.error(
      'Failed to sync task:',
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}

export async function updateRemoteTask(
  task: Task
): Promise<boolean> {
  const syncedTask =
    await syncTask(task);

  return syncedTask !== null;
}

export async function deleteRemoteTask(
  task: Task
): Promise<boolean> {
  if (!task.remoteId) {
    return true;
  }

  return deleteRemoteTaskById(
    task.remoteId
  );
}

export async function fetchRemoteTasks(): Promise<Task[]> {
  try {
    const response = await fetch(
      `${API_URL}/tasks`
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(
      'Failed to fetch remote tasks:',
      error instanceof Error
        ? error.message
        : String(error)
    );

    return [];
  }
}

export async function deleteRemoteTaskById(
  remoteId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_URL}/tasks/${encodeURIComponent(
        remoteId
      )}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      console.error(
        `Remote delete failed: HTTP ${response.status}`
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      'Failed to delete remote task:',
      error instanceof Error
        ? error.message
        : String(error)
    );

    return false;
  }
}