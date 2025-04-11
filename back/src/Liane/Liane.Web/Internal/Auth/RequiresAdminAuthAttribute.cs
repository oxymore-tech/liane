using System;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Internal.Auth;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequiresAdminAuthAttribute() : TypeFilterAttribute(typeof(RequiresAdminRoleFilter));