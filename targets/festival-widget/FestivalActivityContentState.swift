import Foundation

// Default Foundation Codable dates are seconds since 2001-01-01. Keep this
// structure identical in the host and widget; older local cards only have endAt.
struct FestivalActivityContentState: Codable, Hashable {
  var endAt: Date
  var artist: String? = nil
  var stage: String? = nil
  var kind: String? = nil
  var startAt: Date? = nil
  var timeLabel: String? = nil
  var url: String? = nil
  var status: String? = nil
}
