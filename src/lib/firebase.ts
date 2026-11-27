import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: 'AIzaSyDzLy-Whv1PCVK2aDdt3aTlWWJFoFjcx9g',
      authDomain: 'capmuscu.firebaseapp.com',
      projectId: 'capmuscu',
      messagingSenderId: '445740397887',
      appId: '1:445740397887:web:de9be1c8277a9d87dc8f8a',
    });

export const auth = getAuth(app);
export const db = getFirestore(app);
