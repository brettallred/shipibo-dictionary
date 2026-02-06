# Shipibo Dictionary Android App

A native Android wrapper for the Shipibo-English dictionary web app using Turbo Native.

## Setup

1. Open Android Studio and create a new Empty Activity project:
   - Name: ShipiboDictionary
   - Package: com.shipibo.dictionary
   - Language: Kotlin
   - Minimum SDK: API 24

2. Add Turbo to `build.gradle.kts` (app):
   ```kotlin
   dependencies {
       implementation("dev.hotwire:turbo:7.1.2")
   }
   ```

3. Create `MainActivity.kt`:
   ```kotlin
   package com.shipibo.dictionary

   import android.os.Bundle
   import dev.hotwire.turbo.activities.TurboActivity
   import dev.hotwire.turbo.delegates.TurboActivityDelegate

   class MainActivity : TurboActivity() {
       override lateinit var delegate: TurboActivityDelegate

       override fun onCreate(savedInstanceState: Bundle?) {
           super.onCreate(savedInstanceState)
           delegate = TurboActivityDelegate(this, R.id.main_nav_host)

           delegate.navigate("https://your-app.com")
       }
   }
   ```

4. Add Internet permission to `AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   ```

5. For local development, allow cleartext traffic:
   ```xml
   <application
       android:usesCleartextTraffic="true"
       ...>
   ```

## Simple WebView Alternative

For a simpler wrapper without Turbo:

```kotlin
package com.shipibo.dictionary

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            webViewClient = WebViewClient()
            loadUrl("http://10.0.2.2:3000") // localhost from emulator
        }

        setContentView(webView)
    }

    override fun onBackPressed() {
        val webView = findViewById<WebView>(android.R.id.content)
        if (webView?.canGoBack() == true) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
```

## Production

1. Deploy Rails app to a server
2. Update URL in MainActivity
3. Generate signed APK/AAB
4. Submit to Google Play Store

See: https://github.com/hotwired/turbo-android
