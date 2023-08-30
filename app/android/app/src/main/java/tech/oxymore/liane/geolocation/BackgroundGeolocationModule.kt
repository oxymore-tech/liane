package tech.oxymore.liane.geolocation

import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import tech.oxymore.liane.geolocation.Util.isMyServiceRunning

public const val LogTag = "BackgroundGeoService"
class BackgroundGeolocationModule (context: ReactApplicationContext?) : ReactContextBaseJavaModule(context) {
  override fun getName(): String {
    return "BackgroundGeolocationServiceModule";
  }

  @ReactMethod
  fun enableLocation(promise: Promise) {
    if(currentActivity is LocationRequestHandler) (currentActivity as LocationRequestHandler).requestEnableLocation(promise)
    else promise.reject("unsupported")
  }


  @ReactMethod
  fun stopService(promise: Promise) {
    if (isMyServiceRunning(LocationService::class.java,  reactApplicationContext)) {
      reactApplicationContext.stopService(Intent(reactApplicationContext, LocationService::class.java))
      promise.resolve(null)
    } else {
      promise.reject("no service running")
    }
  }

  @ReactMethod
  fun isRunning(promise: Promise){
    promise.resolve(isMyServiceRunning(LocationService::class.java, reactApplicationContext))
  }

  @ReactMethod
  fun startService(config: ReadableMap, promise: Promise) {
    if (!isMyServiceRunning(LocationService::class.java,  reactApplicationContext)) {
       val mServiceIntent = Intent(reactApplicationContext, LocationService::class.java)
       mServiceIntent.putExtras(Arguments.toBundle(config)!!)

      reactApplicationContext.startService(mServiceIntent)
      Log.d(LogTag, "start service")
      promise.resolve(null)
    } else {
      Log.d(LogTag, "service was already started")
      promise.reject("service already started")
  }
  }
}
