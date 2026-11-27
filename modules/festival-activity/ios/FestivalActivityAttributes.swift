import ActivityKit
import Foundation

// Keep identical to targets/festival-widget/FestivalActivityAttributes.swift.
struct FestivalActivityAttributes: ActivityAttributes {
  typealias ContentState = FestivalActivityContentState
  var eventId: String
  var artist: String
  var stage: String
  var kind: String
  var startAt: Date
  var endAt: Date
  var timeLabel: String
  var url: String
}
