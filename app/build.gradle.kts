import java.util.Properties

plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.kotlin.compose)
}

val localProps = Properties().apply {
  val file = rootProject.file("local.properties")
  if (file.exists()) file.inputStream().use { load(it) }
}
val ingestKey: String = localProps.getProperty("INGEST_KEY") ?: ""
val ingestUrl: String =
  localProps.getProperty("INGEST_URL") ?: "https://cool-wildcat-493.convex.site/api/ingest"

android {
  namespace = "com.awareness.calc"
  compileSdk { version = release(36) { minorApiLevel = 1 } }

  defaultConfig {
    applicationId = "com.awareness.calc"
    minSdk = 24
    targetSdk = 36
    versionCode = 1
    versionName = "1.0"
    buildConfigField("String", "INGEST_KEY", "\"$ingestKey\"")
    buildConfigField("String", "INGEST_URL", "\"$ingestUrl\"")
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
  }
  buildFeatures {
    compose = true
    buildConfig = true
  }
}

dependencies {
  implementation(platform(libs.androidx.compose.bom))
  implementation(libs.androidx.activity.compose)
  implementation(libs.androidx.compose.material3)
  implementation(libs.androidx.compose.ui)
  implementation(libs.androidx.compose.ui.graphics)
  implementation(libs.androidx.compose.ui.tooling.preview)
  debugImplementation(libs.androidx.compose.ui.tooling)
}
