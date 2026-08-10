# Firebase Hosting Deployment Guide for Taskpass Admin Portal

This document provides step-by-step commands to build and deploy the Taskpass Admin Portal Web Application to Firebase Hosting.

## Prerequisites
- Node.js (v18+) and npm installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Access to the Firebase Project: `gen-lang-client-0019614066`

---

## 1. Firebase Configuration (`firebase.json`)

Ensure `firebase.json` is placed in the root directory:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## 2. Terminal Commands to Deploy

Execute the following commands in your shell:

```bash
# 1. Login to Firebase CLI
firebase login

# 2. Build the production React web bundle
npm run build

# 3. Deploy web application to Firebase Hosting
firebase deploy --only hosting --project gen-lang-client-0019614066
```

---

## 3. Web URL

Once deployed, the Admin Portal dashboard will be live at:
- `https://gen-lang-client-0019614066.web.app`
- `https://gen-lang-client-0019614066.firebaseapp.com`

---

## 4. Admin Access Controls
Access is restricted to authenticated users with `role: 'admin'` in Firestore (`users/{uid}`) or listed in the `admins/{uid}` collection. Non-admin logins are automatically rejected by the `AdminAuthGuard` and Firestore Security Rules (`firestore.rules`).
