/**
 * WaterView
 * Water tracking display and controls
 */

import SwiftUI

// MARK: - Water Row (for home screen)

struct WaterRow: View {
    let glasses: Int
    let target: Int
    let onAdd: () -> Void
    let onTap: () -> Void

    var body: some View {
        HStack {
            // Water count button
            Button(action: onTap) {
                HStack(spacing: 4) {
                    Text("\u{1F4A7}")  // Water droplet emoji
                    Text("\(glasses)/\(target)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppColors.textPrimary)
                }
            }
            .buttonStyle(PlainButtonStyle())

            Spacer()

            // Quick add water button
            Button(action: onAdd) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(AppColors.water)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(.horizontal)
    }
}

// MARK: - Water Detail View

struct WaterDetailView: View {
    @EnvironmentObject var connector: PhoneConnector
    @Environment(\.dismiss) var dismiss

    private var glasses: Int {
        connector.dailyData?.waterGlasses ?? 0
    }

    private var target: Int {
        connector.dailyData?.waterTarget ?? 8
    }

    private var hasMetGoal: Bool {
        glasses >= target
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Text("Water")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(AppColors.textPrimary)

                // Water glasses display
                waterGlassesGrid

                // Count display
                VStack(spacing: 4) {
                    Text("\(glasses) / \(target)")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(AppColors.textPrimary)

                    if hasMetGoal {
                        Text("Great job! \u{1F4A7}")
                            .font(.system(size: 14))
                            .foregroundColor(AppColors.success)
                    } else {
                        Text("\(target - glasses) more to go")
                            .font(.system(size: 14))
                            .foregroundColor(AppColors.textSecondary)
                    }
                }

                // Controls
                HStack(spacing: 16) {
                    // Remove button
                    Button(action: removeGlass) {
                        Image(systemName: "minus.circle")
                            .font(.system(size: 28))
                            .foregroundColor(glasses > 0 ? AppColors.water : AppColors.textTertiary)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .disabled(glasses <= 0)

                    // Add button (primary)
                    Button(action: addGlass) {
                        Text("Add")
                            .watchButton()
                    }
                    .buttonStyle(PlainButtonStyle())
                    .frame(maxWidth: 100)

                    // Increment button
                    Button(action: addGlass) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(AppColors.water)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding()
        }
        .background(AppColors.bgPrimary)
    }

    // MARK: - Water Glasses Grid

    @ViewBuilder
    private var waterGlassesGrid: some View {
        let rows = (target + 4) / 5  // 5 glasses per row
        VStack(spacing: 4) {
            ForEach(0..<rows, id: \.self) { row in
                HStack(spacing: 4) {
                    ForEach(0..<5) { col in
                        let index = row * 5 + col
                        if index < target {
                            waterGlassIcon(filled: index < glasses)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func waterGlassIcon(filled: Bool) -> some View {
        Text("\u{1F4A7}")
            .font(.system(size: 20))
            .opacity(filled ? 1.0 : 0.3)
    }

    // MARK: - Actions

    private func addGlass() {
        HapticFeedback.click()
        connector.addWater()

        // Check if goal just reached
        if glasses + 1 >= target && !hasMetGoal {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                HapticFeedback.success()
            }
        }
    }

    private func removeGlass() {
        guard glasses > 0 else { return }
        HapticFeedback.directionDown()
        connector.removeWater()
    }
}

// MARK: - Preview

#Preview {
    WaterDetailView()
        .environmentObject(PhoneConnector.shared)
}
