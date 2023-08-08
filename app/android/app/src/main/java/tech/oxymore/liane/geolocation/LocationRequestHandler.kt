package tech.oxymore.liane.geolocation

import com.facebook.react.bridge.Promise

interface LocationRequestHandler {
  fun requestEnableLocation(promise: Promise)
}
