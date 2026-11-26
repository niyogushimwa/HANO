package rw.hano.app.data

/** SCAFFOLD — data models mirror the PHP/MySQL schema. Not built or tested. */

enum class Role { CITIZEN, OFFICER, ADMIN }

enum class ReportStatus {
    SUBMITTED, UNDER_REVIEW, ASSIGNED, IN_PROGRESS, RESOLVED, REJECTED;

    companion object {
        fun fromFirestore(value: String?): ReportStatus =
            entries.firstOrNull { it.name.equals(value?.replace("-", "_"), ignoreCase = true) } ?: SUBMITTED
    }
}

enum class Category(val label: String) {
    WASTE("Waste"), WATER("Water"), DRAINAGE("Drainage"), ROADS("Roads"),
    STREETLIGHTS("Streetlights"), INFRASTRUCTURE("Infrastructure"), OTHER("Other");

    companion object {
        fun fromFirestore(value: String?): Category =
            entries.firstOrNull { it.name.equals(value, ignoreCase = true) } ?: OTHER
    }
}

data class UserProfile(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val role: Role = Role.CITIZEN,
    val departmentId: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
)

data class Report(
    val id: String = "",
    val userId: String = "",
    val category: Category = Category.OTHER,
    val title: String = "",
    val description: String = "",
    val photoUrl: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val locationName: String? = null,
    val status: ReportStatus = ReportStatus.SUBMITTED,
    val departmentId: String? = null,
    val rejectedReason: String? = null,
    val resolvedConfirmed: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
)

data class ReportUpdate(
    val id: String = "",
    val reportId: String = "",
    val actorId: String = "",
    val fromStatus: String? = null,
    val toStatus: String = "",
    val note: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
)

data class AppNotification(
    val id: String = "",
    val userId: String = "",
    val reportId: String? = null,
    val title: String = "",
    val body: String = "",
    val isRead: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
)

data class Department(
    val id: String = "",
    val nameEn: String = "",
    val nameRw: String = "",
)
