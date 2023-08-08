package tech.oxymore.liane.geolocation

import android.app.ActivityManager
import android.content.Context
import android.util.Log

object Util {

    fun isMyServiceRunning(serviceClass: Class<*>, mActivity: Context): Boolean {
        val manager: ActivityManager =
            mActivity.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        // ignore deprecation
        for (service in manager.getRunningServices(Int.MAX_VALUE)) {
            if (serviceClass.name == service.service.className) {
                Log.i("Service status", "Running")
                return true
            }
        }
        Log.i("Service status", "Not running")
        return false
    }




}
