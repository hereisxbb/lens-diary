import SwiftUI
import MapKit

struct SelectedPOICard: View {
    @EnvironmentObject private var store: PlaceStore

    let item: MKMapItem
    let onClose: () -> Void
    let onAddSource: (UUID) -> Void
    let onOpenSavedPlace: (UUID) -> Void

    private var saved: SavedPlace? {
        store.savedPlace(matching: item)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Capsule().fill(.secondary.opacity(0.25)).frame(width: 38, height: 4).frame(maxWidth: .infinity)

            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "mappin.and.ellipse")
                    .font(.title2)
                    .foregroundStyle(.green)
                    .frame(width: 38, height: 38)
                    .background(.green.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 4) {
                    Text(item.name ?? "Apple Maps 地点").font(.headline)
                    if let address = item.placemark.title, !address.isEmpty {
                        Text(address).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                    }
                    if let identifier = item.identifier?.rawValue {
                        Text("Apple Place ID · \(identifier)").font(.caption2).foregroundStyle(.tertiary).lineLimit(1)
                    }
                }

                Spacer()
                Button(action: onClose) {
                    Image(systemName: "xmark").font(.caption.bold()).frame(width: 28, height: 28).background(.thinMaterial, in: Circle())
                }.buttonStyle(.plain)
            }

            if let saved {
                HStack(spacing: 10) {
                    Button { onAddSource(saved.id) } label: {
                        Label("添加小红书", systemImage: "link.badge.plus").frame(maxWidth: .infinity)
                    }.buttonStyle(.borderedProminent).tint(.green)
                    Button { onOpenSavedPlace(saved.id) } label: {
                        Text("\(saved.sourceLinks.count) 条攻略").frame(maxWidth: .infinity)
                    }.buttonStyle(.bordered)
                }
            } else {
                Button {
                    let saved = store.save(item)
                    onAddSource(saved.id)
                } label: {
                    Label("标记这个地方，并添加小红书", systemImage: "bookmark.fill").frame(maxWidth: .infinity)
                }.buttonStyle(.borderedProminent).tint(.green)
            }
        }
        .padding(16)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.12), radius: 22, y: 10)
        .padding(.horizontal, 12)
        .padding(.bottom, 6)
    }
}
