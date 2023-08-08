package tech.oxymore.liane.splashscreen

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SplashScreenModule (context: ReactApplicationContext?) : ReactContextBaseJavaModule(context) {
  override fun getName(): String {
    return "SplashScreenModule"
  }

  @ReactMethod
  fun hide() {
    (currentActivity as? SplashScreenActivity)?.hideSplashScreen()
  }
}
