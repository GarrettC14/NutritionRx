/**
 * HomeView
 * Main watch app home screen with daily nutrition summary
 */

import SwiftUI

struct NutritionHomeView: View {
    @EnvironmentObject var connector: PhoneConnector

    @State private var showWaterDetail = false
    @State private var showQuickAdd = false
    @State private var showRecentFoods = false
    @State private var showCalorieDetail = false

    private var dailyData: WatchDailyData? {
        connector.dailyData
    }

    private var calorieProgress: Double {
        guard let data = dailyData, data.calorieTarget > 0 else { return 0 }
        return min(Double(data.caloriesConsumed) / Double(data.calorieTarget), 1.0)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Calorie Progress Ring (tappable)
                Button(action: { showCalorieDetail = true }) {
                    CalorieRingView(
                        consumed: dailyData?.caloriesConsumed ?? 0,
                        target: dailyData?.calorieTarget ?? 2000,
                        progress: calorieProgress
                    )
                }
                .buttonStyle(PlainButtonStyle())
                .padding(.top, 8)

                // Remaining calories message
                remainingCaloriesText
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.textSecondary)

                // Water row
                WaterRow(
                    glasses: dailyData?.waterGlasses ?? 0,
                    target: dailyData?.waterTarget ?? 8,
                    onAdd: addWater,
                    onTap: { showWaterDetail = true }
                )

                // Quick Add Button
                Button(action: { showQuickAdd = true }) {
                    HStack {
                        Image(systemName: "plus")
                        Text("Quick Add")
                    }
                    .watchButton()
                }
                .buttonStyle(PlainButtonStyle())
                .padding(.horizontal)

                // Macro Summary
                MacroSummaryView(
                    protein: dailyData?.protein ?? 0,
                    carbs: dailyData?.carbs ?? 0,
                    fat: dailyData?.fat ?? 0
                )

                // Recent Foods Button
                Button(action: { showRecentFoods = true }) {
                    HStack {
                        Image(systemName: "clock.arrow.circlepath")
                        Text("Recent Foods")
                    }
                    .font(.system(size: 14))
                    .foregroundColor(AppColors.accent)
                }
                .buttonStyle(PlainButtonStyle())
                .padding(.top, 8)

                // Connection status
                if !connector.isPhoneReachable {
                    HStack {
                        Image(systemName: "iphone.slash")
                            .font(.system(size: 10))
                        Text("Offline")
                            .font(.system(size: 10))
                    }
                    .foregroundColor(AppColors.textTertiary)
                    .padding(.top, 4)
                }
            }
            .padding(.bottom, 16)
        }
        .background(AppColors.bgPrimary)
        .sheet(isPresented: $showWaterDetail) {
            WaterDetailView()
        }
        .sheet(isPresented: $showQuickAdd) {
            QuickAddView()
        }
        .sheet(isPresented: $showRecentFoods) {
            RecentFoodsView()
        }
        .sheet(isPresented: $showCalorieDetail) {
            CalorieDetailView()
        }
        .onAppear {
            connector.requestSync()
        }
    }

    // MARK: - Remaining Calories Text

    @ViewBuilder
    private var remainingCaloriesText: some View {
        if let data = dailyData {
            let remaining = data.calorieTarget - data.caloriesConsumed
            if remaining > 0 {
                Text("\(remaining) left")
            } else if remaining == 0 {
                Text("Goal met! \u{1F389}")
                    .foregroundColor(AppColors.success)
            } else {
                // Over target - NON-JUDGMENTAL language (never use "over by" or red)
                Text("Enjoying \(abs(remaining)) extra")
            }
        } else {
            Text("--")
        }
    }

    // MARK: - Actions

    private func addWater() {
        HapticFeedback.click()
        connector.addWater()

        // Check if goal just reached
        if let data = dailyData,
           data.waterGlasses + 1 >= data.waterTarget,
           !data.hasMetWaterGoal {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                HapticFeedback.success()
            }
        }
    }
}

// MARK: - Calorie Detail View

struct CalorieDetailView: View {
    @EnvironmentObject var connector: PhoneConnector
    @Environment(\.dismiss) var dismiss

    private var dailyData: WatchDailyData? {
        connector.dailyData
    }

    private var calorieProgress: Double {
        guard let data = dailyData, data.calorieTarget > 0 else { return 0 }
        return min(Double(data.caloriesConsumed) / Double(data.calorieTarget), 1.0)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Large calorie ring
                DetailedCalorieRingView(
                    consumed: dailyData?.caloriesConsumed ?? 0,
                    target: dailyData?.calorieTarget ?? 2000,
                    progress: calorieProgress
                )

                // Status message
                statusMessage
                    .font(.system(size: 14))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                // Macros
                DetailedMacroView(
                    protein: dailyData?.protein ?? 0,
                    carbs: dailyData?.carbs ?? 0,
                    fat: dailyData?.fat ?? 0,
                    proteinTarget: nil,
                    carbsTarget: nil,
                    fatTarget: nil
                )
            }
            .padding()
        }
        .background(AppColors.bgPrimary)
        .navigationTitle("Today")
    }

    @ViewBuilder
    private var statusMessage: some View {
        if let data = dailyData {
            let remaining = data.calorieTarget - data.caloriesConsumed
            if remaining > 0 {
                VStack(spacing: 4) {
                    Text("\(remaining) calories left")
                        .foregroundColor(AppColors.textPrimary)
                    Text("You're doing great!")
                        .foregroundColor(AppColors.textSecondary)
                }
            } else if remaining == 0 {
                VStack(spacing: 4) {
                    Text("Goal met! \u{1F389}")
                        .foregroundColor(AppColors.success)
                    Text("Well done today!")
                        .foregroundColor(AppColors.textSecondary)
                }
            } else {
                // Non-judgmental message for going over
                VStack(spacing: 4) {
                    Text("Enjoying \(abs(remaining)) extra")
                        .foregroundColor(AppColors.textPrimary)
                    Text("Every day is different")
                        .foregroundColor(AppColors.textSecondary)
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    NutritionHomeView()
        .environmentObject(PhoneConnector.shared)
}
