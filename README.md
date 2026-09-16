# Sales Automators React Native Intern Test

React Native + TypeScript task management application built for the Sales Automators React Native Mobile Developer Intern test.

## Candidate

Candidate code: `SA-RN-5837`

## Tech Stack

* React Native
* Expo
* TypeScript
* AsyncStorage
* JSON Server
* React Native WebView
* OpenStreetMap
* NetInfo
* Expo Image Picker
* Expo Notifications

## Features

* Create, edit and delete tasks
* Task title and description
* Execution date and time
* Manual address
* Optional latitude and longitude
* Required image attachment
* New / In Progress / Completed / Cancelled statuses
* Status change history
* Task history screen
* Task sorting
* Offline-first local storage
* Offline CRUD
* Automatic synchronization
* Pending / Synced / Failed sync states
* Conflict resolution
* Map with task markers
* Marker opens task details
* Candidate code displayed in the application

## Conflict Strategy

The app uses Last Write Wins (LWW) conflict resolution.

When syncing an existing task, the app compares local and remote `updatedAt` timestamps.

* Newer remote version replaces the local version.
* Newer local version is uploaded to the server.
* Equal timestamps use the local version.
* A missing remote task remains pending instead of creating a duplicate.

## Mock REST Server

Start JSON Server with:

```bash
npx json-server mock-server/db.json --host 0.0.0.0 --port 3000
```

The mobile application connects to the computer using the local network IP address.

Example:

`http://192.168.1.6:3000`

## Installation

```bash
npm install
```

```bash
npx expo start
```

## Project Structure

```text
sales-automators-rn/
├── components/
├── screens/
├── services/
├── storage/
├── types/
├── utils/
├── mock-server/
├── App.tsx
├── package.json
└── README.md
```

## Notes

No authentication or production backend is required for this test.

The project uses JSON Server to demonstrate REST synchronization and offline-first behavior.

## Candidate Code

`SA-RN-5837`
