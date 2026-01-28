/**
 * WatchConnectivityModule
 * React Native bridge for Apple Watch communication
 */

import Foundation
import WatchConnectivity
import React

@objc(WatchConnectivityModule)
class WatchConnectivityModule: RCTEventEmitter, WCSessionDelegate {

    // MARK: - Properties

    private var session: WCSession?
    private var hasListeners = false
    private var lastSentData: [String: Any]?

    // MARK: - Initialization

    override init() {
        super.init()
        setupWatchSession()
    }

    private func setupWatchSession() {
        guard WCSession.isSupported() else {
            print("WatchConnectivity not supported on this device")
            return
        }

        session = WCSession.default
        session?.delegate = self
        session?.activate()
    }

    // MARK: - RCTEventEmitter

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func supportedEvents() -> [String]! {
        return [
            "WatchCommand",
            "WatchReachabilityChanged",
            "WatchSessionStateChanged"
        ]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    // MARK: - Bridge Methods

    /// Send daily nutrition data to the watch
    @objc func sendDailyDataToWatch(_ dailyData: NSDictionary) {
        guard let session = session,
              session.isPaired,
              session.isWatchAppInstalled else {
            print("Watch not available")
            return
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: dailyData)
            try session.updateApplicationContext(["daily": data])
            lastSentData = dailyData as? [String: Any]
            print("Daily data sent to watch")
        } catch {
            print("Failed to send daily data to watch: \(error)")
        }
    }

    /// Send recent foods list to watch
    @objc func sendRecentFoodsToWatch(_ foods: NSArray) {
        guard let session = session,
              session.isPaired,
              session.isWatchAppInstalled else {
            return
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: foods)
            session.transferUserInfo(["recentFoods": data])
        } catch {
            print("Failed to send recent foods: \(error)")
        }
    }

    /// Check if watch is reachable
    @objc func isWatchReachable(_ resolver: @escaping RCTPromiseResolveBlock,
                                rejecter: @escaping RCTPromiseRejectBlock) {
        resolver(session?.isReachable ?? false)
    }

    /// Check if watch is paired
    @objc func isWatchPaired(_ resolver: @escaping RCTPromiseResolveBlock,
                             rejecter: @escaping RCTPromiseRejectBlock) {
        resolver(session?.isPaired ?? false)
    }

    /// Check if watch app is installed
    @objc func isWatchAppInstalled(_ resolver: @escaping RCTPromiseResolveBlock,
                                   rejecter: @escaping RCTPromiseRejectBlock) {
        resolver(session?.isWatchAppInstalled ?? false)
    }

    /// Get watch session state
    @objc func getWatchSessionState(_ resolver: @escaping RCTPromiseResolveBlock,
                                    rejecter: @escaping RCTPromiseRejectBlock) {
        guard let session = session else {
            resolver([
                "isSupported": WCSession.isSupported(),
                "isPaired": false,
                "isWatchAppInstalled": false,
                "isReachable": false
            ])
            return
        }

        resolver([
            "isSupported": true,
            "isPaired": session.isPaired,
            "isWatchAppInstalled": session.isWatchAppInstalled,
            "isReachable": session.isReachable
        ])
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            if self.hasListeners {
                self.sendEvent(withName: "WatchSessionStateChanged", body: [
                    "state": self.activationStateString(activationState),
                    "error": error?.localizedDescription as Any
                ])
            }

            // Send initial reachability state
            if self.hasListeners {
                self.sendEvent(withName: "WatchReachabilityChanged", body: [
                    "isReachable": session.isReachable
                ])
            }
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {
        // iOS app transitioning to background
    }

    func sessionDidDeactivate(_ session: WCSession) {
        // Reactivate session
        session.activate()
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.hasListeners else { return }

            self.sendEvent(withName: "WatchReachabilityChanged", body: [
                "isReachable": session.isReachable
            ])

            // Resend last data if watch became reachable
            if session.isReachable, let lastData = self.lastSentData {
                self.sendDailyDataToWatch(lastData as NSDictionary)
            }
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        handleWatchMessage(message)
    }

    func session(_ session: WCSession,
                 didReceiveMessage message: [String: Any],
                 replyHandler: @escaping ([String: Any]) -> Void) {
        handleWatchMessage(message)
        replyHandler(["received": true])
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        handleWatchMessage(userInfo)
    }

    // MARK: - Private Methods

    private func handleWatchMessage(_ message: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.hasListeners else { return }

            // Parse command from watch
            if let commandData = message["command"] as? Data {
                do {
                    if let commandDict = try JSONSerialization.jsonObject(with: commandData) as? [String: Any] {
                        self.sendEvent(withName: "WatchCommand", body: commandDict)
                    }
                } catch {
                    print("Failed to parse watch command: \(error)")
                }
            } else {
                // Send raw message
                self.sendEvent(withName: "WatchCommand", body: message)
            }
        }
    }

    private func activationStateString(_ state: WCSessionActivationState) -> String {
        switch state {
        case .notActivated: return "notActivated"
        case .inactive: return "inactive"
        case .activated: return "activated"
        @unknown default: return "unknown"
        }
    }
}
