using MathNet.Filtering.Kalman;
using MathNet.Numerics.LinearAlgebra;

namespace Liane.Service.Internal.Util;

public sealed class KalmanFilter
{
  private readonly DiscreteKalmanFilter dkf;
  private readonly Matrix<double> stateTransitionMatrixF;
  private readonly Matrix<double> plantNoiseMatrixG;
  private readonly Matrix<double> plantNoiseVarianceQ;
  private readonly Matrix<double> measurementVarianceMatrixR;
  private readonly Matrix<double> measurementMatrixH;

  public KalmanFilter(double x0, double v0, double dt, double plantNoiseVar = 3, double measurementCovariance = 1.5)
  {
    var xState = Matrix<double>.Build.Dense(2, 1, [x0, v0]);

    var measurementCovarianceMatrix = Matrix<double>.Build.Dense(2, 2,
    [
      measurementCovariance, measurementCovariance / dt,
      measurementCovariance / dt, 2 * measurementCovariance / (dt * dt)
    ]);

    dkf = new DiscreteKalmanFilter(xState, measurementCovarianceMatrix);

    stateTransitionMatrixF = Matrix<double>.Build.Dense(2, 2, [1d, 0d, dt, 1]);
    plantNoiseMatrixG = Matrix<double>.Build.Dense(2, 1, [dt * dt / 2, dt]);
    plantNoiseVarianceQ = plantNoiseMatrixG.Transpose() * plantNoiseMatrixG * plantNoiseVar;
    measurementVarianceMatrixR = Matrix<double>.Build.Dense(1, 1, [measurementCovariance]);
    measurementMatrixH = Matrix<double>.Build.Dense(1, 2, [1d, 0d]);
  }

  public void Update(double x, double y, double dt)
  {
    var z = Matrix<double>.Build.Dense(1, 2, [x, y]);
    stateTransitionMatrixF[0, 1] = dt;
    plantNoiseMatrixG[0, 0] = dt * dt / 2;
    plantNoiseMatrixG[1, 0] = dt;

    dkf.Predict(stateTransitionMatrixF, plantNoiseMatrixG, plantNoiseVarianceQ);
    dkf.Update(z, measurementMatrixH, measurementVarianceMatrixR);
  }
}