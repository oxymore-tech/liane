package tech.oxymore.liane.geolocation

import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import tech.oxymore.liane.geolocation.Util.isMyServiceRunning

public const val LogTag = "BackgroundGeoService"
class BackgroundGeolocationModule (context: ReactApplicationContext?) : ReactContextBaseJavaModule(context) {

  private lateinit var mServiceIntent: Intent
  override fun getName(): String {
    return "BackgroundGeolocationServiceModule";
  }

  @ReactMethod
  fun enableLocation(promise: Promise) {
    if(currentActivity is LocationRequestHandler) (currentActivity as LocationRequestHandler).requestEnableLocation(promise)
    else promise.reject("unsupported")
  }


  @ReactMethod
  fun stopService() {
     if (::mServiceIntent.isInitialized) {
      reactApplicationContext.stopService(mServiceIntent)
    }
  }

  @ReactMethod
  fun isRunning(promise: Promise){
    promise.resolve(isMyServiceRunning(LocationService::class.java, reactApplicationContext))
  }

  @ReactMethod
  fun startService(config: ReadableMap) {
    if (!isMyServiceRunning(LocationService::class.java,  reactApplicationContext)) {
       mServiceIntent = Intent(reactApplicationContext, LocationService::class.java)
       mServiceIntent.putExtras(Arguments.toBundle(config)!!)

      reactApplicationContext.startService(mServiceIntent)
      Log.d(LogTag, "start service")
    } else {
      Log.d(LogTag, "service was already started")
  }
  }
}