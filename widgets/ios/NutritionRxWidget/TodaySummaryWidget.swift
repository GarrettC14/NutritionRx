import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct TodaySummaryProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodaySummaryEntry {
        TodaySummaryEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodaySummaryEntry) -> Void) {
        let data = WidgetDataProvider.shared.getCurrentData()
        let entry = TodaySummaryEntry(date: Date(), data: data)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodaySummaryEntry>) -> Void) {
        let data = WidgetDataProvider.shared.getCurrentData()
        let entry = TodaySummaryEntry(date: Date(), data: data)

        // Update every 15 minutes
        let nextUpdate = Calendar.current.date(
            byAdding: .minute,
            value: WidgetConstants.updateIntervalMinutes,
            to: Date()
        )!

        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Entry

struct TodaySummaryEntry: TimelineEntry {
    let date: Date
    let data: WidgetDataContainer
}

// MARK: - Widget Views

struct TodaySummaryWidgetEntryView: View {
    var entry: TodaySummaryProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallTodaySummaryView(nutrition: entry.data.nutrition)
        case .systemMedium:
            MediumTodaySummaryView(nutrition: entry.data.nutrition, water: entry.data.water)
        case .systemLarge:
            LargeTodaySummaryView(nutrition: entry.data.nutrition, water: entry.data.water)
        default:
            SmallTodaySummaryView(nutrition: entry.data.nutrition)
        }
    }
}

// MARK: - Small Widget

struct SmallTodaySummaryView: View {
    let nutrition: NutritionData

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Today")
                .font(.headline)
                .foregroundColor(.secondary)

            VStack(alignment: .leading, spacing: 4) {
                Text("\(nutrition.caloriesConsumed)")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)

                Text("of \(nutrition.caloriesGoal) cal")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            ProgressBar(progress: nutrition.caloriesProgress, color: .blue)
                .frame(height: 8)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Medium Widget

struct MediumTodaySummaryView: View {
    let nutrition: NutritionData
    let water: WaterData

    var body: some View {
        HStack(spacing: 16) {
            // Calories
            VStack(alignment: .leading, spacing: 8) {
                Text("Calories")
                    .font(.headline)
                    .foregroundColor(.secondary)

                VStack(alignment: .leading, spacing: 4) {
                    Text("\(nutrition.caloriesConsumed)")
                        .font(.system(size: 28, weight: .bold, design: .rounded))

                    Text("\(nutrition.caloriesRemaining) remaining")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                ProgressBar(progress: nutrition.caloriesProgress, color: .blue)
                    .frame(height: 6)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Divider()

            // Macros
            VStack(alignment: .leading, spacing: 8) {
                Text("Macros")
                    .font(.headline)
                    .foregroundColor(.secondary)

                MacroRow(
                    label: "Protein",
                    current: Int(nutrition.proteinConsumed),
                    goal: Int(nutrition.proteinGoal),
                    color: .red
                )

                MacroRow(
                    label: "Carbs",
                    current: Int(nutrition.carbsConsumed),
                    goal: Int(nutrition.carbsGoal),
                    color: .green
                )

                MacroRow(
                    label: "Fat",
                    current: Int(nutrition.fatConsumed),
                    goal: Int(nutrition.fatGoal),
                    color: .yellow
                )
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Large Widget

struct LargeTodaySummaryView: View {
    let nutrition: NutritionData
    let water: WaterData

    var body: some View {
        VStack(spacing: 16) {
            // Calories Section
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Today's Calories")
                        .font(.headline)
                        .foregroundColor(.secondary)

                    Spacer()

                    Text("\(Int(nutrition.caloriesProgress * 100))%")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }

                HStack(alignment: .bottom, spacing: 4) {
                    Text("\(nutrition.caloriesConsumed)")
                        .font(.system(size: 36, weight: .bold, design: .rounded))

                    Text("/ \(nutrition.caloriesGoal)")
                        .font(.title3)
                        .foregroundColor(.secondary)
                }

                ProgressBar(progress: nutrition.caloriesProgress, color: .blue)
                    .frame(height: 10)
            }

            Divider()

            // Macros Section
            HStack(spacing: 20) {
                MacroCircle(
                    label: "Protein",
                    current: Int(nutrition.proteinConsumed),
                    goal: Int(nutrition.proteinGoal),
                    color: .red
                )

                MacroCircle(
                    label: "Carbs",
                    current: Int(nutrition.carbsConsumed),
                    goal: Int(nutrition.carbsGoal),
                    color: .green
                )

                MacroCircle(
                    label: "Fat",
                    current: Int(nutrition.fatConsumed),
                    goal: Int(nutrition.fatGoal),
                    color: .yellow
                )
            }

            Divider()

            // Water Section
            HStack {
                Image(systemName: "drop.fill")
                    .foregroundColor(.cyan)
                    .font(.title2)

                VStack(alignment: .leading) {
                    Text("Water")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text("\(water.glassesConsumed) / \(water.glassesGoal) glasses")
                        .font(.headline)
                }

                Spacer()

                Text("\(Int(water.progress * 100))%")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.cyan)
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Helper Views

struct ProgressBar: View {
    let progress: Double
    let color: Color

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.3))

                RoundedRectangle(cornerRadius: 4)
                    .fill(color)
                    .frame(width: geometry.size.width * min(progress, 1.0))
            }
        }
    }
}

struct MacroRow: View {
    let label: String
    let current: Int
    let goal: Int
    let color: Color

    var progress: Double {
        guard goal > 0 else { return 0 }
        return min(1.0, Double(current) / Double(goal))
    }

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)

            Text("\(current)g")
                .font(.caption)
                .fontWeight(.medium)
                .frame(width: 40, alignment: .leading)

            ProgressBar(progress: progress, color: color)
                .frame(height: 4)
        }
    }
}

struct MacroCircle: View {
    let label: String
    let current: Int
    let goal: Int
    let color: Color

    var progress: Double {
        guard goal > 0 else { return 0 }
        return min(1.0, Double(current) / Double(goal))
    }

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.3), lineWidth: 6)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .rotationEffect(.degrees(-90))

                Text("\(current)g")
                    .font(.caption2)
                    .fontWeight(.bold)
            }
            .frame(width: 50, height: 50)

            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Widget Configuration

struct TodaySummaryWidget: Widget {
    let kind: String = "TodaySummaryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodaySummaryProvider()) { entry in
            TodaySummaryWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Today's Summary")
        .description("Track your daily calorie and macro intake at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Preview

#Preview(as: .systemSmall) {
    TodaySummaryWidget()
} timeline: {
    TodaySummaryEntry(date: Date(), data: .placeholder)
}

#Preview(as: .systemMedium) {
    TodaySummaryWidget()
} timeline: {
    TodaySummaryEntry(date: Date(), data: .placeholder)
}

#Preview(as: .systemLarge) {
    TodaySummaryWidget()
} timeline: {
    TodaySummaryEntry(date: Date(), data: .placeholder)
}
