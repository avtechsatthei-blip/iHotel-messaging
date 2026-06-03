// ─── config.js ────────────────────────────────────────────────────────────────
// Firebase project configuration and app-wide constants.
//
// SECURITY NOTE:
//   This API key is intentionally in client-side code (Firebase web apps work
//   this way). Protect your database by:
//   1. Restricting this key to your domain in Google Cloud Console →
//      APIs & Services → Credentials → HTTP referrers
//   2. Setting strict Firebase Security Rules (not ".read/.write: true")
//   3. Enabling Firebase App Check
//
// See: https://firebase.google.com/docs/projects/api-keys

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDbI9Df4w5j9ty_csir3uYSEonfuw6RzME",
  authDomain:        "ihotel-messaging.firebaseapp.com",
  databaseURL:       "https://ihotel-messaging-default-rtdb.firebaseio.com",
  projectId:         "ihotel-messaging",
  storageBucket:     "ihotel-messaging.firebasestorage.app",
  messagingSenderId: "1059243069823",
  appId:             "1:1059243069823:web:54167267cd515c8a7a8a4a"
};

export const app = initializeApp(firebaseConfig);
export const db  = getDatabase(app);

// ─── App-wide constants ───────────────────────────────────────────────────────
// Staff PIN for the kiosk settings panel
export const STAFF_PIN = '1900';

// GitHub raw URL base for hosted assets
export const LOGO_WHITE = "https://raw.githubusercontent.com/avtechsatthei-blip/iHotel-messaging/80922d6d8b278759b9a9bbe2b799bec443976fd7/Ihotel%20Logo%20White.png";
export const LOGO_GREY  = "https://raw.githubusercontent.com/avtechsatthei-blip/iHotel-messaging/80922d6d8b278759b9a9bbe2b799bec443976fd7/Ihotel%20Logo%20Grey.png";
