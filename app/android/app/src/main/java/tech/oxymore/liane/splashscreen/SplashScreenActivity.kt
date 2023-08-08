package tech.oxymore.liane.splashscreen

import android.annotation.SuppressLint
import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity


@SuppressLint("CustomSplashScreen")
open class SplashScreenActivity : ReactActivity() {
  private var canHide = false
  override fun onCreate(savedInstanceState: Bundle?) {
    val splash = installSplashScreen()
    splash.setKeepOnScreenCondition {
      !canHide
    }
    super.onCreate(savedInstanceState)
  }

  public fun hideSplashScreen(){
    canHide = true
  }
}
