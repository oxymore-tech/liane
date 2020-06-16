using System.Threading.Tasks;
using NUnit.Framework;

namespace Liane.Test
{
    [TestFixture]
    public sealed class RoutingTest
    {
        [SetUp]
        public void SetUp()
        {
        }

        [TearDown]
        public void TearDown()
        {
        }

        [Test]
        public async Task ShouldGetAMigratedDbConnection()
        {
            // using var connection = await "";
            // var count = await connection.QuerySingleAsync<int>("SELECT count(*) FROM test_global_table");
            // Assert.AreEqual(3, count);
            Assert.IsFalse(true);
        }
    }
}