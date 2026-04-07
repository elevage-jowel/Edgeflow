'use client'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './config'

export async function uploadTradeScreenshot(userId: string, tradeId: string, file: File): Promise<string> {
  const path = `screenshots/${userId}/${tradeId}/${Date.now()}_${file.name}`
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file)
  return getDownloadURL(snapshot.ref)
}

export async function deleteTradeScreenshot(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url)
    await deleteObject(storageRef)
  } catch {}
}
