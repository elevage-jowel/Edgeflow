import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  DocumentData,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './config'

export async function fetchCollection<T>(path: string, ...constraints: QueryConstraint[]): Promise<T[]> {
  const q = constraints.length > 0 ? query(collection(db, path), ...constraints) : query(collection(db, path))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as T))
}

export async function fetchDoc<T>(path: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, path, id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null
}

export async function createDoc<T extends DocumentData>(path: string, data: T): Promise<string> {
  const ref = await addDoc(collection(db, path), { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  return ref.id
}

export async function setDocById<T extends DocumentData>(path: string, id: string, data: T): Promise<void> {
  await setDoc(doc(db, path, id), { ...data, updatedAt: new Date().toISOString() })
}

export async function updateDocById(path: string, id: string, data: Partial<DocumentData>): Promise<void> {
  await updateDoc(doc(db, path, id), { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteDocById(path: string, id: string): Promise<void> {
  await deleteDoc(doc(db, path, id))
}

export function subscribeCollection<T>(
  path: string,
  callback: (items: T[]) => void,
  ...constraints: QueryConstraint[]
): Unsubscribe {
  const q = constraints.length > 0 ? query(collection(db, path), ...constraints) : query(collection(db, path))
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as T))
    callback(items)
  })
}

export async function batchWrite(ops: { path: string; id: string; data: DocumentData }[]): Promise<void> {
  const batch = writeBatch(db)
  for (const op of ops) {
    const ref = doc(db, op.path, op.id)
    batch.set(ref, { ...op.data, updatedAt: new Date().toISOString() })
  }
  await batch.commit()
}
