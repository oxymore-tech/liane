use std::env::var;

use jsonwebtoken::{DecodingKey, EncodingKey};

#[derive(Clone)]
pub struct Keys {
    pub encoding: EncodingKey,
    pub decoding: DecodingKey,
}

impl Keys {
    pub fn new(secret: &[u8]) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret),
            decoding: DecodingKey::from_secret(secret),
        }
    }
}

#[derive(Clone)]
pub struct Config {
    pub auth_keys: Keys,
    pub sms_api_key: String,
    pub osrm_url: String,
    pub auth_test_account: Option<String>,
    pub auth_test_code: Option<String>,
}

impl Config {
    pub fn load() -> Config {
        Config {
            auth_keys: Keys::new(var("JWT_SECRET").expect("Miss JWT_SECRET").as_bytes()),
            sms_api_key: var("SMS_API_KEY").expect("Miss SMS_API_KEY"),
            osrm_url: var("OSRM_URL").unwrap_or_else(|_| "http://localhost:5000".to_string()),
            auth_test_account: var("AUTH_TEST_ACCOUNT").ok(),
            auth_test_code: var("AUTH_TEST_CODE").ok(),
        }
    }
}
