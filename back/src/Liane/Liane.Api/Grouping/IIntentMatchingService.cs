using System.Collections.Generic;
using System.Threading.Tasks;

namespace Liane.Api.Grouping;

public interface IIntentMatchingService
{
    public Task<List<MatchedTripIntent>> GetMatchedGroups();
}