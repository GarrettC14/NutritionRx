/**
 * CustomCalorieInputView
 * Custom calorie input with Digital Crown support
 */

import SwiftUI

struct CustomCalorieInputView: View {
    @EnvironmentObject var connector: PhoneConnector
    @Environment(\.dismiss) var dismiss

    let meal: MealType

    @State private var calories: Int = 250
    @FocusState private var isFocused: Bool

    // Configuration
    private let minCalories = 10
    private let maxCalories = 2000
    private let step = 10

    // Quick presets for custom view
    private let quickValues = [100, 250, 500]

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("Custom Calories")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(AppColors.textPrimary)

                // Main calorie display with crown input
                VStack(spacing: 4) {
                    Text("\(calories)")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundColor(AppColors.textPrimary)
                        .focusable(true)
                        .focused($isFocused)
                        .digitalCrownRotation(
                            $calories,
                            from: minCalories,
                            through: maxCalories,
                            by: step,
                            sensitivity: .medium,
                            isContinuous: false,
                            isHapticFeedbackEnabled: true
                        )

                    Text("calories")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.textSecondary)
                }
                .padding(.vertical, 8)

                // Quick preset buttons
                HStack(spacing: 8) {
                    ForEach(quickValues, id: \.self) { value in
                        Button(action: { setCalories(value) }) {
                            Text("\(value)")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(calories == value ? AppColors.bgPrimary : AppColors.textPrimary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(calories == value ? AppColors.accent : AppColors.bgSecondary)
                                .cornerRadius(8)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }

                // Meal indicator
                HStack {
                    Image(systemName: meal.icon)
                        .foregroundColor(AppColors.textSecondary)
                    Text(meal.rawValue)
                        .foregroundColor(AppColors.textSecondary)
                }
                .font(.system(size: 14))

                // Add button
                Button(action: addCalories) {
                    HStack {
                        Image(systemName: "plus")
                        Text("Add")
                    }
                    .watchButton()
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding()
        }
        .background(AppColors.bgPrimary)
        .onAppear {
            isFocused = true
        }
    }

    // MARK: - Actions

    private func setCalories(_ value: Int) {
        HapticFeedback.click()
        calories = value
    }

    private func addCalories() {
        HapticFeedback.success()
        connector.quickAddCalories(calories, meal: meal)
        dismiss()
    }
}

// MARK: - Preview

#Preview {
    CustomCalorieInputView(meal: .lunch)
        .environmentObject(PhoneConnector.shared)
}
