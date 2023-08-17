package tech.oxymore.liane

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Promise
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.concurrentReactEnabled
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.*
import com.google.android.gms.tasks.Task
import tech.oxymore.liane.geolocation.LocationRequestHandler
import tech.oxymore.liane.geolocation.LogTag
import tech.oxymore.liane.splashscreen.SplashScreenActivity

class MainActivity : SplashScreenActivity(), LocationRequestHandler {
  lateinit var locationRequestLauncher : ActivityResultLauncher<IntentSenderRequest>
  var promise: Promise? = null
    /**
     * Required by react navigation to handle wake up
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
      locationRequestLauncher = registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { r ->
        if (r.resultCode == Activity.RESULT_OK) {
          promise?.resolve(true)
        } else {
          promise?.reject("rejected")
        }
      promise = null
      }

    }

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String {
        return "liane"
    }

    /**
     * Returns the instance of the [ReactActivityDelegate]. Here we use a util class [ ] which allows you to easily enable Fabric and Concurrent React
     * (aka React 18) with two boolean flags.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(
            this,
            mainComponentName,  // If you opted-in for the New Architecture, we enable the Fabric Renderer.
            fabricEnabled,  // fabricEnabled
            // If you opted-in for the New Architecture, we enable Concurrent React (i.e. React 18).
            concurrentReactEnabled // concurrentRootEnabled
        )
    }

  override fun requestEnableLocation(promise: Promise) {
   if (this.promise != null) return
    val locationRequest: LocationRequest = LocationRequest.create()
    locationRequest.setPriority(Priority.PRIORITY_HIGH_ACCURACY)
    val builder = LocationSettingsRequest.Builder()
      .addLocationRequest(locationRequest)

    val result: Task<LocationSettingsResponse> =
      LocationServices.getSettingsClient(this).checkLocationSettings(builder.build())



    result.addOnCompleteListener { task ->
      try {
        val response = task.getResult(ApiException::class.java)
        // All location settings are satisfied. The client can initialize location
        // requests here.
        promise.resolve(true)
      } catch (exception: ApiException) {
        when (exception.statusCode) {
          LocationSettingsStatusCodes.RESOLUTION_REQUIRED ->
            // Location settings are not satisfied. But could be fixed by showing the
            // user a dialog.
            try {
              val resolvable = exception as ResolvableApiException
              this.promise = promise
              locationRequestLauncher.launch(IntentSenderRequest.Builder(resolvable.resolution).build())
            } catch (e: Exception) {
              Log.e(LogTag, e.message.toString())
              promise.reject("rejected")
            }

          LocationSettingsStatusCodes.SETTINGS_CHANGE_UNAVAILABLE -> {promise.reject("rejected")}
        }
      }
    }



  }


}
