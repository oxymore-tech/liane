using System;

namespace Liane.Service.Internal.Mongo.Migration;

public sealed record SchemaVersion(int Id, DateTime? AppliedAt);