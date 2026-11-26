package rw.hano.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bell
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.BottomAppBar
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import rw.hano.app.data.AppNotification
import rw.hano.app.data.Category
import rw.hano.app.data.HanoRepository
import rw.hano.app.data.Report
import rw.hano.app.data.ReportStatus

/**
 * ⚠️ SCAFFOLD ONLY — NEVER BUILT OR TESTED.
 * Requires Android Studio, the Android SDK, google-services.json and Firebase rules.
 * The working HANO app in this project is the PWA, not this file.
 */

private val destinations = listOf(
    "home" to Icons.Filled.Home,
    "explore" to Icons.Filled.Explore,
    "report" to Icons.Filled.Add,
    "notifications" to Icons.Filled.Bell,
    "profile" to Icons.Filled.Person,
)

@Composable
fun HanoApp(repository: HanoRepository = remember { HanoRepository() }) {
    val navController = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val backStack by navController.currentBackStackEntryAsState()
    val current = backStack?.destination
    val signedIn = remember { mutableStateOf(repository.currentUserId != null) }

    fun feedback(message: String) = scope.launch { snackbar.showSnackbar(message) }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            BottomAppBar {
                destinations.forEach { (route, icon) ->
                    NavigationBarItem(
                        selected = current?.hierarchy?.any { it.route == route } == true,
                        onClick = { navController.navigate(route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        } },
                        icon = { Icon(icon, contentDescription = route) },
                        label = { Text(route.replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(navController, startDestination = "home", Modifier.padding(padding)) {
            composable("home") {
                ReportListScreen(
                    title = "Recent community reports",
                    repository = repository,
                    onOpen = { navController.navigate("report/$it") },
                    onFeedback = ::feedback,
                )
            }
            composable("explore") {
                ReportListScreen(
                    title = "Explore reports",
                    repository = repository,
                    onOpen = { navController.navigate("report/$it") },
                    onFeedback = ::feedback,
                )
            }
            composable("report") {
                ReportFormScreen(
                    repository = repository,
                    signedIn = signedIn.value,
                    onDone = { navController.navigate("home") { popUpTo("home") { inclusive = true } } },
                    onSignIn = { navController.navigate("profile") },
                    onFeedback = ::feedback,
                )
            }
            composable("notifications") {
                NotificationsScreen(repository = repository, onFeedback = ::feedback)
            }
            composable("profile") {
                ProfileScreen(
                    repository = repository,
                    signedIn = signedIn.value,
                    onSignedIn = { signedIn.value = true },
                    onSignedOut = { signedIn.value = false },
                    onAdmin = { navController.navigate("admin") },
                    onFeedback = ::feedback,
                )
            }
            composable("report/{id}") { entry ->
                ReportDetailScreen(
                    reportId = entry.arguments?.getString("id").orEmpty(),
                    repository = repository,
                    onFeedback = ::feedback,
                )
            }
            composable("admin") {
                AdminScreen(repository = repository, onFeedback = ::feedback)
            }
        }
    }
}

@Composable
private fun ReportListScreen(
    title: String,
    repository: HanoRepository,
    onOpen: (String) -> Unit,
    onFeedback: (String) -> Unit,
) {
    var reports by remember { mutableStateOf<List<Report>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var search by remember { mutableStateOf("") }

    DisposableEffect(repository) {
        val registration = repository.observeReports(
            onChange = { reports = it; loading = false },
            onError = { onFeedback(it.message ?: "Could not load reports."); loading = false },
        )
        onDispose { registration.remove() }
    }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text(title, style = MaterialTheme.typography.headlineSmall)
        OutlinedTextField(
            value = search, onValueChange = { search = it },
            label = { Text("Search reports or places") },
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )
        if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            return@Column
        }
        val filtered = reports.filter {
            search.isBlank() || listOf(it.title, it.description, it.locationName.orEmpty())
                .any { field -> field.contains(search, ignoreCase = true) }
        }
        if (filtered.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No reports here yet. Be the first to report a problem.")
            }
            return@Column
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 12.dp)) {
            items(filtered, key = { it.id }) { report ->
                ReportRow(report, onClick = { onOpen(report.id) })
            }
        }
    }
}

@Composable
private fun ReportRow(report: Report, onClick: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(Modifier.padding(14.dp)) {
            Text(report.title, style = MaterialTheme.typography.titleMedium)
            Text(
                "${report.category.label} · ${report.locationName ?: "Location not set"}",
                style = MaterialTheme.typography.bodySmall,
            )
            Text(report.status.name.replace("_", " "), style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun ReportFormScreen(
    repository: HanoRepository,
    signedIn: Boolean,
    onDone: () -> Unit,
    onSignIn: () -> Unit,
    onFeedback: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var category by remember { mutableStateOf(Category.WASTE) }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    var photoUri by remember { mutableStateOf<Uri?>(null) }
    var expanded by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { photoUri = it }

    if (!signedIn) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Button(onClick = onSignIn) { Text("Sign in to report a problem") }
        }
        return
    }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Report a problem", style = MaterialTheme.typography.headlineSmall)
        ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
            OutlinedTextField(
                value = category.label, onValueChange = {}, readOnly = true,
                label = { Text("Category") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                modifier = Modifier.menuAnchor().fillMaxWidth(),
            )
            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                Category.entries.forEach {
                    DropdownMenuItem(text = { Text(it.label) }, onClick = { category = it; expanded = false })
                }
            }
        }
        OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") }, minLines = 4, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = location, onValueChange = { location = it }, label = { Text("Location") }, modifier = Modifier.fillMaxWidth())
        Button(onClick = { picker.launch("image/*") }) { Text("Add photo (optional)") }
        photoUri?.let { AsyncImage(model = it, contentDescription = "Selected photo", modifier = Modifier.fillMaxWidth()) }
        Button(
            enabled = !busy && title.length >= 5 && description.length >= 10,
            onClick = {
                busy = true
                scope.launch {
                    runCatching {
                        repository.createReport(category, title, description, location.ifBlank { null }, null, null, photoUri)
                    }.onSuccess {
                        onFeedback("Thank you! Your report was submitted.")
                        onDone()
                    }.onFailure { onFeedback(it.message ?: "Could not submit the report.") }
                    busy = false
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (busy) CircularProgressIndicator() else Text("Submit report")
        }
    }
}

@Composable
private fun ReportDetailScreen(reportId: String, repository: HanoRepository, onFeedback: (String) -> Unit) {
    var reports by remember { mutableStateOf<List<Report>>(emptyList()) }
    DisposableEffect(repository) {
        val registration = repository.observeReports(
            onChange = { reports = it },
            onError = { onFeedback(it.message ?: "Could not load the report.") },
        )
        onDispose { registration.remove() }
    }
    val report = reports.firstOrNull { it.id == reportId }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        if (report == null) {
            CircularProgressIndicator()
            return@Column
        }
        Text(report.id, style = MaterialTheme.typography.labelMedium)
        Text(report.title, style = MaterialTheme.typography.headlineSmall)
        report.photoUrl?.let { AsyncImage(model = it, contentDescription = "Report photo", modifier = Modifier.fillMaxWidth().padding(top = 10.dp)) }
        Text(report.description, modifier = Modifier.padding(top = 12.dp))
        Text("Status: ${report.status.name.replace("_", " ")}")
        if (report.status == ReportStatus.RESOLVED && !report.resolvedConfirmed) {
            val scope = rememberCoroutineScope()
            Button(onClick = {
                scope.launch {
                    runCatching { repository.confirmResolved(report.id) }
                        .onSuccess { onFeedback("Thank you for confirming.") }
                        .onFailure { onFeedback(it.message ?: "Could not confirm.") }
                }
            }) { Text("Confirm this is fixed") }
        }
    }
}

@Composable
private fun NotificationsScreen(repository: HanoRepository, onFeedback: (String) -> Unit) {
    var items by remember { mutableStateOf<List<AppNotification>>(emptyList()) }
    DisposableEffect(repository) {
        val registration = repository.observeNotifications(
            onChange = { items = it },
            onError = { onFeedback(it.message ?: "Could not load notifications.") },
        )
        onDispose { registration.remove() }
    }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Notifications", style = MaterialTheme.typography.headlineSmall)
        if (items.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No notifications yet.") }
            return@Column
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 12.dp)) {
            items(items, key = { it.id }) { n ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text(n.title, style = MaterialTheme.typography.titleMedium)
                        Text(n.body, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileScreen(
    repository: HanoRepository,
    signedIn: Boolean,
    onSignedIn: () -> Unit,
    onSignedOut: () -> Unit,
    onAdmin: () -> Unit,
    onFeedback: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var registering by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Profile", style = MaterialTheme.typography.headlineSmall)
        if (signedIn) {
            Text("Signed in as ${repository.currentUserId ?: ""}")
            Button(onClick = {
                repository.logout(); onSignedOut(); onFeedback("Signed out.")
            }) { Text("Sign out") }
            return@Column
        }
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(
            value = password, onValueChange = { password = it }, label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(),
        )
        Button(
            enabled = email.isNotBlank() && password.length >= 8,
            onClick = {
                scope.launch {
                    runCatching {
                        if (registering) repository.register(email.substringBefore("@"), email, "", password)
                        else repository.login(email, password)
                    }.onSuccess { onSignedIn(); onFeedback("Welcome to HANO.") }
                        .onFailure { onFeedback(it.message ?: "Sign in failed.") }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) { Text(if (registering) "Create account" else "Sign in") }
        Text(
            "New to HANO?",
            modifier = Modifier.clickable { registering = !registering },
            color = MaterialTheme.colorScheme.primary,
        )
    }
}

@Composable
private fun AdminScreen(repository: HanoRepository, onFeedback: (String) -> Unit) {
    var reports by remember { mutableStateOf<List<Report>>(emptyList()) }
    DisposableEffect(repository) {
        val registration = repository.observeReports(
            onChange = { reports = it },
            onError = { onFeedback(it.message ?: "Could not load reports.") },
        )
        onDispose { registration.remove() }
    }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Admin dashboard (${reports.size} reports)", style = MaterialTheme.typography.headlineSmall)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(reports, key = { it.id }) { report ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp)) {
                        Text(report.title, style = MaterialTheme.typography.titleMedium)
                        Text("Current: ${report.status.name.replace("_", " ")}")
                        Button(onClick = {
                            scope.launch {
                                runCatching {
                                    repository.updateStatus(report.id, ReportStatus.IN_PROGRESS, null, "Officer started work.")
                                }.onSuccess { onFeedback("Status updated.") }
                                    .onFailure { onFeedback(it.message ?: "Could not update status.") }
                            }
                        }) { Text("Mark in progress") }
                    }
                }
            }
        }
    }
}
