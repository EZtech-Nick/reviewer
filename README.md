# EZTechNick Reviewer

A serverless examination and review system built with **React** (Frontend) and **Google Sheets** (Backend).

## Features
- **Student Portal:** Take exams without logging in.
- **Admin Panel:** Manage subjects and questions securey.
- **Real-time Scoring:** Instant feedback for objective questions.
- **Google Sheets Backend:** All data is stored in your own Google Sheet.
- **Enumeration Support:** Dynamic checking for list-type answers.

## Setup Guide

### 1. Backend (Google Apps Script)
1. Open the [Google Apps Script Dashboard](https://script.google.com/).
2. Create a new project.
3. Copy the code from `backend/Code.gs` in this repository.
4. Paste it into the editor.
5. **Config:** Change the `ADMIN_PASSWORD` variable at the top of the file.
6. **Run Setup:** Select the `setup` function from the dropdown and click **Run**. This creates the necessary sheets (Subjects, Questions, Results).
7. **Deploy:**
   - Click **Deploy** > **New Deployment**.
   - Select type: **Web App**.
   - Description: "Initial Deploy".
   - Execute as: **Me**.
   - Who has access: **Anyone** (Critical for the app to work).
   - Click **Deploy** and copy the **Web App URL**.

### 2. Frontend (React)
1. Clone this repository.
2. Install dependencies: `npm install`.
3. Run locally: `npm start` (or `npm run dev`).

### 3. Connecting Frontend to Backend
1. Open the web application.
2. Go to **Admin** panel.
3. Click the **Settings (Gear Icon)**.
4. Paste your **Web App URL**.
5. Save.

## Deployment
This app is optimized for static hosting providers like **Vercel** or **Netlify**.

1. Push this code to GitHub.
2. Import the repository into Vercel.
3. Click Deploy.
