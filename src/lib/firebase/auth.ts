import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'
import { col } from './collections'
import { UserProfile } from '@/lib/types'

export async function signUp(email: string, password: string, displayName: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  await createUserProfile(cred.user, displayName)
  return cred
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(auth, provider)
  const exists = await getDoc(doc(db, col.user(cred.user.uid)))
  if (!exists.exists()) {
    await createUserProfile(cred.user)
  }
  return cred
}

export async function signOut() {
  return firebaseSignOut(auth)
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email)
}

async function createUserProfile(user: User, displayName?: string) {
  const profile: Omit<UserProfile, 'seeded'> = {
    uid: user.uid,
    email: user.email!,
    displayName: displayName ?? user.displayName ?? 'Trader',
    photoURL: user.photoURL ?? undefined,
    currency: 'USD',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    riskUnit: 'dollar',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await setDoc(doc(db, col.user(user.uid)), profile)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, col.user(uid)))
  return snap.exists() ? (snap.data() as UserProfile) : null
}
