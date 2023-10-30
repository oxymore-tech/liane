#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(RNLianeGeolocation, RCTEventEmitter)

RCT_EXTERN_METHOD(
  requestAuthorization:(NSString *)level
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject
)

_RCT_EXTERN_REMAP_METHOD(
  startObserving,
  startLocationUpdate:(NSDictionary *)options,
  false
)

_RCT_EXTERN_REMAP_METHOD(stopObserving, stopLocationUpdate, false)

@end
