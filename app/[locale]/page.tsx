'use client'

import React, { useState, useEffect, ChangeEvent } from 'react'
import type { JSX } from 'react'
import { subscribeUser, unsubscribeUser, sendNotification } from '../actions'
import { useTranslations } from 'next-intl'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

function PushNotificationManager(): JSX.Element {
  const [isSupported, setIsSupported] = useState<boolean>(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [message, setMessage] = useState<string>('')
  const t = useTranslations('PushNotifications')

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker().catch(console.error)
    }
  }, [])

  async function registerServiceWorker(): Promise<void> {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    const sub = await registration.pushManager.getSubscription()
    setSubscription(sub)
  }

  async function subscribeToPush(): Promise<void> {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    })
    setSubscription(sub)
    const serializedSub = JSON.parse(JSON.stringify(sub))
    await subscribeUser(serializedSub)
  }

  async function unsubscribeFromPush(): Promise<void> {
    await subscription?.unsubscribe()
    setSubscription(null)
    await unsubscribeUser()
  }

  async function sendTestNotification(): Promise<void> {
    if (subscription) {
      await sendNotification(message)
      setMessage('')
    }
  }

  if (!isSupported) {
    return <p>Push notifications are not supported in this browser.</p>
  }

  return (
    <div>
      <h3>Push Notifications</h3>
      {subscription ? (
        <>
          <p>You are subscribed to push notifications.</p>
          <button onClick={unsubscribeFromPush}>Unsubscribe</button>
          <input
            type="text"
            placeholder="Enter notification message"
            value={message}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setMessage(e.target.value)
            }
          />
          <button onClick={sendTestNotification}>{t("SendTest")}</button>
        </>
      ) : (
        <>
          <p>You are not subscribed to push notifications.</p>
          <button onClick={subscribeToPush}>Subscribe</button>
        </>
      )}
    </div>
  )
}

function InstallPrompt(): JSX.Element | null {
  const [isIOS, setIsIOS] = useState<boolean>(false)
  const [isStandalone, setIsStandalone] = useState<boolean>(false)

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)
    )

    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
  }, [])


  if (isStandalone) return null

  return (
    <div>
      <h3>Install App</h3>
      <button>Add to Home Screen</button>
      {isIOS && (
        <p>
          To install this app on your iOS device, tap the share button
          <span role="img" aria-label="share icon"> ⎋ </span>
          and then &quot;Add to Home Screen&quot;
          <span role="img" aria-label="plus icon"> ➕ </span>.
        </p>
      )}
    </div>
  )
}

export default function Page(): JSX.Element {
  return (
    <div>
      <PushNotificationManager />
      <InstallPrompt />
    </div>
  )
}
