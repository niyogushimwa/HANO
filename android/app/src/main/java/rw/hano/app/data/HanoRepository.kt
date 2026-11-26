package rw.hano.app.data

import android.net.Uri
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.tasks.await

/**
 * SCAFFOLD ONLY — not built, compiled or tested.
 * Requires: google-services.json, Firebase Auth (email/password), Firestore rules,
 * Storage rules and a populated `users` collection.
 */
class HanoRepository(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance(),
    private val storage: FirebaseStorage = FirebaseStorage.getInstance(),
) {
    val currentUserId: String? get() = auth.currentUser?.uid

    suspend fun register(name: String, email: String, phone: String, password: String) {
        val result = auth.createUserWithEmailAndPassword(email, password).await()
        val uid = result.user?.uid ?: error("Firebase did not return a user id.")
        firestore.collection("users").document(uid).set(
            mapOf(
                "name" to name,
                "email" to email,
                "phone" to phone,
                "role" to Role.CITIZEN.name.lowercase(),
                "createdAt" to System.currentTimeMillis(),
            )
        ).await()
    }

    suspend fun login(identifier: String, password: String) {
        // Firebase Auth uses email. If a phone was entered, look it up in Firestore first.
        val email = if (identifier.contains("@")) identifier else resolveEmailByPhone(identifier)
        auth.signInWithEmailAndPassword(email, password).await()
    }

    private suspend fun resolveEmailByPhone(phone: String): String {
        val snapshot = firestore.collection("users").whereEqualTo("phone", phone).limit(1).get().await()
        return snapshot.documents.firstOrNull()?.getString("email") ?: error("No account found for that phone.")
    }

    fun logout() = auth.signOut()

    fun observeReports(onChange: (List<Report>) -> Unit, onError: (Exception) -> Unit) =
        firestore.collection("reports").orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { onError(error); return@addSnapshotListener }
                val items = snapshot?.documents.orEmpty().mapNotNull { doc ->
                    try {
                        Report(
                            id = doc.id,
                            userId = doc.getString("userId").orEmpty(),
                            category = Category.fromFirestore(doc.getString("category")),
                            title = doc.getString("title").orEmpty(),
                            description = doc.getString("description").orEmpty(),
                            photoUrl = doc.getString("photoUrl"),
                            latitude = doc.getDouble("latitude"),
                            longitude = doc.getDouble("longitude"),
                            locationName = doc.getString("locationName"),
                            status = ReportStatus.fromFirestore(doc.getString("status")),
                            departmentId = doc.getString("departmentId"),
                            rejectedReason = doc.getString("rejectedReason"),
                            resolvedConfirmed = doc.getBoolean("resolvedConfirmed") == true,
                            createdAt = doc.getLong("createdAt") ?: 0L,
                            updatedAt = doc.getLong("updatedAt") ?: 0L,
                        )
                    } catch (e: Exception) {
                        null // skip malformed documents instead of crashing the feed
                    }
                }
                onChange(items)
            }

    suspend fun createReport(
        category: Category,
        title: String,
        description: String,
        locationName: String?,
        latitude: Double?,
        longitude: Double?,
        photoUri: Uri?,
    ): String {
        val uid = currentUserId ?: error("Please sign in to report a problem.")
        val id = firestore.collection("reports").document().id
        val photoUrl = photoUri?.let { uri ->
            val ref = storage.reference.child("reports/$id/${System.currentTimeMillis()}.jpg")
            ref.putFile(uri).await()
            ref.downloadUrl.await().toString()
        }
        val now = System.currentTimeMillis()
        firestore.collection("reports").document(id).set(
            mapOf(
                "userId" to uid,
                "category" to category.name.lowercase(),
                "title" to title,
                "description" to description,
                "photoUrl" to photoUrl,
                "latitude" to latitude,
                "longitude" to longitude,
                "locationName" to locationName,
                "status" to ReportStatus.SUBMITTED.name.lowercase(),
                "departmentId" to null,
                "rejectedReason" to null,
                "resolvedConfirmed" to false,
                "createdAt" to now,
                "updatedAt" to now,
            )
        ).await()
        return id
    }

    suspend fun updateStatus(reportId: String, status: ReportStatus, departmentId: String?, note: String?) {
        firestore.collection("reports").document(reportId).update(
            mapOf(
                "status" to status.name.lowercase(),
                "departmentId" to departmentId,
                "rejectedReason" to if (status == ReportStatus.REJECTED) note else null,
                "updatedAt" to System.currentTimeMillis(),
            )
        ).await()
        addUpdate(reportId, status.name, note)
    }

    suspend fun confirmResolved(reportId: String) {
        firestore.collection("reports").document(reportId).update("resolvedConfirmed", true).await()
        addUpdate(reportId, ReportStatus.RESOLVED.name, "Citizen confirmed the issue is fixed.")
    }

    private suspend fun addUpdate(reportId: String, toStatus: String, note: String?) {
        firestore.collection("reportUpdates").document().set(
            mapOf(
                "reportId" to reportId,
                "actorId" to currentUserId,
                "toStatus" to toStatus,
                "note" to note,
                "createdAt" to System.currentTimeMillis(),
            )
        ).await()
    }

    fun observeNotifications(onChange: (List<AppNotification>) -> Unit, onError: (Exception) -> Unit) {
        val uid = currentUserId ?: return
        firestore.collection("notifications").whereEqualTo("userId", uid)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { onError(error); return@addSnapshotListener }
                onChange(snapshot?.documents.orEmpty().map { doc ->
                    AppNotification(
                        id = doc.id,
                        userId = doc.getString("userId").orEmpty(),
                        reportId = doc.getString("reportId"),
                        title = doc.getString("title").orEmpty(),
                        body = doc.getString("body").orEmpty(),
                        isRead = doc.getBoolean("isRead") == true,
                        createdAt = doc.getLong("createdAt") ?: 0L,
                    )
                })
            }
    }

    suspend fun markNotificationsRead() {
        val uid = currentUserId ?: return
        val snapshot = firestore.collection("notifications")
            .whereEqualTo("userId", uid).whereEqualTo("isRead", false).get().await()
        snapshot.documents.forEach { it.reference.update("isRead", true).await() }
    }
}
