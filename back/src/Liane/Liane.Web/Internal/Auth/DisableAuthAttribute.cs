using System;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Liane.Web.Internal.Auth;

[AttributeUsage(AttributeTargets.Method)]
public sealed class DisableAuthAttribute : Attribute, IFilterMetadata
{
}