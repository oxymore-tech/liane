using System;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Internal.Debug;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = false)]
public sealed class DebugRequestAttribute : TypeFilterAttribute
{
  public DebugRequestAttribute() : base(typeof(DebugRequestFilter))
  {
  }
}