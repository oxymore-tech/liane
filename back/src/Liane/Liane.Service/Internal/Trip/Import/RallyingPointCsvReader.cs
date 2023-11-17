using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading;
using CsvHelper;
using CsvHelper.Configuration;
using Liane.Api.Trip;
using Liane.Api.Util;

namespace Liane.Service.Internal.Trip.Import;

public sealed class RallyingPointCsvReader
{
  public async IAsyncEnumerable<RallyingPoint> Parse(Stream csv)
  {
    using var reader = new StreamReader(csv);
    var configuration = new CsvConfiguration(CultureInfo.InvariantCulture) { PrepareHeaderForMatch = args => args.Header.NormalizeToCamelCase() };
    using var csvReader = new CsvReader(reader, configuration);

    var entries = csvReader.GetRecords<BnlcEntry>();

    var fullAddressRegex = new Regex("[^\"]+[.] (\\d{5}) [^\"]+");
    var pool = new Semaphore(initialCount: 8, maximumCount: 8);
    yield break;
  }
}