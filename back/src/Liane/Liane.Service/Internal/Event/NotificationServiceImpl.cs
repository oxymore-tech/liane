using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util;
using Liane.Service.Internal.Util.Sql;
using UuidExtensions;

namespace Liane.Service.Internal.Event;

public sealed class NotificationServiceImpl(
  PostgisDatabase db,
  ICurrentContext currentContext,
  IPushService pushService
) : INotificationService
{
  public async Task<Notification> Notify(
    DateTime at,
    Ref<Api.Auth.User>? sender,
    ImmutableList<Ref<Api.Auth.User>> recipients,
    string title,
    string message,
    string? uri
  )
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var id = Uuid7.Guid();
    await connection.InsertAsync(new NotificationDb(id, sender, at, title, message, uri), tx);
    await connection.InsertMultipleAsync(recipients.Select(u => new RecipientDb(id, u, null)), tx);

    tx.Commit();
    var notification = await Get(id);
    foreach (var recipient in recipients)
    {
      await pushService.Push(recipient, notification);
    }

    return notification;
  }

  public async Task<Notification> Get(Guid id)
  {
    using var connection = db.NewConnection();
    var notification = await connection.GetAsync<NotificationDb>(id);
    var recipients = await connection.QueryAsync(
      Query.Select<RecipientDb>().Where(r => r.NotificationId, ComparisonOperator.Eq, id)
    );
    return new Notification(
      notification.Id,
      notification.CreatedBy,
      notification.CreatedAt,
      recipients.Select(r => new Recipient(r.UserId, r.ReadAt)).ToImmutableList(),
      notification.Title,
      notification.Message,
      notification.Uri
    );
  }

  public async Task<PaginatedResponse<Notification>> List(Pagination pagination)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var notificationFilter = await connection.QueryAsync<Guid>(
      Query.Select<RecipientDb>()
        .Where(r => r.UserId, ComparisonOperator.Eq, currentContext.CurrentUser().Id)
        .And(r => r.ReadAt, ComparisonOperator.Eq, null)
      , tx
    );

    var notificationDbs = await connection.QueryAsync(
      Query.Select<NotificationDb>()
        .Where(n => n.Id, ComparisonOperator.In, notificationFilter)
        .And(pagination.ToFilter<NotificationDb>())
        .OrderBy(m => m.Id, false)
        .OrderBy(m => m.CreatedAt, false)
        .Take(pagination.Limit + 1)
      , tx
    );

    var allRecipients = (await connection.QueryAsync(
        Query.Select<RecipientDb>()
          .Where(r => r.NotificationId, ComparisonOperator.In, notificationDbs.Select(n => n.Id))
        , tx)
      )
      .GroupBy(r => r.NotificationId)
      .ToImmutableDictionary(g => g.Key, g => g.Select(r => new Recipient(r.UserId, r.ReadAt)).ToImmutableList());

    var notifications = notificationDbs
      .Take(pagination.Limit)
      .Select(n =>
      {
        var recipients = allRecipients.GetValueOrDefault(n.Id, ImmutableList<Recipient>.Empty);
        return new Notification(n.Id, n.CreatedBy, n.CreatedAt, recipients, n.Title, n.Message, n.Uri);
      }).ToImmutableList();

    var totalCount = notificationFilter.Count;
    var hasNext = totalCount > pagination.Limit;
    var next = hasNext ? notificationDbs.Last().ToCursor() : null;
    return new PaginatedResponse<Notification>(notifications.Count, next, notifications, totalCount);
  }

  public async Task MarkAsRead(Guid id)
  {
    var userId = currentContext.CurrentUser().Id;

    using var connection = db.NewConnection();
    await connection.UpdateAsync(
      Query.Update<RecipientDb>().Set(r => r.ReadAt, DateTime.UtcNow)
        .Where(r => r.NotificationId, ComparisonOperator.Eq, id)
        .And(r => r.UserId, ComparisonOperator.Eq, userId)
    );
  }

  public async Task MarkAsRead(IEnumerable<Guid> ids)
  {
    var userId = currentContext.CurrentUser().Id;

    using var connection = db.NewConnection();
    await connection.UpdateAsync(
      Query.Update<RecipientDb>().Set(r => r.ReadAt, DateTime.UtcNow)
        .Where(r => r.NotificationId, ComparisonOperator.In, ids)
        .And(r => r.UserId, ComparisonOperator.Eq, userId)
    );
  }

  public async Task<ImmutableList<Guid>> GetUnread()
  {
    using var connection = db.NewConnection();

    return await connection.QueryAsync<Guid>(
      Query.Select<RecipientDb>(r => r.NotificationId).Where(r => r.UserId, ComparisonOperator.Eq, currentContext.CurrentUser().Id)
        .And(r => r.ReadAt, ComparisonOperator.Eq, null)
    );
  }
}

public sealed record NotificationDb(
  Guid Id,
  Ref<Api.Auth.User>? CreatedBy,
  DateTime? CreatedAt,
  string Title,
  string Message,
  string? Uri
) : IEntity<Guid>;

public sealed record RecipientDb(
  Guid NotificationId,
  Ref<Api.Auth.User> UserId,
  DateTime? ReadAt
);