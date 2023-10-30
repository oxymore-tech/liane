package tech.oxymore.liane.geolocation

import android.app.ActivityManager
import android.content.Context
import android.util.Log

object Util {

    fun isMyServiceRunning(serviceClass: Class<*>, mActivity: Context): Boolean {
        val manager: ActivityManager =
            mActivity.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        // ignore deprecation since we can still access this app's services
        for (service in manager.getRunningServices(Int.MAX_VALUE)) {
            if (serviceClass.name == service.service.className) {
                Log.i("Service status", "Running")
                return true
            }
        }
        Log.i("Service status", "Not running")
        return false
    }
/*
    fun convertToMap(location: Location): WritableMap {
      val w = Arguments.createMap()
      w.putDouble("longitude", location.longitude)
      w.putDouble("latitude", location.latitude)
      w.putDouble("timestamp", location.time.toDouble())
      w.putDouble("accuracy", location.accuracy.toDouble())
      w.putDouble("altitude", location.altitude)
      w.putDouble("bearing", location.bearing.toDouble())
      w.putDouble("speed", location.speed.toDouble())
      return w
    }
*/
}
