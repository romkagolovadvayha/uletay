import Foundation

@main struct FestivalActivityProtocolChecks {
  static func main() throws {
    let end = Date(timeIntervalSince1970: 1_800_000_000)
    let start = end.addingTimeInterval(-3600)
    let state = FestivalActivityContentState(endAt: end, artist: "Артист", stage: "Новая сцена", kind: "performance", startAt: start, timeLabel: "18:00–19:00", url: "/schedule/live/one", status: "live")
    let encoded = try JSONEncoder().encode(state)
    let raw = try JSONSerialization.jsonObject(with: encoded) as! [String: Any]
    precondition(raw["endAt"] as! Double == 821_692_800, "Date must use Apple's default 2001 reference epoch")
    let decoded = try JSONDecoder().decode(FestivalActivityContentState.self, from: encoded)
    precondition(decoded == state)
    let old = try JSONDecoder().decode(FestivalActivityContentState.self, from: Data(#"{"endAt":821692800}"#.utf8))
    precondition(old.endAt == end && old.artist == nil && old.status == nil, "Old local ActivityKit cards must remain decodable")
    let apns = Data(#"{"endAt":821692800,"artist":"Новый артист","stage":"Новая сцена","startAt":821689200,"timeLabel":"18:00–19:00","kind":"performance","url":"/schedule/live/one","status":"ended"}"#.utf8)
    let final = try JSONDecoder().decode(FestivalActivityContentState.self, from: apns)
    precondition(final.endAt == end && final.status == "ended" && final.stage == "Новая сцена")
    print("PASS: real Swift Codable accepts server APNs state, default Date epoch, metadata changes, end state and legacy local cards")
  }
}
