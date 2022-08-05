using System;
using System.Collections.Generic;
using Liane.Service.Internal.RallyingPoints;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson.Serialization.Options;

namespace Liane.Service.Internal.Trip;

public sealed record DbTripIntent(
    ObjectId? Id,
    string User,
    DbRallyingPoint From,
    DbRallyingPoint To,
    DateTime FromTime,
    DateTime? ToTime,
    [property: BsonDictionaryOptions(DictionaryRepresentation.ArrayOfArrays)]
    Dictionary<DbRallyingPoint, DbRallyingPoint> Segments,
    string? Title
);