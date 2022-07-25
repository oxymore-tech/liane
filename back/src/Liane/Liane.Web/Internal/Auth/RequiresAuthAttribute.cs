using System;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Internal.Auth;

[AttributeUsage(AttributeTargets.Class, Inherited = false)]
public sealed class RequiresAuthAttribute : TypeFilterAttribute
{
    public RequiresAuthAttribute() : base(typeof(RequiresAuthFilter))
    {
    }
}