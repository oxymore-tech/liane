using System;
using System.Collections.Immutable;
using System.Data;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Liane.Api.Auth;
using Liane.Api.Community;
using Liane.Api.Util;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util;
using Liane.Service.Internal.Util.Sql;
using UuidExtensions;

namespace Liane.Service.Internal.Community;

public sealed class LianeMessageServiceImpl(
  PostgisDatabase db,
  ICurrentContext currentContext,
  LianeFetcher lianeFetcher,
  IPushService pushService,
  IUserService userService
) : ILianeMessageService
{
  private static readonly TimeZoneInfo TimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Paris");
  private static readonly CultureInfo Culture = new("fr-FR");

  public async Task<PaginatedResponse<LianeMessage>> GetMessages(Ref<Api.Community.Liane> liane, Pagination pagination)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var lianeId = liane.IdAsGuid();
    var member = await MarkAsRead(connection, lianeId, tx, DateTime.UtcNow);

    var filter = Filter<LianeMessageDb>.Where(m => m.LianeId, ComparisonOperator.Eq, lianeId)
                 & Filter<LianeMessageDb>.Where(m => m.CreatedAt, ComparisonOperator.Gt, member.JoinedAt);

    var query = Query.Select<LianeMessageDb>()
      .Where(filter)
      .And(pagination.ToFilter<LianeMessageDb>())
      .OrderBy(m => m.Id, false)
      .OrderBy(m => m.CreatedAt, false)
      .Take(pagination.Limit + 1);

    var total = await connection.QuerySingleAsync<int>(Query.Count<LianeMessageDb>().Where(filter), tx);
    var result = await connection.QueryAsync(query, tx);

    tx.Commit();

    var hasNext = result.Count > pagination.Limit;
    var cursor = hasNext ? result.Last().ToCursor() : null;
    return new PaginatedResponse<LianeMessage>(
      Math.Min(result.Count, pagination.Limit),
      cursor,
      result.Take(pagination.Limit)
        .Select(m => new LianeMessage(m.Id, m.CreatedBy, m.CreatedAt, m.Content))
        .ToImmutableList(),
      total);
  }

  public async Task<ImmutableDictionary<Ref<Api.Community.Liane>, int>> GetUnreadLianes()
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    var userId = currentContext.CurrentUser().Id;
    var unreadPendingJoinRequests = await connection.QueryAsync<(Guid, int)>("""
                                                                             SELECT m.liane_request_id, COUNT(req.id)
                                                                             FROM liane_member m
                                                                               INNER JOIN liane_request req ON req.id = m.liane_request_id
                                                                             WHERE m.joined_at IS NULL AND req.created_by = @userId
                                                                             GROUP BY m.liane_request_id
                                                                             """,
      new { userId }
      , tx);
    var unreadReceivedJoinRequests = await connection.QueryAsync<(Guid, int)>("""
                                                                              SELECT m.liane_id, COUNT(req.id) AS unread
                                                                              FROM liane_member m
                                                                                INNER JOIN liane_request req ON m.liane_request_id = req.id
                                                                              WHERE m.joined_at IS NULL AND req.created_by = @userId
                                                                              GROUP BY m.liane_id
                                                                              """,
      new { userId }
      , tx);
    var unread = await connection.QueryAsync<(Guid, int)>("""
                                                          SELECT m.liane_id, COUNT(msg.id) AS unread
                                                          FROM liane_member m
                                                            INNER JOIN liane_request r ON m.liane_request_id = r.id
                                                            LEFT JOIN liane_message msg ON msg.liane_id = m.liane_id AND msg.created_at > m.joined_at
                                                          WHERE m.joined_at IS NOT NULL AND r.created_by = @userId
                                                            AND (m.last_read_at IS NULL OR msg.created_at > m.last_read_at)
                                                          GROUP BY m.liane_id
                                                          """,
      new { userId }
      , tx);
    return unreadPendingJoinRequests
      .Concat(unreadReceivedJoinRequests)
      .Concat(unread)
      .GroupBy(t => t.Item1)
      .ToImmutableDictionary(g => (Ref<Api.Community.Liane>)g.Key, g => g.Sum(t => t.Item2));
  }

  public async Task MarkAsRead(Ref<Api.Community.Liane> liane, DateTime timestamp)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var lianeId = Guid.Parse(liane.Id);
    await MarkAsRead(connection, lianeId, tx, timestamp);
    tx.Commit();
  }

  public async Task<LianeMemberDb?> TryGetMember(IDbConnection connection, Guid lianeId, string? userId, IDbTransaction? tx)
  {
    var userIdValue = userId ?? currentContext.CurrentUser().Id;
    var lianeMemberDb = await connection.QueryFirstOrDefaultAsync<LianeMemberDb>("""
                                                                                 SELECT liane_member.liane_request_id, liane_member.liane_id, liane_member.requested_at, liane_member.joined_at, liane_member.last_read_at
                                                                                 FROM liane_member
                                                                                   INNER JOIN liane_request ON liane_member.liane_request_id = liane_request.id
                                                                                 WHERE liane_member.liane_id = @lianeId AND liane_request.created_by = @userId
                                                                                 """, new { userId = userIdValue, lianeId }, tx);
    return lianeMemberDb;
  }

  public async Task<LianeMessage?> SendMessage(Ref<Api.Community.Liane> liane, MessageContent content)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();
    var userId = currentContext.CurrentUser().Id;
    var lianeId = Guid.Parse(liane.Id);
    var resolvedLiane = await lianeFetcher.FetchLiane(connection, lianeId, tx);
    if (content is MessageContent.Text && !resolvedLiane.IsMember(userId))
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    var now = DateTime.UtcNow;

    content = content with { Value = await FormatMessage(userId, content) };

    if (content.Value.IsNullOrEmpty())
    {
      return null;
    }

    var id = Uuid7.Guid();
    await connection.InsertAsync(new LianeMessageDb(id, lianeId, content, userId, now), tx);
    var lianeMessage = new LianeMessage(id, userId, now, content);

    await pushService.PushMessage(lianeId, lianeMessage);
    tx.Commit();
    return lianeMessage;
  }

  private async Task<string?> FormatMessage(Ref<Api.Auth.User> sender, MessageContent content)
  {
    var value = content.Value?.Trim();
    if (!value.IsNullOrEmpty())
    {
      return value;
    }

    var sentBy = await FormatUser(await sender.Resolve(userService.Get));
    return content switch
    {
      MessageContent.LianeRequestModified => $"{sentBy} a modifié son annonce",
      MessageContent.TripAdded m => $"{sentBy} lance un covoit pour le {FormatDate(m.Trip.Value?.DepartureTime)}",
      MessageContent.MemberRequested => $"{sentBy} souhaite rejoindre la liane",
      MessageContent.MemberAdded m => $"{await FormatUser(m.User)} a rejoint la liane",
      MessageContent.MemberRejected m => $"La demande de {await FormatUser(m.User)} pour rejoindre la liane n'a pas été acceptée",
      MessageContent.MemberLeft m => $"{await FormatUser(m.User)} a quitté la liane",
      MessageContent.MemberJoinedTrip m => await FormatJoinedTrip(m),
      MessageContent.MemberLeftTrip m => $"{await FormatUser(m.User)} a quitté le trajet du {FormatDate(m.Trip.Value?.DepartureTime)}",
      MessageContent.MemberHasStarted => $"{sentBy} est en route",
      _ => null
    };
  }

  private async Task<string> FormatJoinedTrip(MessageContent.MemberJoinedTrip m)
  {
    var msg = $"{await FormatUser(m.User)} a rejoint le trajet du {FormatDate(m.Trip.Value?.DepartureTime)}";
    if (m.TakeReturn)
    {
      return msg + " (retour inclus)";
    }

    return msg;
  }

  private static string FormatDate(DateTime? dateTime) =>
    dateTime is null
      ? "???"
      : TimeZoneInfo.ConvertTime(dateTime.Value, TimeZone).ToString("dddd d MMMM", Culture);

  private async Task<string> FormatUser(Ref<Api.Auth.User>? user)
  {
    if (user is null)
    {
      return "???";
    }

    var resolved = await user.Resolve(userService.Get);

    return resolved.Pseudo;
  }

  private async Task<LianeMemberDb> MarkAsRead(IDbConnection connection, Guid lianeId, IDbTransaction tx, DateTime now)
  {
    var lianeMemberDb = await CheckIsMember(connection, lianeId, tx: tx);

    var update = Query.Update<LianeMemberDb>()
      .Set(m => m.LastReadAt, now)
      .Where(l => l.LianeRequestId, ComparisonOperator.Eq, lianeMemberDb.LianeRequestId)
      .And(l => l.LianeId, ComparisonOperator.Eq, lianeMemberDb.LianeId);
    await connection.UpdateAsync(update, tx);

    return lianeMemberDb with { LastReadAt = now };
  }

  private async Task<LianeMemberDb> CheckIsMember(IDbConnection connection, Guid lianeId, string? userId = null, IDbTransaction? tx = null)
  {
    var lianeMemberDb = await TryGetMember(connection, lianeId, userId, tx);

    if (lianeMemberDb is null)
    {
      throw new UnauthorizedAccessException("User is not part of the liane");
    }

    return lianeMemberDb;
  }
}