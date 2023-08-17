package tech.oxymore.liane.geolocation


data class PingConfig(val url: String, val token: String, val userId: String, val lianeId: String)
data class GeolocationConfig(val defaultInterval: Long, val nearWayPointInterval: Long, val nearWayPointRadius: Int)




