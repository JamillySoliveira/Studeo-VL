/**
 * Arquivo de configuração e inicialização do Firebase para a VL AUTOMAÇÕES.
 *
 * Aqui nós configuramos a conexão com o Firebase Authentication (para login dos alunos)
 * e com o Cloud Firestore (banco de dados onde ficam salvos os cursos, módulos, aulas e o progresso).
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";

// Importa as configurações geradas automaticamente pelo ambiente
import firebaseConfigJson from "../firebase-applet-config.json";

// Dados de configuração da aplicação no Firebase
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Evita inicializar o Firebase mais de uma vez caso a página recarregue
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializa a autenticação
export const auth = getAuth(app);

// Provedor de login com o Google
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Inicializa o Cloud Firestore usando o banco padrão do projeto Firebase
export const db = getFirestore(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy
};