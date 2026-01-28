/**
 * MacroSummaryView
 * Displays protein, carbs, and fat summary
 */

import SwiftUI

struct MacroSummaryView: View {
    let protein: Int
    let carbs: Int
    let fat: Int

    var body: some View {
        HStack(spacing: 16) {
            MacroLabel(label: "P", value: protein, color: AppColors.protein)
            MacroLabel(label: "C", value: carbs, color: AppColors.carbs)
            MacroLabel(label: "F", value: fat, color: AppColors.fat)
        }
    }
}

// MARK: - Macro Label

struct MacroLabel: View {
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(color)

            Text("\(value)g")
                .font(.system(size: 14, design: .rounded))
                .foregroundColor(AppColors.textPrimary)
        }
    }
}

// MARK: - Detailed Macro View

struct DetailedMacroView: View {
    let protein: Int
    let carbs: Int
    let fat: Int
    let proteinTarget: Int?
    let carbsTarget: Int?
    let fatTarget: Int?

    var body: some View {
        VStack(spacing: 12) {
            Text("Macros")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(AppColors.textPrimary)

            VStack(spacing: 8) {
                MacroRow(
                    label: "Protein",
                    value: protein,
                    target: proteinTarget,
                    color: AppColors.protein
                )

                MacroRow(
                    label: "Carbs",
                    value: carbs,
                    target: carbsTarget,
                    color: AppColors.carbs
                )

                MacroRow(
                    label: "Fat",
                    value: fat,
                    target: fatTarget,
                    color: AppColors.fat
                )
            }
        }
        .padding()
        .background(AppColors.bgSecondary)
        .cornerRadius(12)
    }
}

// MARK: - Macro Row

struct MacroRow: View {
    let label: String
    let value: Int
    let target: Int?
    let color: Color

    private var progress: Double {
        guard let target = target, target > 0 else { return 0 }
        return min(Double(value) / Double(target), 1.0)
    }

    var body: some View {
        VStack(spacing: 4) {
            HStack {
                Text(label)
                    .font(.system(size: 12))
                    .foregroundColor(AppColors.textSecondary)

                Spacer()

                if let target = target {
                    Text("\(value)/\(target)g")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(AppColors.textPrimary)
                } else {
                    Text("\(value)g")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(AppColors.textPrimary)
                }
            }

            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(AppColors.bgTertiary)
                        .frame(height: 4)
                        .cornerRadius(2)

                    Rectangle()
                        .fill(color)
                        .frame(width: geometry.size.width * progress, height: 4)
                        .cornerRadius(2)
                        .animation(.easeOut(duration: 0.3), value: progress)
                }
            }
            .frame(height: 4)
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 20) {
        MacroSummaryView(protein: 85, carbs: 142, fat: 52)

        DetailedMacroView(
            protein: 85,
            carbs: 142,
            fat: 52,
            proteinTarget: 120,
            carbsTarget: 200,
            fatTarget: 65
        )
    }
    .padding()
    .background(AppColors.bgPrimary)
}
