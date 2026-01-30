/**
 * ComplicationViews
 * SwiftUI views for Watch complications
 */

import SwiftUI
import WidgetKit

// MARK: - Circular Complication

/// Circular complication showing calorie progress ring
struct CircularComplicationView: View {
    let caloriesConsumed: Int
    let calorieTarget: Int

    private var progress: Double {
        guard calorieTarget > 0 else { return 0 }
        return min(Double(caloriesConsumed) / Double(calorieTarget), 1.0)
    }

    private var isOverTarget: Bool {
        caloriesConsumed > calorieTarget
    }

    var body: some View {
        ZStack {
            // Background ring
            Circle()
                .stroke(
                    AppColors.bgSecondary.opacity(0.3),
                    lineWidth: 4
                )

            // Progress ring
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    isOverTarget ? AppColors.warmNeutral : AppColors.accent,
                    style: StrokeStyle(lineWidth: 4, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            // Center text
            VStack(spacing: 0) {
                Text("\(caloriesConsumed)")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundColor(AppColors.textPrimary)
                    .minimumScaleFactor(0.5)
            }
        }
        .padding(2)
    }
}

// MARK: - Rectangular Complication

/// Rectangular complication showing calories and water
struct RectangularComplicationView: View {
    let caloriesConsumed: Int
    let calorieTarget: Int
    let waterGlasses: Int
    let waterTarget: Int
    var isFasting: Bool = false
    var fastingRemainingSeconds: Double = 0

    private var calorieProgress: Double {
        guard calorieTarget > 0 else { return 0 }
        return min(Double(caloriesConsumed) / Double(calorieTarget), 1.0)
    }

    private var waterProgress: Double {
        guard waterTarget > 0 else { return 0 }
        return min(Double(waterGlasses) / Double(waterTarget), 1.0)
    }

    private var remainingCalories: Int {
        max(0, calorieTarget - caloriesConsumed)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Calorie row
            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 10))
                    .foregroundColor(AppColors.accent)

                Text("\(caloriesConsumed)")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundColor(AppColors.textPrimary)

                Text("/ \(calorieTarget)")
                    .font(.system(size: 10, design: .rounded))
                    .foregroundColor(AppColors.textSecondary)

                Spacer()
            }

            // Calorie progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(AppColors.bgSecondary.opacity(0.3))
                        .frame(height: 4)
                        .cornerRadius(2)

                    Rectangle()
                        .fill(AppColors.accent)
                        .frame(width: geo.size.width * calorieProgress, height: 4)
                        .cornerRadius(2)
                }
            }
            .frame(height: 4)

            // Water row
            HStack(spacing: 4) {
                Image(systemName: "drop.fill")
                    .font(.system(size: 10))
                    .foregroundColor(AppColors.water)

                Text("\(waterGlasses)")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundColor(AppColors.textPrimary)

                Text("/ \(waterTarget)")
                    .font(.system(size: 10, design: .rounded))
                    .foregroundColor(AppColors.textSecondary)

                Spacer()
            }

            // Fasting row (only during active fast)
            if isFasting, fastingRemainingSeconds > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "moon.fill")
                        .font(.system(size: 10))
                        .foregroundColor(AppColors.fasting)

                    let hours = Int(fastingRemainingSeconds) / 3600
                    let minutes = (Int(fastingRemainingSeconds) % 3600) / 60
                    Text("\(hours)h \(minutes)m")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundColor(AppColors.textPrimary)

                    Text("left")
                        .font(.system(size: 10, design: .rounded))
                        .foregroundColor(AppColors.textSecondary)

                    Spacer()
                }
            }
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
    }
}

// MARK: - Corner Complication

/// Corner gauge complication for calorie progress
struct CornerComplicationView: View {
    let caloriesConsumed: Int
    let calorieTarget: Int

    private var progress: Double {
        guard calorieTarget > 0 else { return 0 }
        return min(Double(caloriesConsumed) / Double(calorieTarget), 1.0)
    }

    var body: some View {
        ZStack {
            // This will be displayed as a gauge in corner complications
            Text("\(caloriesConsumed)")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundColor(AppColors.textPrimary)
        }
    }
}

// MARK: - Inline Complication

/// Inline text complication
struct InlineComplicationView: View {
    let caloriesConsumed: Int
    let calorieTarget: Int
    let waterGlasses: Int

    private var remainingCalories: Int {
        max(0, calorieTarget - caloriesConsumed)
    }

    var body: some View {
        if remainingCalories > 0 {
            Text("\(remainingCalories) cal left • \(waterGlasses)💧")
                .font(.system(size: 12, design: .rounded))
        } else {
            Text("Goal met! • \(waterGlasses)💧")
                .font(.system(size: 12, design: .rounded))
        }
    }
}

// MARK: - Previews

#Preview("Circular") {
    CircularComplicationView(
        caloriesConsumed: 1450,
        calorieTarget: 2000
    )
    .frame(width: 50, height: 50)
}

#Preview("Rectangular") {
    RectangularComplicationView(
        caloriesConsumed: 1450,
        calorieTarget: 2000,
        waterGlasses: 5,
        waterTarget: 8
    )
    .frame(width: 150, height: 50)
}
