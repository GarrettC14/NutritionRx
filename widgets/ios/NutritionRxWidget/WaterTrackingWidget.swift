import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Timeline Provider

struct WaterTrackingProvider: TimelineProvider {
    func placeholder(in context: Context) -> WaterTrackingEntry {
        WaterTrackingEntry(date: Date(), data: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (WaterTrackingEntry) -> Void) {
        let data = WidgetDataProvider.shared.getCurrentData()
        let entry = WaterTrackingEntry(date: Date(), data: data.water)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WaterTrackingEntry>) -> Void) {
        let data = WidgetDataProvider.shared.getCurrentData()
        let entry = WaterTrackingEntry(date: Date(), data: data.water)

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

struct WaterTrackingEntry: TimelineEntry {
    let date: Date
    let data: WaterData
}

// MARK: - Widget Views

struct WaterTrackingWidgetEntryView: View {
    var entry: WaterTrackingProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWaterView(water: entry.data)
        case .systemMedium:
            MediumWaterView(water: entry.data)
        case .accessoryCircular:
            CircularWaterView(water: entry.data)
        case .accessoryRectangular:
            RectangularWaterView(water: entry.data)
        default:
            SmallWaterView(water: entry.data)
        }
    }
}

// MARK: - Small Widget

struct SmallWaterView: View {
    let water: WaterData

    var body: some View {
        VStack(spacing: 8) {
            // Water drop icon
            Image(systemName: "drop.fill")
                .font(.system(size: 24))
                .foregroundColor(.cyan)

            // Progress ring
            ZStack {
                Circle()
                    .stroke(Color.cyan.opacity(0.2), lineWidth: 8)

                Circle()
                    .trim(from: 0, to: water.progress)
                    .stroke(
                        Color.cyan,
                        style: StrokeStyle(lineWidth: 8, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))

                VStack(spacing: 2) {
                    Text("\(water.glassesConsumed)")
                        .font(.system(size: 24, weight: .bold, design: .rounded))

                    Text("of \(water.glassesGoal)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .frame(width: 80, height: 80)

            Text("glasses")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Medium Widget

struct MediumWaterView: View {
    let water: WaterData

    var body: some View {
        HStack(spacing: 20) {
            // Left: Progress ring
            ZStack {
                Circle()
                    .stroke(Color.cyan.opacity(0.2), lineWidth: 10)

                Circle()
                    .trim(from: 0, to: water.progress)
                    .stroke(
                        Color.cyan,
                        style: StrokeStyle(lineWidth: 10, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))

                VStack(spacing: 2) {
                    Text("\(water.glassesConsumed)")
                        .font(.system(size: 32, weight: .bold, design: .rounded))

                    Text("of \(water.glassesGoal)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .frame(width: 100, height: 100)

            // Right: Info
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "drop.fill")
                        .foregroundColor(.cyan)

                    Text("Water Intake")
                        .font(.headline)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("\(water.consumedMl) mL")
                        .font(.title2)
                        .fontWeight(.semibold)

                    Text("Goal: \(water.goalMl) mL")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Glass indicators
                HStack(spacing: 4) {
                    ForEach(0..<min(water.glassesGoal, 10), id: \.self) { index in
                        Image(systemName: index < water.glassesConsumed ? "drop.fill" : "drop")
                            .font(.caption)
                            .foregroundColor(index < water.glassesConsumed ? .cyan : .gray)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Lock Screen Widgets

struct CircularWaterView: View {
    let water: WaterData

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()

            Gauge(value: water.progress) {
                Image(systemName: "drop.fill")
            } currentValueLabel: {
                Text("\(water.glassesConsumed)")
                    .font(.system(.body, design: .rounded))
                    .fontWeight(.bold)
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .tint(.cyan)
        }
    }
}

struct RectangularWaterView: View {
    let water: WaterData

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "drop.fill")
                .font(.title2)

            VStack(alignment: .leading, spacing: 2) {
                Text("Water")
                    .font(.headline)

                Text("\(water.glassesConsumed)/\(water.glassesGoal) glasses")
                    .font(.caption)
                    .foregroundColor(.secondary)

                ProgressView(value: water.progress)
                    .tint(.cyan)
            }
        }
    }
}

// MARK: - Widget Configuration

struct WaterTrackingWidget: Widget {
    let kind: String = "WaterTrackingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WaterTrackingProvider()) { entry in
            WaterTrackingWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Water Tracking")
        .description("Track your daily water intake and stay hydrated.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryCircular,
            .accessoryRectangular
        ])
    }
}

// MARK: - Preview

#Preview(as: .systemSmall) {
    WaterTrackingWidget()
} timeline: {
    WaterTrackingEntry(date: Date(), data: .placeholder)
}

#Preview(as: .systemMedium) {
    WaterTrackingWidget()
} timeline: {
    WaterTrackingEntry(date: Date(), data: .placeholder)
}

#Preview(as: .accessoryCircular) {
    WaterTrackingWidget()
} timeline: {
    WaterTrackingEntry(date: Date(), data: .placeholder)
}
