using System;
using System.Collections.Immutable;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using MongoDB.Bson;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture]
public sealed class PaginationTest: BaseIntegrationTest
{
  [Test]
  public async Task ShouldPaginateWithoutCursorInMemory()
  {
    var e1 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, null);
    await collection.InsertOneAsync(e1);
    var actual = await collection.PaginateNatural(new Pagination());
    CollectionAssert.AreEquivalent(ImmutableList.Create(e1), actual.Data);
  }
  
  [Test]
  public async Task ShouldPaginateEmptyCollection()
  {
    var actual = await collection.PaginateNatural(new Pagination());
    CollectionAssert.AreEquivalent(ImmutableList<TestEntity>.Empty, actual.Data);
  }

  [Test]
  public async Task ShouldPaginateWithCursorInMemory()
  {
    var e1 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 15).ToUniversalTime());
    var e2 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 16).ToUniversalTime());
    var e3 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 17).ToUniversalTime());
    var e4 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 17).ToUniversalTime());
    var e5 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 18).ToUniversalTime());
    Thread.Sleep(1);
    var list = ImmutableList.Create(e1, e2, e4, e3, e5);
    await collection.InsertManyAsync(list);
    var actual = await collection.PaginateTime(new Pagination(new Cursor.Time(new DateTime(2023, 02, 17), null), 3), t => t.CreatedAt);
    CollectionAssert.AreEquivalent(ImmutableList.Create(e3, e4, e5), actual.Data);
    Assert.AreEqual(3, actual.PageSize);
    Assert.IsNull(actual.Next);
  }

  [Test]
  public  async Task  ShouldPaginateSorted()
  {
    var e1 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 15).ToUniversalTime());
    var e2 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 16).ToUniversalTime());
    var e3 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 17).ToUniversalTime());
    var e4 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 17).ToUniversalTime());
    var e5 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 18).ToUniversalTime());
    Thread.Sleep(1);
    var list = ImmutableList.Create(e1, e2, e4, e3, e5);
    await collection.InsertManyAsync(list);
    // Ascending 
    var actual =  await collection.PaginateTime(new Pagination(null, 3, true), e => e.CreatedAt);
    CollectionAssert.AreEquivalent(ImmutableList.Create(e1, e2, e3), actual.Data);
    // Descending
    actual =  await collection.PaginateTime(new Pagination(null, 3, false), e => e.CreatedAt);
    CollectionAssert.AreEquivalent(ImmutableList.Create(e5, e4, e3), actual.Data);
 }
  
  [Test]
  public  async Task  ShouldPaginateWithCursorInMemoryWithNext()
  {
    var e1 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 15).ToUniversalTime());
    var e2 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 16).ToUniversalTime());
    var e3 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 17).ToUniversalTime());
    var e4 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 17).ToUniversalTime());
    var e5 = new TestEntity(ObjectId.GenerateNewId().ToString()!, null, new DateTime(2023, 02, 18).ToUniversalTime());
    Thread.Sleep(1);
    var list = ImmutableList.Create(e4, e5, e3, e1, e2);
    await collection.InsertManyAsync(list);
    var actual =  await collection.PaginateTime(new Pagination(new Cursor.Time(new DateTime(2023, 02, 16), null), 3), e => e.CreatedAt);
    CollectionAssert.AreEquivalent(ImmutableList.Create(e2, e3, e4), actual.Data);
    Assert.AreEqual(3, actual.PageSize);
    Assert.AreEqual(new Cursor.Time(new DateTime(2023, 02, 18).ToUniversalTime(), e5.Id), actual.Next);
  }

  internal sealed record TestEntity(string Id, Ref<User>? CreatedBy, DateTime? CreatedAt) : IEntity<string>;

  private IMongoCollection<TestEntity> collection = null!;

  protected override void Setup(IMongoDatabase db)
  {
    this.collection = db.GetCollection<TestEntity>();
  }
}