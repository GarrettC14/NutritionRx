/**
 * WatchConnectivityModule Bridge
 * Objective-C bridge for React Native
 */

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(WatchConnectivityModule, RCTEventEmitter)

RCT_EXTERN_METHOD(sendDailyDataToWatch:(NSDictionary *)dailyData)

RCT_EXTERN_METHOD(sendRecentFoodsToWatch:(NSArray *)foods)

RCT_EXTERN_METHOD(isWatchReachable:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(isWatchPaired:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(isWatchAppInstalled:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(getWatchSessionState:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
