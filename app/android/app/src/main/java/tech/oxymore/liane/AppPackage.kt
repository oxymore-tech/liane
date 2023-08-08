package tech.oxymore.liane

import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager
import tech.oxymore.liane.geolocation.BackgroundGeolocationModule
import tech.oxymore.liane.splashscreen.SplashScreenModule

class AppPackage : ReactPackage {

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): MutableList<ViewManager<View, ReactShadowNode<*>>> = mutableListOf()

  override fun createNativeModules(
    reactContext: ReactApplicationContext
  ): MutableList<NativeModule> = listOf(BackgroundGeolocationModule(reactContext), SplashScreenModule(reactContext)).toMutableList()
}

