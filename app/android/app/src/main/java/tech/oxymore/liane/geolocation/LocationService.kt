package tech.oxymore.liane.geolocation

import android.Manifest
import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.Location
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.preference.PreferenceManager
import android.util.Log
import android.widget.Toast
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import kotlinx.coroutines.*
import org.json.JSONObject
import tech.oxymore.liane.R
import java.io.DataOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.*
import android.content.pm.ServiceInfo
import androidx.core.app.ServiceCompat


const val serviceId = 2

const val NOTIFICATION_CHANNEL_ID = "liane_background_geolocation"
const val channelName = "Trajet en cours"

class LocationService : Service() {
  private lateinit var updateClient: FusedLocationProviderClient;
  private lateinit var locationCallback: LocationCallback
  private lateinit var pingConfig: PingConfig
  private var delay = 0
  private lateinit var geolocationConfig: GeolocationConfig
  private val wayPoints = mutableListOf<Location>()
  private var preciseTrackingMode = true
  private var lastLocationResult: Location? = null
  private var lastPing: Long = 0

  fun postPing(
    location: Location
  ) {
    CoroutineScope(Dispatchers.IO).launch {
      val fullUrl = Uri.parse(pingConfig.url)
        .buildUpon()
        .appendPath("event")
        .appendPath("member_ping")
        .build().toString()

      (URL(fullUrl).openConnection() as? HttpURLConnection)?.run {
        try {
          requestMethod = "POST"
          setRequestProperty("Content-Type", "application/json; utf-8")
          setRequestProperty("Authorization", "Bearer " + pingConfig.token)

          val locationObject = JSONObject()
          locationObject.put("lat", location.latitude)
          locationObject.put("lng", location.longitude)
          val jsonObject = JSONObject()
          jsonObject.put("trip", pingConfig.lianeId)
          jsonObject.put("coordinate", locationObject)
          jsonObject.put("timestamp", location.time)
          if (delay > 0) jsonObject.put("delay", delay)
          val jsonBody = jsonObject.toString()

          doOutput = true
          val os = DataOutputStream(outputStream)
          os.writeBytes(jsonBody)

          os.flush()
          os.close()

          val res = this.getResponseCode();
          if (res != 204) Log.d("PING", "Response code was : " + this.getResponseCode().toString())
          if (res == 404 || res == 400) {
            // Stop service if liane is no longer valid
            stopSelf()
          }
          this.disconnect()
        } catch (e: Exception) {
          e.printStackTrace()
        }

      }

    }
  }

  fun startTracking(precise: Boolean) {
    preciseTrackingMode = precise
    updateClient.removeLocationUpdates(locationCallback)
    requestLocationUpdates()
  }

  override fun onCreate() {
    super.onCreate()
    updateClient = LocationServices.getFusedLocationProviderClient(this)
    locationCallback = object : LocationCallback() {
      override fun onLocationResult(locationResult: LocationResult) {
        val location = locationResult.lastLocation
        if (location != null) {
          Log.d(LogTag, "location update $location")

          if (!preciseTrackingMode || lastLocationResult == null || location.distanceTo(lastLocationResult!!) >= 10 || (System.currentTimeMillis() - lastPing) >= 2 * 60 * 1000) {
            // Avoid sending too many pings in precise mode: only post ping if distance is above 10 meters
            lastPing = location.time
            postPing(location)
          }
          lastLocationResult = location
          val closeToWayPointIndex = wayPoints.indexOfFirst { it.distanceTo(location) <= geolocationConfig.nearWayPointRadius }
          if (closeToWayPointIndex > -1) {
            if (!preciseTrackingMode) startTracking(true)
            else if (closeToWayPointIndex == wayPoints.lastIndex) {
              // Stop tracking
              Log.d(LogTag, "Reached destination. Service will stop in 1 minute.")
              Timer().schedule(object : TimerTask() {
                override fun run() {
                  stopSelf()
                  Log.w(LogTag, "Service stopped.")
                }
              }, 60 * 1000)
              stopSelf()
            }
          } else if (preciseTrackingMode) {
            startTracking(false)
          }
        }

      }
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) createNotificationChannel()
    val notification = createNotification()
    var serviceType = if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION else 0
    ServiceCompat.startForeground(this, serviceId, notification, serviceType)

    Log.d(
      LogTag, "Created service"
    )
  }

