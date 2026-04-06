import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from './config'
import { col } from './collections'
import { UserProfile } from '@/lib/types'

const googleProvider = new GoogleAuthProvider()

export async function signUp(email: string, password: string, displayName: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  const profile: UserProfile = {
    uid: cred.user.uid,
    email,
    displayName,
    currency: 'USD',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    riskUnit: 'dollar',
    seeded: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await setDoc(doc(db, col.user(cred.user.uid)), profile)
  return cred.user
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider)
  const ref = doc(db, col.user(cred.user.uid))
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const profile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email ?? '',
      displayName: cred.user.displayName ?? '',
      currency: 'USD',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      riskUnit: 'dollar',
      seeded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await setDoc(ref, profile)
  }
  return cred.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, col.user(uid)))
  return snap.exists() ? (snap.data() as UserProfile) : null
}
