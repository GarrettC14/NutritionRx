/**
 * QuickAddView
 * Quick calorie logging with preset amounts
 */

import SwiftUI

struct QuickAddView: View {
    @EnvironmentObject var connector: PhoneConnector
    @Environment(\.dismiss) var dismiss
    @State private var selectedMeal: MealType = MealType.forCurrentTime()
    @State private var showCustomInput = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("Quick Add")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(AppColors.textPrimary)

                // Preset buttons
                ForEach(QuickAddPreset.presets) { preset in
                    Button(action: { quickAdd(preset.calories) }) {
                        VStack(spacing: 2) {
                            Text(preset.label)
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(AppColors.textPrimary)

                            Text(preset.description)
                                .font(.system(size: 11))
                                .foregroundColor(AppColors.textSecondary)
                        }
                        .watchSecondaryButton()
                    }
                    .buttonStyle(PlainButtonStyle())
                }

                // Meal selector
                HStack {
                    Text("Meal:")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.textSecondary)

                    Picker("", selection: $selectedMeal) {
                        ForEach(MealType.allCases, id: \.self) { meal in
                            Text(meal.rawValue).tag(meal)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(height: 60)
                }

                // Custom button
                Button(action: { showCustomInput = true }) {
                    Text("Custom...")
                        .font(.system(size: 14))
                        .foregroundColor(AppColors.accent)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding()
        }
        .background(AppColors.bgPrimary)
        .sheet(isPresented: $showCustomInput) {
            CustomCalorieInputView(meal: selectedMeal)
        }
    }

    // MARK: - Actions

    private func quickAdd(_ calories: Int) {
        HapticFeedback.success()
        connector.quickAddCalories(calories, meal: selectedMeal)
        dismiss()
    }
}

// MARK: - Preview

#Preview {
    QuickAddView()
        .environmentObject(PhoneConnector.shared)
}
