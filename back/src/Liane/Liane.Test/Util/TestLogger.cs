using System;
using Microsoft.Extensions.Logging;
using NUnit.Framework;

namespace Liane.Test.Util;

public sealed class TestLogger<T> : ILogger<T>, IDisposable
{
    private readonly Action<string> output = TestContext.WriteLine;

    public void Dispose()
    {
    }

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) => output(formatter(state, exception));

    public bool IsEnabled(LogLevel logLevel) => true;

    public IDisposable BeginScope<TState>(TState state) => this;
}