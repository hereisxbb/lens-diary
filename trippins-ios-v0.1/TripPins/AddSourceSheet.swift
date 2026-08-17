import SwiftUI

struct AddSourceSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: PlaceStore

    let placeID: UUID

    @State private var rawText = ""
    @State private var title = ""
    @State private var url = ""
    @State private var note = ""

    private var canSave: Bool {
        !url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextEditor(text: $rawText)
                        .frame(minHeight: 120)
                        .onChange(of: rawText) { _, newValue in
                            let parsed = ShareTextParser.parse(newValue)
                            title = parsed.title
                            url = parsed.url
                        }
                } header: {
                    Text("粘贴小红书分享内容")
                } footer: {
                    Text("直接粘贴“小红书 → 分享 → 复制链接”得到的整段文字。地点已经由 Apple Maps 确定，这里只负责把攻略挂到地点下面。")
                }

                Section("攻略信息") {
                    TextField("标题", text: $title)
                    TextField("链接", text: $url)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                    TextField("备注，例如：芝公园角度最好看", text: $note, axis: .vertical)
                }

                Section {
                    Button {
                        let source = SourceLink(
                            title: title.isEmpty ? "小红书攻略" : title,
                            url: url.trimmingCharacters(in: .whitespacesAndNewlines),
                            note: note
                        )
                        store.addSource(source, to: placeID)
                        dismiss()
                    } label: {
                        Label("绑定到这个地点", systemImage: "link.badge.plus")
                            .frame(maxWidth: .infinity)
                    }
                    .disabled(!canSave)
                }
            }
            .navigationTitle("添加小红书攻略")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
            }
        }
    }
}
