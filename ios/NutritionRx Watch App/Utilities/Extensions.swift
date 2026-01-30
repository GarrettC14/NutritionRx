/**
 * Swift Extensions
 * Utility extensions for the Watch app
 */

import SwiftUI
import WatchKit

// MARK: - Color Extensions

extension Color {
    /// Initialize Color from hex string
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Theme Colors

/// App color palette - "Nourished Calm" theme
enum AppColors {
    // Background colors
    static let bgPrimary = Color(hex: "2A2A2A")      // Deep Charcoal
    static let bgSecondary = Color(hex: "3A3A3A")   // Lighter charcoal
    static let bgTertiary = Color(hex: "4A4A4A")    // Even lighter

    // Accent colors
    static let accent = Color(hex: "7FB685")         // Sage Green
    static let accentSecondary = Color(hex: "D4A574") // Soft Terracotta

    // Semantic colors
    static let success = Color(hex: "8BC49E")        // Soft Green
    static let water = Color(hex: "7BA7BC")          // Soft Blue

    // Text colors
    static let textPrimary = Color(hex: "F5F5F5")    // Soft White
    static let textSecondary = Color(hex: "A0A0A0")  // Warm Gray
    static let textTertiary = Color(hex: "707070")   // Darker Gray

    // Macro colors
    static let protein = Color(hex: "D4A574")        // Terracotta
    static let carbs = Color(hex: "7FB685")          // Sage Green
    static let fat = Color(hex: "7BA7BC")            // Soft Blue

    // Neutral
    static let warmNeutral = Color(hex: "C4A882")    // Warm Neutral

    // Fasting aliases
    static let fasting = accent                       // Sage Green
    static let eatingWindow = accentSecondary         // Terracotta
}

// MARK: - Haptic Feedback

enum HapticFeedback {
    /// Light tap for button presses
    static func click() {
        WKInterfaceDevice.current().play(.click)
    }

    /// Success feedback for completed actions
    static func success() {
        WKInterfaceDevice.current().play(.success)
    }

    /// Direction up (for increment)
    static func directionUp() {
        WKInterfaceDevice.current().play(.directionUp)
    }

    /// Direction down (for decrement)
    static func directionDown() {
        WKInterfaceDevice.current().play(.directionDown)
    }

    /// Start feedback for beginning an action
    static func start() {
        WKInterfaceDevice.current().play(.start)
    }

    /// Stop feedback for completing a series
    static func stop() {
        WKInterfaceDevice.current().play(.stop)
    }

    /// NOTE: We NEVER use failure haptics for going over calorie goals
    /// This app is non-judgmental!
}

// MARK: - Number Formatting

extension Int {
    /// Format as calories display
    var caloriesFormatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: self)) ?? "\(self)"
    }
}

// MARK: - Date Extensions

extension Date {
    /// Check if date is today
    var isToday: Bool {
        Calendar.current.isDateInToday(self)
    }

    /// Format as time string
    var timeString: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }
}

// MARK: - View Extensions

extension View {
    /// Apply watch card style
    func watchCard() -> some View {
        self
            .padding()
            .background(AppColors.bgSecondary)
            .cornerRadius(12)
    }

    /// Apply watch button style
    func watchButton() -> some View {
        self
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(AppColors.bgPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(AppColors.accent)
            .cornerRadius(10)
    }

    /// Apply secondary watch button style
    func watchSecondaryButton() -> some View {
        self
            .font(.system(size: 16, weight: .medium))
            .foregroundColor(AppColors.textPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(AppColors.bgSecondary)
            .cornerRadius(10)
    }
}
