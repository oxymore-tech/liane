using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Liane.Api.Image;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Util;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Image;

public sealed class ImageServiceImpl : IImageService
{
  private readonly HttpClient httpClient;
  private readonly JsonSerializerOptions jsonOptions;
  private readonly CloudflareSettings cloudflareSettings;
  private readonly ILogger<ImageServiceImpl> logger;
  private readonly ICurrentContext currentContext;
  private readonly IUserService userService;

  public ImageServiceImpl(HttpClient httpClient, CloudflareSettings cloudflareSettings, JsonSerializerOptions jsonOptions, ILogger<ImageServiceImpl> logger, ICurrentContext currentContext,
    IUserService userService)
  {
    this.httpClient = httpClient;
    this.jsonOptions = jsonOptions;
    this.cloudflareSettings = cloudflareSettings;
    this.logger = logger;
    this.currentContext = currentContext;
    this.userService = userService;
  }

  public async Task<string> UploadProfile(IFormFile input)
  {
    var currentUserId = currentContext.CurrentUser().Id;
    var imageId = $"user_{currentUserId}";

    await DeleteImage(imageId);

    var result = await UploadImage(input, imageId);

    var picturelUrl = GetPicturelUrl(result.Result!.Id, Variant.Avatar);
    await userService.UpdateAvatar(currentUserId, picturelUrl);
    return picturelUrl;
  }

  public async Task DeleteProfile(string userId)
  {
    var imageId = $"user_{userId}";

    await DeleteImage(imageId);
  }

  private async Task<ImageReponse> UploadImage(IFormFile input, string id)
  {
    var requestUri = GetApiUri();
    using var requestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri);

    requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cloudflareSettings.ApiKey);

    var multipartContent = new MultipartFormDataContent();
    multipartContent.Add(new StreamContent(input.OpenReadStream()), "file");
    multipartContent.Add(new StringContent(id), "id");
    requestMessage.Content = multipartContent;

    using var response = await httpClient.SendAsync(requestMessage);
    var result = await response.CheckAndReadResponseAs<ImageReponse>(jsonOptions);
    return result;
  }

  private async Task DeleteImage(string id)
  {
    try
    {
      var requestUri = GetApiUri(id);
      using var requestMessage = new HttpRequestMessage(HttpMethod.Delete, requestUri);
      requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cloudflareSettings.ApiKey);
      using var response = await httpClient.SendAsync(requestMessage);
      await response.CheckAndReadResponseAs<ImageReponse>(jsonOptions);
    }
    catch (ResourceNotFoundException)
    {
    }
  }

  private string GetPicturelUrl(string imageId, Variant variant) => $"https://imagedelivery.net/{cloudflareSettings.AccountHash}/{imageId}/{variant.ToString().ToLowerInvariant()}";

  private string GetApiUri(string? imageId = null)
  {
    if (cloudflareSettings.AccountId is null)
    {
      logger.LogWarning("Clouflare account id is not set, skipping image upload");
      throw new BadHttpRequestException("Clouflare account id is not set, skipping image upload");
    }

    var uri = $"https://api.cloudflare.com/client/v4/accounts/{cloudflareSettings.AccountId}/images/v1";
    if (imageId is not null)
    {
      uri += $"/{imageId}";
    }

    return uri;
  }
}