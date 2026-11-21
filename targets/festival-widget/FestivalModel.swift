import Foundation

struct FestivalPerformance: Codable, Identifiable {
  let id: String
  let artist: String
  let stage: String
  let startAt: Date
  let endAt: Date
  let url: String
}

struct FestivalWidgetWeather: Codable {
  let temperature: Double
  let code: Int
  let isDay: Bool
  let observedAt: Date
  let stale: Bool

  var symbol: String {
    switch code {
    case 0: return isDay ? "sun.max.fill" : "moon.stars.fill"
    case 1,2: return isDay ? "cloud.sun.fill" : "cloud.moon.fill"
    case 45,48: return "cloud.fog.fill"
    case 51,53,55: return "cloud.drizzle.fill"
    case 56,57,66,67: return "cloud.sleet.fill"
    case 61,63,65,80,81,82: return "cloud.rain.fill"
    case 71,73,75,77,85,86: return "cloud.snow.fill"
    case 95,96,97,99: return "cloud.bolt.rain.fill"
    default: return "cloud.fill"
    }
  }
  var degrees: String { let n=Int(temperature.rounded()); return "\(n>0 ? "+" : "")\(n)°" }
  func isCurrent(at date: Date) -> Bool { !stale && date.timeIntervalSince(observedAt)>=(-3600) && date.timeIntervalSince(observedAt)<=10800 }
}

struct FestivalWidgetData: Codable {
  let schemaVersion: Int
  let updatedAt: Date
  let year: Int
  let startAt: Date
  let endAt: Date
  let location: String
  let performances: [FestivalPerformance]
  let weather: FestivalWidgetWeather?

  static let decoder: JSONDecoder = {
    let decoder=JSONDecoder()
    decoder.dateDecodingStrategy = .custom { value in
      let raw=try value.singleValueContainer().decode(String.self)
      let format=ISO8601DateFormatter()
      format.formatOptions=[.withInternetDateTime,.withFractionalSeconds]
      if let date=format.date(from:raw) { return date }
      format.formatOptions=[.withInternetDateTime]
      if let date=format.date(from:raw) { return date }
      throw DecodingError.dataCorruptedError(in:try value.singleValueContainer(),debugDescription:"Invalid festival timestamp")
    }
    return decoder
  }()

  func phase(at date: Date) -> FestivalWidgetPhase {
    date<startAt ? .countdown : date<endAt ? .festival : .finished
  }
  func current(at date: Date) -> [FestivalPerformance] {
    guard phase(at:date) == .festival else { return [] }
    return performances.filter{$0.startAt<=date && date<$0.endAt}.sorted{$0.endAt<$1.endAt}
  }
  func next(at date: Date) -> [FestivalPerformance] {
    guard phase(at:date) != .finished else { return [] }
    return performances.filter{$0.startAt>date}.sorted{$0.startAt<$1.startAt}
  }
  func daysRemaining(at date: Date) -> Int { max(0,Int(ceil(startAt.timeIntervalSince(date)/86400))) }
  func timelineDates(from date: Date) -> [Date] {
    let horizon=date.addingTimeInterval(48*3600)
    var times=Set([date,startAt,endAt].filter{$0>=date && $0<=horizon})
    // Preload transitions: the countdown and stage changes work without the app.
    for performance in performances {
      for time in [performance.startAt,performance.endAt] where time>date && time<=horizon { times.insert(time) }
    }
    for hour in 1...48 { times.insert(date.addingTimeInterval(Double(hour)*3600)) }
    return Array(times).sorted().prefix(200).map{$0}
  }
}
enum FestivalWidgetPhase { case countdown,festival,finished }

enum FestivalWidgetStore {
  static let cacheKey="uletay.widget.public-data.v1"
  static let endpoints=["https://uletayapp.ru/api/widget","https://d5doi78tpg13bke63gsc.bu9mdbe1.apigw.yandexcloud.net/api/widget"]
  static func cached() -> FestivalWidgetData? {
    guard let raw=UserDefaults.standard.data(forKey:cacheKey) else { return nil }
    return try? FestivalWidgetData.decoder.decode(FestivalWidgetData.self,from:raw)
  }
  static func load() async -> FestivalWidgetData? {
    for endpoint in endpoints {
      do {
        var request=URLRequest(url:URL(string:endpoint)!);request.timeoutInterval=10
        let (raw,response)=try await URLSession.shared.data(for:request)
        guard (response as? HTTPURLResponse)?.statusCode==200,raw.count<512_000 else { continue }
        let data=try FestivalWidgetData.decoder.decode(FestivalWidgetData.self,from:raw)
        guard data.schemaVersion==1,data.startAt<data.endAt else { continue }
        UserDefaults.standard.set(raw,forKey:cacheKey)
        return data
      } catch { continue }
    }
    return cached()
  }
}