  @RequiresApi(Build.VERSION_CODES.O)
  private fun createNotificationChannel() {
    val chan = NotificationChannel(
      NOTIFICATION_CHANNEL_ID,
      channelName,
      NotificationManager.IMPORTANCE_DEFAULT
    )
    chan.lightColor = Color.BLUE
    chan.lockscreenVisibility = Notification.VISIBILITY_PRIVATE

    val manager =
      (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
    manager.createNotificationChannel(chan)

  }

  private fun createNotification(): Notification {
    val intent = Intent(Intent.ACTION_VIEW)
    if (::pingConfig.isInitialized) intent.data = Uri.parse("liane://trip/" + pingConfig.lianeId)
    val pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
    val notificationBuilder =
      NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
    val builder =
      notificationBuilder.setOngoing(true)
        .setContentTitle("Votre trajet est en cours")
        //   .setContentText("Ne désactivez pas votre GPS.")
        .setSmallIcon(R.drawable.ic_notification)
        .setCategory(Notification.CATEGORY_SERVICE)
        .setContentIntent(pendingIntent)

    if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
      builder.setPriority(NotificationManager.IMPORTANCE_LOW)
    } else {
      builder.setPriority(NotificationCompat.PRIORITY_LOW)
    }
    return builder.build()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    super.onStartCommand(intent, flags, startId)
    if (intent != null && intent.extras != null) {

      try {
        val pingConfigRaw = intent.extras!!.getBundle("pingConfig")!!
        this.pingConfig = PingConfig(
          lianeId = pingConfigRaw.getString("lianeId")!!,
          userId = pingConfigRaw.getString("userId")!!,
          token = pingConfigRaw.getString("token")!!,
          url = pingConfigRaw.getString("url")!!
        )
        delay = intent.extras!!.getDouble("delay").toInt()
        val timeout = intent.extras!!.getDouble("timeout").toLong()
        val geolocConfigRaw = intent.extras!!.getBundle("geolocationConfig")!!
        this.geolocationConfig = GeolocationConfig(
          defaultInterval = geolocConfigRaw.getDouble("interval").toLong() * 1000,
          nearWayPointInterval = geolocConfigRaw.getDouble("nearWayPointInterval").toLong() * 1000,
          nearWayPointRadius = geolocConfigRaw.getDouble("nearWayPointRadius").toInt()
        )

        val wayPointsRaw = intent.extras!!.getString("wayPoints")!!
        wayPoints.clear()
        for (s in wayPointsRaw.split(";")) {
          val coords = s.split(",")
          val loc = Location("trip")
          loc.latitude = coords[1].toDouble()
          loc.longitude = coords[0].toDouble()
          wayPoints.add(loc)
        }
        val notification = createNotification()
        val mNotificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        mNotificationManager.notify(serviceId, notification)
        lastLocationResult = null
        val preferences = PreferenceManager.getDefaultSharedPreferences(applicationContext)
        preferences.edit().putString("lianeId", pingConfig.lianeId).apply()
        startTracking(true)
        Timer().schedule(object : TimerTask() {
          override fun run() {
            Log.w(LogTag, "Service timed out")
            stopSelf()
          }
        }, timeout)
      } catch (e: Exception) {
        Toast.makeText(this, "Erreur: impossible de démarrer la géolocalisation", Toast.LENGTH_SHORT).show()
        e.printStackTrace()
        stopSelf()
      }
    }


    return START_STICKY
  }

  override fun onDestroy() {
    updateClient.removeLocationUpdates(locationCallback)
    val preferences = PreferenceManager.getDefaultSharedPreferences(applicationContext)
    preferences.edit().remove("lianeId").apply()
    super.onDestroy()

  }

  override fun onBind(intent: Intent?): IBinder? {
    return null
  }

  private fun requestLocationUpdates() {
    val interval = if (preciseTrackingMode) geolocationConfig.nearWayPointInterval else geolocationConfig.defaultInterval
    val request = LocationRequest.create()
    request.setInterval(interval)
    request.setMaxWaitTime(interval + 10000)
    request.setPriority(Priority.PRIORITY_HIGH_ACCURACY)


    val permission = ContextCompat.checkSelfPermission(
      this,
      Manifest.permission.ACCESS_FINE_LOCATION
    )
    if (permission == PackageManager.PERMISSION_GRANTED) { // Request location updates and when an update is
      // received, store the location in Firebase
      updateClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())


    } else {
      Log.e(LogTag, "ACCESS_FINE_LOCATION permission not granted")
    }
  }
}

