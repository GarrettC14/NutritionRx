/**
 * CalorieRingView
 * Circular progress indicator for daily calorie consumption
 */

import SwiftUI

struct CalorieRingView: View {
    let consumed: Int
    let target: Int
    let progress: Double

    // Ring configuration
    private let lineWidth: CGFloat = 12
    private let ringSize: CGFloat = 100

    var body: some View {
        ZStack {
            // Background ring
            Circle()
                .stroke(AppColors.bgSecondary, lineWidth: lineWidth)
                .frame(width: ringSize, height: ringSize)

            // Progress ring (sage green - never red!)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    AppColors.accent,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .frame(width: ringSize, height: ringSize)
                .rotationEffect(.degrees(-90))
                .animation(.easeOut(duration: 0.5), value: progress)

            // Center content
            VStack(spacing: 0) {
                Text("\(consumed.caloriesFormatted)")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(AppColors.textPrimary)

                Text("/\(target)")
                    .font(.system(size: 12, design: .rounded))
                    .foregroundColor(AppColors.textSecondary)
            }
        }
    }
}

// MARK: - Detailed Calorie Ring

struct DetailedCalorieRingView: View {
    let consumed: Int
    let target: Int
    let progress: Double

    private let lineWidth: CGFloat = 16
    private let ringSize: CGFloat = 140

    var body: some View {
        ZStack {
            // Background ring
            Circle()
                .stroke(AppColors.bgSecondary, lineWidth: lineWidth)
                .frame(width: ringSize, height: ringSize)

            // Progress ring
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    AppColors.accent,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .frame(width: ringSize, height: ringSize)
                .rotationEffect(.degrees(-90))
                .animation(.easeOut(duration: 0.6), value: progress)

            // Center content
            VStack(spacing: 2) {
                Text("\(consumed.caloriesFormatted)")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundColor(AppColors.textPrimary)

                Text("of \(target) cal")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundColor(AppColors.textSecondary)

                // Progress percentage
                Text("\(Int(progress * 100))%")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(AppColors.accent)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 20) {
        // Under target
        CalorieRingView(consumed: 1450, target: 2000, progress: 0.725)

        // At target
        CalorieRingView(consumed: 2000, target: 2000, progress: 1.0)

        // Over target (ring stays full)
        CalorieRingView(consumed: 2200, target: 2000, progress: 1.0)
    }
    .background(AppColors.bgPrimary)
}
