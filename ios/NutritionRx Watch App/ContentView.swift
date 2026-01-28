/**
 * ContentView
 * Root view for the Watch app
 */

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var connector: PhoneConnector

    var body: some View {
        NavigationStack {
            NutritionHomeView()
        }
    }
}

// MARK: - Preview

#Preview {
    ContentView()
        .environmentObject(PhoneConnector.shared)
}
