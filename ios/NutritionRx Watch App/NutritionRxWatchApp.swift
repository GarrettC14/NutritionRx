/**
 * NutritionRx Watch App
 * Main entry point for the watchOS companion app
 */

import SwiftUI

@main
struct NutritionRxWatchApp: App {
    /// Shared phone connector instance
    @StateObject private var connector = PhoneConnector.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(connector)
        }
    }
}
