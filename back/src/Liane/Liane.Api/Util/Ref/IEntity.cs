using System;

namespace Liane.Api.Util.Ref;

public interface IEntity : IIdentity
{
    Ref<User.User> CreatedBy { get; }
    DateTime CreatedAt { get; }
}