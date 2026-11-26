package rw.hano.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val HanoRed = Color(0xFFDB2227)
val HanoRedDark = Color(0xFFA51B20)
val HanoAccent = Color(0xFF2A3439)
val HanoBackground = Color(0xFFFAF6F6)

private val LightColors = lightColorScheme(
    primary = HanoRed,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFDECEC),
    secondary = HanoAccent,
    background = HanoBackground,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFF0474B),
    secondary = Color(0xFFC9CED1),
)

/** SCAFFOLD — not built or tested. */
@Composable
fun HanoTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
