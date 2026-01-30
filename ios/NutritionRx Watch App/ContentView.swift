/**
 * ContentView
 * Root view for the Watch app
 */

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var connector: PhoneConnector

    private var fastingState: FastingState? {
        connector.dailyData?.fasting
    }

    var body: some View {
        NavigationStack {
            NutritionHomeView()
                .toolbar {
                    if let fasting = fastingState, fasting.isEnabled {
                        ToolbarItem(placement: .topBarTrailing) {
                            NavigationLink(destination: FastingTimerView()) {
                                Image(systemName: fasting.isFasting ? "moon.fill" : "fork.knife")
                                    .foregroundColor(fasting.isFasting ? AppColors.fasting : AppColors.eatingWindow)
                            }
                        }
                    }
                }
        }
    }
}

// MARK: - Preview

#Preview {
    ContentView()
        .environmentObject(PhoneConnector.shared)
}
