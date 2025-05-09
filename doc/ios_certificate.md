

```bash
export IOS_HOME=/home/agjini/Dropbox/gjini.co/app_store/liane/ios/
```
## **_Attention il faut les 2 étapes au même moment (car le fichier provision depend du premier certificate)_**

# Generate a distribution certificate (P12)

Generate new certificate request :

```bash
openssl req -new -key ios_distribution_pk.key -out ios_distribution.req -subj "/emailAddress=augustin.gjini@pm.me, UID=69748Y99L2, CN=iPhone Distribution: GJINI.CO (69748Y99L2), OU=69748Y99L2, O=GJINI.CO, C=FR"
```

Generate ios distribution certificate on apple developer portal using `ios_distribution.req` and download it as `ios_distribution.cer`

Transform to PKCS12 format (required by apple tool) :

```bash
openssl x509 -in ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM
openssl pkcs12 -export -legacy -out ios_distribution.p12 -inkey ios_distribution_pk.key -in ios_distribution.pem
```

Mettre le bon mot de passe 'Apple distribution certificate password'

Export to base 64 for githubaction secret :

```bash
openssl base64 < ios_distribution.p12 | tr -d '\n' | tee ios_distribution.base64.txt
```

And store result in github secret `IOS_P12_BASE64`

# Update a provision profile

Generate a new provision profile on https://developer.apple.com/account, output to `provision_liane.mobileprovision`

![img.png](img.png)

__Be sure to link with the App ID and the new generated distribution certificate__

![img_1.png](img_1.png)

Export to base 64 for githubaction secret :

```bash
openssl base64 < provision_liane.mobileprovision | tr -d '\n' | tee provision_liane.mobileprovision.base64.txt
```

Et après mettre à jour le sercret `IOS_MOBILE_PROVISION_BASE64` sur github :

![img_2.png](img_2.png)