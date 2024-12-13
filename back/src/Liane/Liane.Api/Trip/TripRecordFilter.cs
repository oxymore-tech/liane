using System;

namespace Liane.Api.Trip;

public sealed class TripRecordFilter
{
  public DateTime? Date { get; set; } // DateOnly 
  
  public string[]? WayPoints { get; set; }
  
  public string[]? Members { get; set; }
}