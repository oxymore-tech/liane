namespace Liane.Service.Internal.Trip.Geolocation;

public sealed class KalmanFilter
{
  // Initialize the covariance matrix P (identity matrix)
  // Define the process noise and measurement noise
  private readonly double[,] p = new double[4, 4]
  {
    { 1, 0, 0, 0 },
    { 0, 1, 0, 0 },
    { 0, 0, 1, 0 },
    { 0, 0, 0, 1 }
  }; // Covariance matrix

  private double[]? x; // State [latitude, longitude, velocity_lat, velocity_lon]

  private readonly double q = 0.0001; // Small process noise

  // Process noise
  private readonly double r = 0.01; // Measurement noise (higher if data is noisy)

  // Predict the next position based on previous velocity
  public void Predict(double dt)
  {
    if (x is null) return;

    // Update the state with time step (dt)
    x[0] += x[2] * dt; // latitude += velocity_lat * dt
    x[1] += x[3] * dt; // longitude += velocity_lon * dt

    // Update the covariance matrix P
    p[0, 0] += dt * p[2, 2] + q;
    p[1, 1] += dt * p[3, 3] + q;
  }

  /// <summary>
  /// Update the Kalman filter with a new GPS position
  /// </summary>
  /// <param name="measuredLat"></param>
  /// <param name="measuredLon"></param>
  /// <returns>True when prediction can be done</returns>
  public bool Update(double measuredLat, double measuredLon)
  {
    if (x is null)
    {
      x = [measuredLat, measuredLon, 0.0, 0.0];
      return false;
    }

    // Kalman Gain K
    double[] k =
    [
      p[0, 0] / (p[0, 0] + r), // Gain for latitude
      p[1, 1] / (p[1, 1] + r) // Gain for longitude
    ];

    // Update the state (correction step)
    x[0] += k[0] * (measuredLat - x[0]); // latitude
    x[1] += k[1] * (measuredLon - x[1]); // longitude

    // Assume simple velocity update based on the measurement change
    x[2] = (measuredLat - x[0]) / 1; // velocity_lat
    x[3] = (measuredLon - x[1]) / 1; // velocity_lon

    // Update the covariance matrix P
    p[0, 0] *= (1 - k[0]);
    p[1, 1] *= (1 - k[1]);
    return true;
  }

  // Get the current estimate for latitude and longitude
  public (double latitude, double longitude)? GetState()
  {
    if (x is null)
    {
      return null;
    }

    return (x[0], x[1]);
  }
}