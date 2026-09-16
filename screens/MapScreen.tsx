import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Task } from '../types/task';

type Props = {
  tasks: Task[];
  onBack: () => void;
  onTaskPress: (task: Task) => void;
};

export default function MapScreen({
  tasks,
  onBack,
  onTaskPress,
}: Props) {
  const tasksWithLocation = tasks.filter(
    task =>
      task.latitude !== undefined &&
      task.longitude !== undefined
  );

  const markers = tasksWithLocation
    .map(
      task => `
        L.marker([${task.latitude}, ${task.longitude}])
          .addTo(map)
          .bindPopup(${JSON.stringify(task.title)})
          .on('click', function() {
            window.ReactNativeWebView.postMessage(${JSON.stringify(task.id)});
          });
      `
    )
    .join('\n');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />

        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>

      <body>
        <div id="map"></div>

        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

        <script>
          const map = L.map('map').setView(
            [41.3111, 69.2797],
            12
          );

          L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
              maxZoom: 19,
              attribution: '&copy; OpenStreetMap contributors'
            }
          ).addTo(map);

          ${markers}
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Task Map</Text>

        <View style={{ width: 60 }} />
      </View>

      {tasksWithLocation.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            No tasks with location
          </Text>

          <Text style={styles.emptyText}>
            Add latitude and longitude to a task to see it on the map.
          </Text>
        </View>
      ) : (
        <WebView
          source={{ html }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          onMessage={event => {
            const task = tasks.find(
              item => item.id === event.nativeEvent.data
            );

            if (task) {
              onTaskPress(task);
            }
          }}
        />
      )}
    </View>
  );
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

  title: {
    fontSize: 18,
    fontWeight: '700',
  },

  map: {
    flex: 1,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },

  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
  },
});