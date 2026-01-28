/**
 * RecentFoodsView
 * Display and log recent/favorite foods
 */

import SwiftUI

struct RecentFoodsView: View {
    @EnvironmentObject var connector: PhoneConnector
    @Environment(\.dismiss) var dismiss

    private var recentFoods: [SimpleFood] {
        connector.dailyData?.recentFoods ?? []
    }

    private var favoriteFoods: [SimpleFood] {
        connector.dailyData?.favoriteFoods ?? []
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Favorites section
                if !favoriteFoods.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Favorites")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(AppColors.textSecondary)
                            .padding(.horizontal)

                        ForEach(favoriteFoods) { food in
                            FoodRow(food: food) {
                                logFood(food)
                            }
                        }
                    }
                }

                // Recent foods section
                if !recentFoods.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Recent Foods")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(AppColors.textSecondary)
                            .padding(.horizontal)

                        ForEach(recentFoods) { food in
                            FoodRow(food: food) {
                                logFood(food)
                            }
                        }
                    }
                }

                // Empty state
                if recentFoods.isEmpty && favoriteFoods.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "fork.knife")
                            .font(.system(size: 32))
                            .foregroundColor(AppColors.textTertiary)

                        Text("No recent foods")
                            .font(.system(size: 14))
                            .foregroundColor(AppColors.textSecondary)

                        Text("Log foods on your phone to see them here")
                            .font(.system(size: 12))
                            .foregroundColor(AppColors.textTertiary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.vertical, 32)
                }

                // View more prompt
                Button(action: openPhoneApp) {
                    HStack {
                        Text("View more on")
                        Image(systemName: "iphone")
                    }
                    .font(.system(size: 12))
                    .foregroundColor(AppColors.accent)
                }
                .buttonStyle(PlainButtonStyle())
                .padding(.top, 8)
            }
            .padding(.vertical)
        }
        .background(AppColors.bgPrimary)
        .navigationTitle("Recent")
    }

    // MARK: - Actions

    private func logFood(_ food: SimpleFood) {
        HapticFeedback.success()
        let meal = MealType.forCurrentTime()
        connector.logFood(foodId: food.id, meal: meal)
        dismiss()
    }

    private func openPhoneApp() {
        // Send message to open phone app
        connector.requestSync()
    }
}

// MARK: - Food Row

struct FoodRow: View {
    let food: SimpleFood
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(food.displayName)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)

                    Text("\(food.calories) cal")
                        .font(.system(size: 12))
                        .foregroundColor(AppColors.textSecondary)
                }

                Spacer()

                Image(systemName: "plus.circle")
                    .font(.system(size: 18))
                    .foregroundColor(AppColors.accent)
            }
            .padding(.horizontal)
            .padding(.vertical, 10)
            .background(AppColors.bgSecondary)
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
        .padding(.horizontal)
    }
}

// MARK: - Preview

#Preview {
    RecentFoodsView()
        .environmentObject(PhoneConnector.shared)
}
