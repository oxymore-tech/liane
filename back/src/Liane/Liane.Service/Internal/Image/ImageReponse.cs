using System.Collections.Immutable;

namespace Liane.Service.Internal.Image;

internal sealed record Result(string Id, string FileName, ImmutableList<string> Variants);

internal sealed record ImageReponse(Result? Result, bool Success);