using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace Liane.Api.Util;

public interface IDatabaseImportContext: IDisposable
{ 
    Task Write(Stream stream, Encoding? encoding = default); 
}