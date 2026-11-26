package rw.hano.app

import android.app.Application
import com.google.firebase.FirebaseApp

/** SCAFFOLD — not built or tested. Requires google-services.json. */
class HanoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
    }
}
