using System;
using Microsoft.AspNetCore.Authorization;

namespace Liane.Web.Internal.Auth;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = false)]
public sealed class RequiresAuthAttribute : AuthorizeAttribute
{
  public RequiresAuthAttribute() : base(Startup.RequireAuthPolicy)
  {
  }
}