import Foundation

@main
enum WidgetModelChecks {
  static func main() throws {
    let json="""
    {"schemaVersion":1,"updatedAt":"2027-07-08T14:30:00.000Z","year":2027,
     "startAt":"2027-07-07T08:00:00.000Z","endAt":"2027-07-12T00:00:00.000Z","location":"Лагуново",
     "weather":{"temperature":23.4,"code":61,"isDay":true,"observedAt":"2027-07-08T14:15:00.000Z","stale":false},
     "performances":[
       {"id":"a","artist":"Мельница","stage":"Южная","startAt":"2027-07-08T14:00:00.000Z","endAt":"2027-07-08T15:00:00.000Z","url":"uletay://headliners/a"},
       {"id":"b","artist":"Пилот","stage":"Главная","startAt":"2027-07-08T14:15:00.000Z","endAt":"2027-07-08T14:45:00.000Z","url":"uletay://headliners/b"},
       {"id":"c","artist":"Ария","stage":"Главная","startAt":"2027-07-08T15:00:00.000Z","endAt":"2027-07-08T16:00:00.000Z","url":"uletay://headliners/c"}
     ]}
    """
    let data=try FestivalWidgetData.decoder.decode(FestivalWidgetData.self,from:Data(json.utf8))
    let now=ISO8601DateFormatter().date(from:"2027-07-08T14:30:00Z")!
    precondition(data.current(at:now).map{$0.id} == ["b","a"],"Simultaneous stages sorted by end")
    precondition(data.next(at:now).map{$0.id} == ["c"],"Upcoming artist")
    precondition(data.current(at:now.addingTimeInterval(1800)).map{$0.id} == ["c"],"Exact boundary switches performers")
    precondition(data.phase(at:data.startAt.addingTimeInterval(-1)) == .countdown)
    precondition(data.phase(at:data.startAt) == .festival)
    precondition(data.phase(at:data.endAt) == .finished)
    precondition(data.daysRemaining(at:data.startAt.addingTimeInterval(-86401)) == 2)
    precondition(data.daysRemaining(at:data.startAt) == 0)
    precondition(data.next(at:data.endAt).isEmpty)
    precondition(data.weather?.symbol == "cloud.rain.fill")
    precondition(data.weather?.degrees == "+23°")
    precondition(data.weather?.isCurrent(at:now) == true)
    precondition(data.weather?.isCurrent(at:now.addingTimeInterval(4*3600)) == false)
    let timeline=data.timelineDates(from:now)
    precondition(timeline.first == now)
    precondition(timeline.contains(data.performances[1].endAt))
    precondition(timeline.contains(data.performances[2].startAt))
    precondition(Set(timeline).count == timeline.count && timeline.count<=200)
    print("Widget model: 17 native checks passed (countdown, multiple stages, boundaries, timeline and weather)")
  }
}
