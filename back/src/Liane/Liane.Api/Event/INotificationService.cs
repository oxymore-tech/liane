using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public interface INotificationService
{
  Task<Notification> Notify(Ref<User>? sender, Ref<User> receipient, string title, string message, string? uri) =>
    Notify(sender, ImmutableList.Create(receipient), title, message, uri);

  Task<Notification> Get(Guid id);

  Task<PaginatedResponse<Notification>> List(Pagination pagination);

  Task<Notification> Notify(Ref<User>? sender, ImmutableList<Ref<User>> recipients, string title, string message, string? uri);

  Task MarkAsRead(Guid id);

  Task MarkAsRead(IEnumerable<Guid> ids);

  Task<ImmutableList<Guid>> GetUnread();
}