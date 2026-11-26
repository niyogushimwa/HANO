package rw.hano.app.data

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * SCAFFOLD ONLY — not built or tested.
 * FCM messages are received here but are not yet turned into local notifications.
 * Enable the Cloud Messaging API and add google-services.json before this can run.
 */
class HanoMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: "HANO"
        val body = message.notification?.body ?: ""
        // TODO: build and show a NotificationChannel notification (API 26+).
        // TODO: route reportId in message.data to the report detail screen.
    }

    override fun onNewToken(token: String) {
        // TODO: save the token to /users/{uid}/fcmToken for targeted updates.
    }
}
