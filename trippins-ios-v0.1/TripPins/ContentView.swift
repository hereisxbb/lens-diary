import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            MapHomeView().tabItem { Label("地图", systemImage: "map.fill") }
            LibraryView().tabItem { Label("地点", systemImage: "bookmark.fill") }
            AboutView().tabItem { Label("我的", systemImage: "person.crop.circle") }
        }.tint(.green)
    }
}

struct AboutView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("TripPins v0.1") {
                    Label("地点由 Apple Maps 确认", systemImage: "checkmark.seal.fill")
                    Label("攻略链接挂在地点下面", systemImage: "link")
                    Label("不依赖 AI 猜坐标", systemImage: "sparkles.slash")
                }
                Section("核心体验") {
                    Text("在地图上直接点 Apple Maps 的 POI → 标记地点 → 添加小红书链接 → 以后从地点重新找到攻略。")
                }
                Section("下一步") {
                    Text("加入 iOS Share Extension：从小红书点“分享 → 存到旅迹”，TripPins 接收链接后让你直接绑定到 Apple Maps 地点。")
                }
            }.navigationTitle("旅迹")
        }
    }
}
