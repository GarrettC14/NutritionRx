import Foundation

struct WidgetData {
    static let appGroupIdentifier = "group.com.nutritionrx.app"

    static func getUserDefaults() -> UserDefaults? {
        return UserDefaults(suiteName: appGroupIdentifier)
    }
}
