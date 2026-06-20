package com.ui_mobile

import android.os.Bundle
import android.graphics.Color
import android.os.Build
import android.view.View
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    
    // Enable edge-to-edge drawing
    WindowCompat.setDecorFitsSystemWindows(window, false)
    
    // Set system bar colors to transparent
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.TRANSPARENT
    
    // Disable contrast enforcement to allow true transparency on Android 10+ (API 29)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.isNavigationBarContrastEnforced = false
      window.isStatusBarContrastEnforced = false
    }

    // Configure status bar and navigation bar icon/button colors dynamically
    val decorView = window.decorView
    val controller = WindowCompat.getInsetsController(window, decorView)
    if (controller != null) {
      // Dark status bar icons (since landing page top is light)
      controller.isAppearanceLightStatusBars = true
      // Dark navigation bar icons (since landing page bottom starts light, adapts natively as needed)
      controller.isAppearanceLightNavigationBars = true
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "UI_Mobile"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
