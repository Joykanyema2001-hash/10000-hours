import SwiftUI
import WidgetKit

extension Color {
  static let tenkLime = Color(red: 198 / 255, green: 1, blue: 43 / 255)
  static let tenkInk = Color(red: 12 / 255, green: 11 / 255, blue: 43 / 255)
  static let tenkPaper = Color(red: 248 / 255, green: 250 / 255, blue: 238 / 255)
}

/// Rounded system font: the closest built-in match to the app's Fredoka.
func rounded(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
  .system(size: size, weight: weight, design: .rounded)
}

/// 5_100_000 ms → "1h 25m".
func formatDuration(ms: Double) -> String {
  let totalMinutes = Int(max(0, ms) / 60_000)
  let h = totalMinutes / 60
  let m = totalMinutes % 60
  if h == 0 { return "\(m)m" }
  if m == 0 { return "\(h)h" }
  return "\(h)h \(m)m"
}

/// Seconds → "42:18" or "1:02:05".
func formatClock(seconds: Double) -> String {
  let s = Int(max(0, seconds))
  let h = s / 3600
  let m = (s % 3600) / 60
  let sec = s % 60
  return h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%02d:%02d", m, sec)
}

extension View {
  /// iOS 17 requires widgets to declare their background this way.
  @ViewBuilder
  func tenkWidgetBackground(_ color: Color) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      self.containerBackground(color, for: .widget)
    } else {
      self.background(color)
    }
  }
}
