import CoreLocation

struct LocationOptions {
  private static let DEFAULT_DISTANCE_FILTER = 100.0
  let accuracy: Double
  let backgroundIndicator: Bool
  let backgroundUpdates: Bool
  let distanceFilter: Double
  let pauseUpdatesAutomatically: Bool
  let significantChanges: Bool

  init(_ options: [String: Any]) {
    accuracy = LocationOptions.getAccuracy(options)
    backgroundIndicator = options["showsBackgroundLocationIndicator"] as? Bool ?? true
    backgroundUpdates = LocationOptions.shouldAllowBackgroundUpdates()
    distanceFilter = options["distanceFilter"] as? Double ?? LocationOptions.DEFAULT_DISTANCE_FILTER
    pauseUpdatesAutomatically = options["pauseUpdatesAutomatically"] as? Bool ?? false
    significantChanges = options["useSignificantChanges"] as? Bool ?? false
  }

  private static func getAccuracy(_ options: [String: Any]) -> Double {
    let accuracyLevel = options["accuracy"]  as? String ?? ""
    let highAccuracy = options["enableHighAccuracy"] as? Bool ?? false

    switch accuracyLevel {
      case "bestForNavigation":
        return kCLLocationAccuracyBestForNavigation
      case "best":
        return kCLLocationAccuracyBest
      case "nearestTenMeters":
        return kCLLocationAccuracyNearestTenMeters
      case "hundredMeters":
        return kCLLocationAccuracyHundredMeters
      case "kilometer":
        return kCLLocationAccuracyKilometer
      case "threeKilometers":
        return kCLLocationAccuracyThreeKilometers
      case "reduced":
        if #available(iOS 14.0, *) {
          return kCLLocationAccuracyReduced
        } else {
          return kCLLocationAccuracyThreeKilometers
        }
      default:
        return highAccuracy ? kCLLocationAccuracyBest : kCLLocationAccuracyHundredMeters
    }
  }

  private static func shouldAllowBackgroundUpdates() -> Bool {
    let info = Bundle.main.object(forInfoDictionaryKey: "UIBackgroundModes") as? [String] ?? []

    if info.contains("location") {
      return true
    }

    return false
  }
}
