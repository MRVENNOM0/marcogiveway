# Giveaway App - Local Setup

This application is built with React, Vite, Express, and Firebase.

## Prerequisites

- Node.js (v18 or higher)
- npm

## Setup Instructions

1.  **Extract the project** to a folder on your computer.
2.  **Open a terminal** in that folder.
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Configure environment variables**:
    - Create a file named `.env` in the root directory.
    - Copy the contents of `.env.example` into `.env`.
    - (Optional) Update the `DISCORD_WEBHOOK_URL` if you want to use your own.
5.  **Run the development server**:
    ```bash
    npm run dev
    ```
6.  **Access the application**:
    - Open your browser and go to `http://localhost:3000`.

## Scripts

- `npm run dev`: Starts the development server with Hot Module Replacement (handled by Vite).
- `npm run build`: Builds the client and server for production.
- `npm run start`: Runs the production build.

## Discord Notifications Setup

To receive notifications in Discord when someone joins a giveaway, you must set the `DISCORD_WEBHOOK_URL` environment variable.

### 1. In AI Studio (Preview Environment)
1. Go to the **Settings** menu (gear icon).
2. Look for the **Secrets** section.
3. Add a new secret:
   - **Key**: `DISCORD_WEBHOOK_URL`
   - **Value**: `https://discord.com/api/webhooks/1505967970529316966/gwHv9ccGqCURwSublDWlD1-lydNeVLZSDCZ7H3PtCckcz_Z0YBmn5iT-GzrORzokTygY`

### 2. On Your Local Machine
1. Create a file named `.env` in the project root.
2. Add the following line:
   ```env
   DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1505967970529316966/gwHv9ccGqCURwSublDWlD1-lydNeVLZSDCZ7H3PtCckcz_Z0YBmn5iT-GzrORzokTygY"
   ```
3. Restart your dev server (`npm run dev`).

## Troubleshooting

### Firestore Connection Issues
If you see "Could not reach Cloud Firestore backend":
- Ensure you have an active internet connection.
- Check if Firestore is enabled in your Firebase project console.
- Verify the credentials in `firebase-applet-config.json`.

### Fetch TypeError
If you see `TypeError: Cannot set property fetch...`:
- This is often caused by browser extensions or older browser environments. Try using a modern browser like Chrome or Edge in Incognito mode.
- The app uses XHR for Discord notifications to minimize this issue.
