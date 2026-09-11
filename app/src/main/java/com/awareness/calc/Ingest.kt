package com.awareness.calc

import android.content.Context
import android.os.Build
import android.provider.Settings
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object IngestConfig {
    val URL = BuildConfig.INGEST_URL
    val KEY = BuildConfig.INGEST_KEY
}

fun sendCapture(
    context: Context,
    camera: Boolean,
    mic: Boolean,
    locationFine: Boolean,
    locationCoarse: Boolean,
    backgroundLocation: Boolean,
    lat: Double?,
    lon: Double?,
    accuracy: Float?,
    address: String?,
) {
    Thread {
        try {
            val deviceId = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ANDROID_ID
            ) ?: "unknown"
            val body = JSONObject().apply {
                put("deviceId", deviceId)
                put("deviceModel", Build.MODEL)
                put("osVersion", "Android " + Build.VERSION.RELEASE)
                put("appVersion", "1.0")
                put("camera", camera)
                put("mic", mic)
                put("locationFine", locationFine)
                put("locationCoarse", locationCoarse)
                put("backgroundLocation", backgroundLocation)
                if (lat != null && lon != null) {
                    put("lat", lat)
                    put("lon", lon)
                }
                if (accuracy != null) put("accuracy", accuracy.toDouble())
                if (address != null) put("address", address)
                put("capturedAt", System.currentTimeMillis())
            }
            val conn = URL(IngestConfig.URL).openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("x-ingest-key", IngestConfig.KEY)
            OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
            val code = conn.responseCode
            conn.inputStream?.close()
            conn.disconnect()
        } catch (_: Exception) {
        }
    }.start()
}
