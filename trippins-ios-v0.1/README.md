# TripPins iOS v0.1 — Apple Maps × 小红书

核心思路：Apple Maps 负责“这是哪里”，小红书负责“为什么想去”，TripPins 负责把地点和攻略连接起来。

## v0.1

- 原生 MKMapView
- 直接点击 Apple Maps POI
- MKMapFeatureAnnotation → MKMapItemRequest → MKMapItem
- 保存 Apple Place ID / 名称 / 地址 / 坐标
- Apple Maps 原生 MKLocalSearch
- 收藏地点
- 同一地点绑定多条小红书攻略
- 解析小红书复制链接整段文字
- 自定义绿色收藏 Pin
- 地点详情页
- 打开小红书原帖
- 打开 Apple Maps 导航
- Share Extension skeleton 已预留

## 本地运行

需要 macOS + Xcode。若使用 XcodeGen：

```bash
xcodegen generate
open TripPins.xcodeproj
```

建议 iOS 18+。

第一轮最重要的是验证：直接点 Apple Maps POI 的体验是否真的像“Apple Maps 多了一层我的小红书”。
