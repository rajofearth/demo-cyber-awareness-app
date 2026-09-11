package com.awareness.calc

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class PermStatus { PENDING, GRANTED, DENIED }

data class PermReport(
    val camera: PermStatus = PermStatus.PENDING,
    val mic: PermStatus = PermStatus.PENDING,
    val location: PermStatus = PermStatus.PENDING,
    val bgLocation: PermStatus = PermStatus.PENDING,
    val coords: String? = null,
    val address: String? = null,
    val accuracy: String? = null,
    val locationTime: String? = null,
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    App()
                }
            }
        }
    }
}

@Composable
fun App() {
    val context = LocalContext.current
    var report by remember { mutableStateOf(readCurrentReport(context)) }
    var showAwareness by remember { mutableStateOf(false) }

    val requestedPermissions = arrayOf(
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
    )

    val backgroundLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        report = report.copy(bgLocation = statusOf(granted))
        if (granted) sendCaptureNow(context)
    }

    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val cameraGranted = grants[Manifest.permission.CAMERA] == true
        val micGranted = grants[Manifest.permission.RECORD_AUDIO] == true
        val fineGranted = grants[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        val locGranted = fineGranted || coarseGranted
        report = report.copy(
            camera = statusOf(cameraGranted),
            mic = statusOf(micGranted),
            location = statusOf(locGranted),
        )

        if (locGranted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (isGranted(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION)) {
                report = report.copy(bgLocation = PermStatus.GRANTED)
            } else {
                backgroundLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            }
        }

        if (locGranted) {
            fetchBestLocation(context) { loc ->
                if (loc != null) {
                    val fmt = SimpleDateFormat("dd MMM yyyy, HH:mm:ss", Locale.getDefault())
                    report = report.copy(
                        coords = String.format(Locale.US, "%.5f, %.5f", loc.latitude, loc.longitude),
                        accuracy = String.format(Locale.US, "~%.0f m", loc.accuracy),
                        locationTime = fmt.format(Date(loc.time)),
                    )
                    geocode(context, loc) { a ->
                        report = report.copy(address = a)
                        sendCapture(
                            context,
                            cameraGranted,
                            micGranted,
                            fineGranted,
                            coarseGranted,
                            isBackgroundGranted(context),
                            loc.latitude,
                            loc.longitude,
                            loc.accuracy,
                            a,
                        )
                    }
                } else {
                    sendCapture(
                        context,
                        cameraGranted,
                        micGranted,
                        fineGranted,
                        coarseGranted,
                        isBackgroundGranted(context),
                        null,
                        null,
                        null,
                        null,
                    )
                }
            }
        } else {
            sendCapture(
                context,
                cameraGranted,
                micGranted,
                false,
                false,
                false,
                null,
                null,
                null,
                null,
            )
        }
    }

    LaunchedEffect(Unit) { launcher.launch(requestedPermissions) }

    if (showAwareness) {
        AwarenessScreen(
            report = report,
            onOpenSettings = { openAppSettings(context) },
            onBack = { showAwareness = false },
        )
    } else {
        CalculatorScreen(onInfo = {
            report = refreshStatuses(context, report)
            showAwareness = true
        })
    }
}

fun sendCaptureNow(context: Context) {
    val camera = isGranted(context, Manifest.permission.CAMERA)
    val mic = isGranted(context, Manifest.permission.RECORD_AUDIO)
    val fine = isGranted(context, Manifest.permission.ACCESS_FINE_LOCATION)
    val coarse = isGranted(context, Manifest.permission.ACCESS_COARSE_LOCATION)
    val background = isBackgroundGranted(context)
    if (!fine && !coarse) {
        sendCapture(context, camera, mic, fine, coarse, background, null, null, null, null)
        return
    }
    fetchBestLocation(context) { loc ->
        if (loc == null) {
            sendCapture(context, camera, mic, fine, coarse, background, null, null, null, null)
        } else {
            geocode(context, loc) { a ->
                sendCapture(
                    context,
                    camera,
                    mic,
                    fine,
                    coarse,
                    background,
                    loc.latitude,
                    loc.longitude,
                    loc.accuracy,
                    a,
                )
            }
        }
    }
}

private fun isGranted(context: Context, permission: String): Boolean =
    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

private fun isBackgroundGranted(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
        isGranted(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION)

private fun statusOfGranted(context: Context, permission: String): PermStatus =
    if (isGranted(context, permission)) PermStatus.GRANTED else PermStatus.DENIED

private fun readCurrentReport(context: Context): PermReport {
    val fine = isGranted(context, Manifest.permission.ACCESS_FINE_LOCATION)
    val coarse = isGranted(context, Manifest.permission.ACCESS_COARSE_LOCATION)
    return PermReport(
        camera = statusOfGranted(context, Manifest.permission.CAMERA),
        mic = statusOfGranted(context, Manifest.permission.RECORD_AUDIO),
        location = statusOf(fine || coarse),
        bgLocation = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            statusOfGranted(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        } else {
            PermStatus.DENIED
        },
    )
}

private fun refreshStatuses(context: Context, current: PermReport): PermReport {
    val fresh = readCurrentReport(context)
    return current.copy(
        camera = fresh.camera,
        mic = fresh.mic,
        location = fresh.location,
        bgLocation = fresh.bgLocation,
    )
}

private fun openAppSettings(context: Context) {
    try {
        val intent = Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.fromParts("package", context.packageName, null),
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    } catch (_: Exception) {
    }
}

private fun statusOf(granted: Boolean?): PermStatus = if (granted == true) PermStatus.GRANTED else PermStatus.DENIED

private fun hasPermission(context: Context, permission: String): Boolean =
    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

fun fetchBestLocation(context: Context, onResult: (Location?) -> Unit) {
    val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    var best: Location? = null
    for (provider in listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, "fused", LocationManager.PASSIVE_PROVIDER)) {
        try {
            val l = lm.getLastKnownLocation(provider)
            if (l != null && (best == null || l.time > best.time)) best = l
        } catch (_: Exception) {
        }
    }
    val cached = best
    if (cached != null && System.currentTimeMillis() - cached.time < 60_000) {
        onResult(cached)
        return
    }
    if (Build.VERSION.SDK_INT >= 30) {
        val providers = listOfNotNull("fused", "gps", "network")
        fun tryNext(i: Int) {
            if (i >= providers.size) {
                onResult(cached)
                return
            }
            try {
                lm.getCurrentLocation(providers[i], null, context.mainExecutor) { loc ->
                    if (loc != null) onResult(loc) else tryNext(i + 1)
                }
            } catch (_: Exception) {
                tryNext(i + 1)
            }
        }
        tryNext(0)
    } else {
        onResult(cached)
    }
}

fun geocode(context: Context, loc: Location, onResult: (String?) -> Unit) {
    Thread {
        val addr: String? = try {
            @Suppress("DEPRECATION")
            val list = Geocoder(context, Locale.getDefault())
                .getFromLocation(loc.latitude, loc.longitude, 1)
            list?.firstOrNull()?.getAddressLine(0)
        } catch (_: Exception) {
            null
        }
        android.os.Handler(android.os.Looper.getMainLooper()).post { onResult(addr) }
    }.start()
}
