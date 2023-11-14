using System;
using System.IO;
using System.Threading.Tasks;

namespace Liane.Api.Util;

public interface IDatabaseExportContext: IDisposable
{
  Task<Stream> GetStream();
}