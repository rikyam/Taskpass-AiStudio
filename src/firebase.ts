import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore 
} from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";

export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, firebaseConfig.firestoreDatabaseId || "(default)");
} catch {
  firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
}

export const db: Firestore = firestoreInstance;

let storageInstance: FirebaseStorage | null = null;
try {
  storageInstance = getStorage(app);
} catch {
  storageInstance = null;
}
export const storage = storageInstance;

export default app;

