/**
 * PhoneConnector
 * Handles WatchConnectivity communication between Watch and iPhone
 */

import Foundation
import WatchConnectivity
import WidgetKit
import Combine

/// Service for communicating with the parent iPhone app
class PhoneConnector: NSObject, ObservableObject {

    // MARK: - Singleton

    static let shared = PhoneConnector()

    // MARK: - App Group

    private static let appGroupID = "group.com.nutritionrx.app"

    // MARK: - Published Properties

    /// Current daily data from phone
    @Published var dailyData: WatchDailyData?

    /// Whether the iPhone is currently reachable
    @Published var isPhoneReachable = false

    /// Commands waiting to be sent when connection restores
    @Published var pendingCommandCount = 0

    /// Last sync timestamp
    @Published var lastSyncTime: Date?

    /// Connection error message
    @Published var connectionError: String?

    // MARK: - Private Properties

    private var session: WCSession?
    private var pendingCommands: [Data] = []

    // MARK: - Initialization

    override init() {
        super.init()
        setupSession()
    }

    private func setupSession() {
        guard WCSession.isSupported() else {
            connectionError = "WatchConnectivity not supported"
            return
        }

        session = WCSession.default
        session?.delegate = self
        session?.activate()
    }

    // MARK: - Public Methods

    /// Request fresh data from phone
    func requestSync() {
        sendCommand(.requestSync)
    }

    /// Add water with optimistic update
    func addWater() {
        // Optimistic update
        if var data = dailyData {
            data.waterGlasses += 1
            dailyData = data
            saveToAppGroup(data)
            reloadComplications()
        }

        sendCommand(.addWater(glasses: 1))
    }

    /// Remove water with optimistic update
    func removeWater() {
        guard var data = dailyData, data.waterGlasses > 0 else { return }

        // Optimistic update
        data.waterGlasses -= 1
        dailyData = data
        saveToAppGroup(data)
        reloadComplications()

        sendCommand(.removeWater(glasses: 1))
    }

    /// Quick add calories with optimistic update
    func quickAddCalories(_ calories: Int, meal: MealType) {
        // Optimistic update
        if var data = dailyData {
            data.caloriesConsumed += calories
            dailyData = data
            saveToAppGroup(data)
            reloadComplications()
        }

        sendCommand(.quickAddCalories(calories: calories, meal: meal))
    }

    /// Log food from recent/favorites
    func logFood(foodId: String, meal: MealType) {
        // Find the food to optimistically update calories
        if var data = dailyData {
            if let food = data.recentFoods.first(where: { $0.id == foodId }) {
                data.caloriesConsumed += food.calories
                if let protein = food.protein { data.protein += protein }
                if let carbs = food.carbs { data.carbs += carbs }
                if let fat = food.fat { data.fat += fat }
                dailyData = data
                saveToAppGroup(data)
                reloadComplications()
            }
        }

        sendCommand(.logFood(foodId: foodId, meal: meal))
    }

    // MARK: - Private Methods

    private func sendCommand(_ command: NutritionWatchCommand) {
        guard let session = session else {
            queueCommand(command)
            return
        }

        let messageDict = command.toDictionary()

        if session.isReachable {
            // Send immediately if phone is reachable
            session.sendMessage(messageDict, replyHandler: { [weak self] reply in
                DispatchQueue.main.async {
                    self?.handleReply(reply)
                }
            }, errorHandler: { [weak self] error in
                print("Failed to send message: \(error)")
                self?.queueCommand(command)
            })
        } else {
            // Queue for later
            queueCommand(command)
        }
    }

    private func queueCommand(_ command: NutritionWatchCommand) {
        guard let data = try? JSONEncoder().encode(command) else { return }

        pendingCommands.append(data)
        pendingCommandCount = pendingCommands.count

        // Use transferUserInfo for background delivery
        session?.transferUserInfo(["command": data])
    }

    private func handleReply(_ reply: [String: Any]) {
        // Process any updated data in reply
        if let dailyDataRaw = reply["daily"] as? Data,
           let daily = try? JSONDecoder().decode(WatchDailyData.self, from: dailyDataRaw) {
            dailyData = daily
            lastSyncTime = Date()
        }
    }

    private func flushPendingCommands() {
        guard let session = session, session.isReachable else { return }

        for data in pendingCommands {
            if let command = try? JSONDecoder().decode(NutritionWatchCommand.self, from: data) {
                let messageDict = command.toDictionary()
                session.sendMessage(messageDict, replyHandler: nil, errorHandler: nil)
            }
        }

        pendingCommands.removeAll()
        pendingCommandCount = 0
    }
}

// MARK: - WCSessionDelegate

extension PhoneConnector: WCSessionDelegate {

    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        DispatchQueue.main.async { [weak self] in
            if let error = error {
                self?.connectionError = error.localizedDescription
            } else {
                self?.isPhoneReachable = session.isReachable
                self?.connectionError = nil
            }
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { [weak self] in
            self?.isPhoneReachable = session.isReachable

            // Flush pending commands when connection restored
            if session.isReachable {
                self?.flushPendingCommands()
                self?.requestSync()
            }
        }
    }

    func session(_ session: WCSession,
                 didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            self?.processApplicationContext(applicationContext)
        }
    }

    func session(_ session: WCSession,
                 didReceiveUserInfo userInfo: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            self?.processApplicationContext(userInfo)
        }
    }

    func session(_ session: WCSession,
                 didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            self?.processApplicationContext(message)
        }
    }

    func session(_ session: WCSession,
                 didReceiveMessage message: [String: Any],
                 replyHandler: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async { [weak self] in
            self?.processApplicationContext(message)
            replyHandler(["received": true])
        }
    }

    private func processApplicationContext(_ context: [String: Any]) {
        if let dailyDataRaw = context["daily"] as? Data,
           let daily = try? JSONDecoder().decode(WatchDailyData.self, from: dailyDataRaw) {
            dailyData = daily
            lastSyncTime = Date()
            connectionError = nil

            // Save to App Group for complications
            saveToAppGroup(daily)
            reloadComplications()
        }
    }

    // MARK: - App Group Storage

    private func saveToAppGroup(_ data: WatchDailyData) {
        guard let defaults = UserDefaults(suiteName: Self.appGroupID),
              let encoded = try? JSONEncoder().encode(data) else {
            return
        }

        defaults.set(encoded, forKey: "watchDailyData")
        defaults.synchronize()
    }

    private func reloadComplications() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}
