import ActivityKit
import Foundation

// Keep in sync with modules/tenk-activity/ios/SessionActivityAttributes.swift.
// ActivityKit matches the app and widget by this type's name and its Codable fields.
struct SessionActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var skillName: String
    var symbol: String
    /// The elapsed timer counts up from this date (= run start minus time banked before pauses).
    var startDate: Date
    /// Set while paused: elapsed seconds frozen at the pause.
    var pausedElapsed: Double?
    /// The whole hour the skill is working towards, e.g. 1,241.
    var nextHour: Int
    /// The current hour's window, for a progress bar that fills on its own.
    var hourStart: Date
    var hourEnd: Date
  }
}
