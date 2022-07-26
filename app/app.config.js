// DD_CLIENT_TOKEN and DD_APP_ID registered as secrets
// ENV_NAME as any other envi. variable
const { DD_CLIENT_TOKEN, DD_APP_ID, ENV_NAME } = process.env;

export default {
  extra: {
    envName: ENV_NAME,
    datadogClientToken: DD_CLIENT_TOKEN,
    datadogAppId: DD_APP_ID
  }
};
