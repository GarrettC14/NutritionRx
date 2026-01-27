import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct QuickAddProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickAddEntry {
        QuickAddEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (QuickAddEntry) -> Void) {
        let data = WidgetDataProvider.shared.getCurrentData()
        let entry = QuickAddEntry(date: Date(), data: data)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickAddEntry>) -> Void) {
        let data = WidgetDataProvider.shared.getCurrentData()
        let entry = QuickAddEntry(date: Date(), data: data)

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

struct QuickAddEntry: TimelineEntry {
    let date: Date
    let data: WidgetDataContainer
}

// MARK: - Meal Types

enum MealType: String, CaseIterable {
    case breakfast = "Breakfast"
    case lunch = "Lunch"
    case dinner = "Dinner"
    case snack = "Snack"

    var icon: String {
        switch self {
        case .breakfast: return "sunrise.fill"
        case .lunch: return "sun.max.fill"
        case .dinner: return "moon.fill"
        case .snack: return "leaf.fill"
        }
    }

    var color: Color {
        switch self {
        case .breakfast: return .orange
        case .lunch: return .yellow
        case .dinner: return .purple
        case .snack: return .green
        }
    }

    var deepLink: URL {
        URL(string: "nutritionrx://add-food?meal=\(rawValue.lowercased())")!
    }
}

// MARK: - Widget Views

struct QuickAddWidgetEntryView: View {
    var entry: QuickAddProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallQuickAddView(nutrition: entry.data.nutrition)
        case .systemMedium:
            MediumQuickAddView(nutrition: entry.data.nutrition)
        default:
            SmallQuickAddView(nutrition: entry.data.nutrition)
        }
    }
}

// MARK: - Small Widget

struct SmallQuickAddView: View {
    let nutrition: NutritionData

    var body: some View {
        VStack(spacing: 12) {
            // Status
            VStack(spacing: 4) {
                Text("\(nutrition.caloriesRemaining)")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)

                Text("cal remaining")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Divider()

            // Quick add button
            Link(destination: URL(string: "nutritionrx://add-food")!) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)

                    Text("Add Food")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
                .foregroundColor(.blue)
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Medium Widget

struct MediumQuickAddView: View {
    let nutrition: NutritionData

    var body: some View {
        HStack(spacing: 16) {
            // Left: Status
            VStack(alignment: .leading, spacing: 8) {
                Text("Today")
                    .font(.headline)
                    .foregroundColor(.secondary)

                VStack(alignment: .leading, spacing: 4) {
                    Text("\(nutrition.caloriesConsumed)")
                        .font(.system(size: 28, weight: .bold, design: .rounded))

                    Text("\(nutrition.caloriesRemaining) cal remaining")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                ProgressBar(progress: nutrition.caloriesProgress, color: .blue)
                    .frame(height: 6)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Divider()

            // Right: Quick add buttons
            VStack(spacing: 8) {
                Text("Quick Add")
                    .font(.headline)
                    .foregroundColor(.secondary)

                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 8) {
                    ForEach(MealType.allCases, id: \.self) { meal in
                        Link(destination: meal.deepLink) {
                            VStack(spacing: 4) {
                                Image(systemName: meal.icon)
                                    .font(.title3)
                                    .foregroundColor(meal.color)

                                Text(meal.rawValue)
                                    .font(.caption2)
                                    .foregroundColor(.primary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(meal.color.opacity(0.15))
                            .cornerRadius(8)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Widget Configuration

struct QuickAddWidget: Widget {
    let kind: String = "QuickAddWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickAddProvider()) { entry in
            QuickAddWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Quick Add")
        .description("Quickly log food to any meal with one tap.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Preview

#Preview(as: .systemSmall) {
    QuickAddWidget()
} timeline: {
    QuickAddEntry(date: Date(), data: .placeholder)
}

#Preview(as: .systemMedium) {
    QuickAddWidget()
} timeline: {
    QuickAddEntry(date: Date(), data: .placeholder)
}
