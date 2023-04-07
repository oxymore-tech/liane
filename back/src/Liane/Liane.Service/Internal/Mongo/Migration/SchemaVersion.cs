using System;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed record SchemaVersion(int Version, DateTime? AppliedAt);