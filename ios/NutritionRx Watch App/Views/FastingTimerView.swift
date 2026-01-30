/**
 * FastingTimerView
 * Read-only fasting timer display for Apple Watch
 */

import SwiftUI

struct FastingTimerView: View {
    @EnvironmentObject var connector: PhoneConnector

    @State private var now = Date()

    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var fastingState: FastingState? {
        connector.dailyData?.fasting
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if let state = fastingState, state.isEnabled {
                    if state.isFasting {
                        fastingActiveView(state)
                    } else {
                        eatingWindowView(state)
                    }
                } else {
                    notConfiguredView
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 16)
        }
        .background(AppColors.bgPrimary)
        .navigationTitle("Fasting")
        .onReceive(timer) { time in
            now = time
        }
    }

    // MARK: - Fasting Active

    @ViewBuilder
    private func fastingActiveView(_ state: FastingState) -> some View {
        // Moon icon
        Image(systemName: "moon.fill")
            .font(.system(size: 28))
            .foregroundColor(AppColors.fasting)
            .padding(.top, 8)

        // Countdown
        if let start = state.fastStartTime, let target = state.targetHours {
            let elapsed = now.timeIntervalSince(start)
            let totalSeconds = Double(target) * 3600
            let remaining = max(0, totalSeconds - elapsed)
            let progress = min(elapsed / totalSeconds, 1.0)

            Text(formatCountdown(remaining))
                .font(.system(size: 36, weight: .bold, design: .rounded).monospacedDigit())
                .foregroundColor(AppColors.textPrimary)

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(AppColors.bgTertiary)
                        .frame(height: 6)
                        .cornerRadius(3)

                    Rectangle()
                        .fill(AppColors.fasting)
                        .frame(width: geo.size.width * progress, height: 6)
                        .cornerRadius(3)
                }
            }
            .frame(height: 6)

            // Phase indicator
            Text(fastingPhase(elapsed: elapsed))
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(AppColors.fasting)

            // Start time
            HStack(spacing: 4) {
                Image(systemName: "clock")
                    .font(.system(size: 11))
                Text("Started \(start.timeString)")
                    .font(.system(size: 12))
            }
            .foregroundColor(AppColors.textSecondary)
        }

        // Protocol badge
        if let proto = state.fastingProtocol {
            Text(proto.name)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(AppColors.textSecondary)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(AppColors.bgTertiary)
                .cornerRadius(8)
        }

        // Streak
        if state.currentStreak > 0 {
            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 11))
                    .foregroundColor(AppColors.accentSecondary)
                Text("\(state.currentStreak) day streak")
                    .font(.system(size: 12))
                    .foregroundColor(AppColors.textSecondary)
            }
        }
    }

    // MARK: - Eating Window

    @ViewBuilder
    private func eatingWindowView(_ state: FastingState) -> some View {
        Image(systemName: "fork.knife")
            .font(.system(size: 28))
            .foregroundColor(AppColors.eatingWindow)
            .padding(.top, 8)

        Text("Eating Window")
            .font(.system(size: 18, weight: .semibold))
            .foregroundColor(AppColors.textPrimary)

        // Time remaining until fast begins
        if let endStr = state.eatingWindowEnd {
            let remaining = timeUntil(timeString: endStr)
            if remaining > 0 {
                Text("\(formatCountdown(remaining)) until fast")
                    .font(.system(size: 15, weight: .medium).monospacedDigit())
                    .foregroundColor(AppColors.textPrimary)
            }
        }

        // Window times
        if let start = state.eatingWindowStart, let end = state.eatingWindowEnd {
            HStack(spacing: 4) {
                Text(format12h(start))
                Text("–")
                Text(format12h(end))
            }
            .font(.system(size: 13))
            .foregroundColor(AppColors.textSecondary)
        }

        // Protocol badge
        if let proto = state.fastingProtocol {
            Text(proto.name)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(AppColors.textSecondary)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(AppColors.bgTertiary)
                .cornerRadius(8)
        }
    }

    // MARK: - Not Configured

    private var notConfiguredView: some View {
        VStack(spacing: 12) {
            Image(systemName: "clock")
                .font(.system(size: 32))
                .foregroundColor(AppColors.textTertiary)
                .padding(.top, 16)

            Text("Fasting Timer")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(AppColors.textPrimary)

            Text("Set up fasting in the\niPhone app to get started")
                .font(.system(size: 13))
                .foregroundColor(AppColors.textSecondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Helpers

    private func formatCountdown(_ seconds: Double) -> String {
        let totalSeconds = Int(seconds)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        return String(format: "%d:%02d", hours, minutes)
    }

    private func fastingPhase(elapsed: TimeInterval) -> String {
        let hours = elapsed / 3600
        if hours < 4 {
            return "Fed state"
        } else if hours < 12 {
            return "Fat burning"
        } else if hours < 18 {
            return "Ketosis beginning"
        } else {
            return "Deep ketosis"
        }
    }

    private func timeUntil(timeString: String) -> Double {
        let parts = timeString.split(separator: ":")
        guard parts.count == 2,
              let hour = Int(parts[0]),
              let minute = Int(parts[1]) else { return 0 }

        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day], from: now)
        components.hour = hour
        components.minute = minute
        components.second = 0

        guard let target = calendar.date(from: components) else { return 0 }

        var diff = target.timeIntervalSince(now)
        if diff < 0 { diff += 86400 }
        return diff
    }

    private func format12h(_ timeString: String) -> String {
        let parts = timeString.split(separator: ":")
        guard parts.count == 2,
              let hour = Int(parts[0]),
              let minute = Int(parts[1]) else { return timeString }

        let period = hour >= 12 ? "PM" : "AM"
        let displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour)
        return String(format: "%d:%02d %@", displayHour, minute, period)
    }
}

// MARK: - Preview

#Preview {
    FastingTimerView()
        .environmentObject(PhoneConnector.shared)
}
