using System;
using Liane.Api.Util.Http;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Internal.AccessLevel;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, Inherited = false)]
public sealed class RequiresAccessLevelAttribute : TypeFilterAttribute
{
  public RequiresAccessLevelAttribute(ResourceAccessLevel accessLevel, Type resourceType, string resourceIdentifier = "id")
    : base(typeof(RequiresAccessLevelFilter))
  {
    Arguments = new object[] { accessLevel, resourceType, resourceIdentifier };
  }
  

}