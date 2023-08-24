using System;
using System.Collections.Immutable;
using System.Threading;
using Liane.Api.User;
using Liane.Api.Util;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using NUnit.Framework;

namespace Liane.Test.Util;

[TestFixture]
public sealed class PaginationTest
{
  [Test]
  public void ShouldPaginateWithoutCursorInMemory()
  {
    var e1 = new TestEntity("11", null, null);
    var list = ImmutableList.Create(e1);
    var actual = list.Paginate<TestEntity,Cursor.Time>(new Pagination(), e => e.Id);
    CollectionAssert.AreEquivalent(ImmutableList.Create(e1), actual.Data);
  }

  [Test]
  public void ShouldPaginateWithCursorInMemory()
  {
    var e1 = new TestEntity("11", null, new DateTime(2023, 02, 15));
    var e2 = new TestEntity("12", null, new DateTime(2023, 02, 16));
    var e3 = new TestEntity("13", null, new DateTime(2023, 02, 17));
    var e4 = new TestEntity("14", null, new DateTime(2023, 02, 17));
    var e5 = new TestEntity("15", null, new DateTime(2023, 02, 18));
    Thread.Sleep(1);
    var list = ImmutableList.Create(e1, e2, e4, e3, e5);
    var actual = list.Paginate<TestEntity,Cursor.Time>(new Pagination(new Cursor.Time(new DateTime(2023, 02, 16), null), 3), e => e.CreatedAt);
    CollectionAssert.AreEquivalent(ImmutableList.Create(e3, e4, e5), actual.Data);
    Assert.AreEqual(3, actual.PageSize);
    Assert.AreEqual(5, actual.TotalCount);
    Assert.IsNull(actual.Next);
  }

  [Test]
  public void ShouldPaginateSorted()
  {
    var e1 = new TestEntity("11", null, new DateTime(2023, 02, 15));
    var e2 = new TestEntity("12", null, new DateTime(2023, 02, 16));
    var e3 = new TestEntity("13", null, new DateTime(2023, 02, 17));
    var e4 = new TestEntity("14", null, new DateTime(2023, 02, 17));
    var e5 = new TestEntity("15", null, new DateTime(2023, 02, 18));
    Thread.Sleep(1);
    var list = ImmutableList.Create(e1, e2, e4, e3, e5);
    // Ascending 
    var actual = list.Paginate<TestEntity,Cursor.Time>(new Pagination(null, 3, true), e => e.CreatedAt);
    CollectionAssert.AreEquivalent(ImmutableList.Create(e1, e2, e3), actual.Data);
    // Descending
    actual = list.Paginate<TestEntity,Cursor.Time>(new Pagination(null, 3, false), e => e.CreatedAt);
    CollectionAssert.AreEquivalent(ImmutableList.Create(e5, e4, e3), actual.Data);
 }
  
  [Test]
  public void ShouldPaginateWithCursorInMemoryWithNext()
  {
    var e1 = new TestEntity("11", null, new DateTime(2023, 02, 15));
    var e2 = new TestEntity("12", null, new DateTime(2023, 02, 16));
    var e3 = new TestEntity("13", null, new DateTime(2023, 02, 17));
    var e4 = new TestEntity("14", null, new DateTime(2023, 02, 17));
    var e5 = new TestEntity("15", null, new DateTime(2023, 02, 18));
    Thread.Sleep(1);
    var list = ImmutableList.Create(e4, e5, e3, e1, e2);
    var actual = list.Paginate<TestEntity,Cursor.Time>(new Pagination(new Cursor.Time(new DateTime(2023, 02, 15), null), 3), e => e.CreatedAt);
    CollectionAssert.AreEquivalent(ImmutableList.Create(e2, e3, e4), actual.Data);
    Assert.AreEqual(3, actual.PageSize);
    Assert.AreEqual(5, actual.TotalCount);
    Assert.AreEqual(new Cursor.Time(new DateTime(2023, 02, 17), "14"), actual.Next);
  }

  internal sealed record TestEntity(string Id, Ref<User>? CreatedBy, DateTime? CreatedAt) : IEntity;
}