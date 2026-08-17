import SwiftUI

@main
struct TripPinsApp: App {
    @StateObject private var store = PlaceStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
