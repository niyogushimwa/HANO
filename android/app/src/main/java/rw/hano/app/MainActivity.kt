package rw.hano.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import rw.hano.app.ui.screens.HanoApp
import rw.hano.app.ui.theme.HanoTheme

/** SCAFFOLD — not built or tested. See android/README.md. */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            HanoTheme {
                HanoApp()
            }
        }
    }
}
