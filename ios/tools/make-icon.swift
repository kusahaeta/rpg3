// アプリアイコン（1024px）を描く。三毛猫のミケの顔。
// 使い方: swift ios/tools/make-icon.swift ios/Nyanko/Assets.xcassets/AppIcon.appiconset/icon-1024.png
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let size = 1024
let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
                    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
// 108×108 の座標（Android の viewport）で描く。上下を反転し、猫を少し大きめに見せる
ctx.translateBy(x: 0, y: CGFloat(size))
ctx.scaleBy(x: 1, y: -1)
ctx.scaleBy(x: CGFloat(size) / 108, y: CGFloat(size) / 108)

func color(_ hex: UInt32) -> CGColor {
    CGColor(srgbRed: CGFloat(hex >> 16 & 0xff) / 255, green: CGFloat(hex >> 8 & 0xff) / 255, blue: CGFloat(hex & 0xff) / 255, alpha: 1)
}
func poly(_ pts: [(CGFloat, CGFloat)], _ hex: UInt32) {
    ctx.setFillColor(color(hex))
    ctx.move(to: CGPoint(x: pts[0].0, y: pts[0].1))
    for p in pts.dropFirst() { ctx.addLine(to: CGPoint(x: p.0, y: p.1)) }
    ctx.closePath(); ctx.fillPath()
}
func ellipse(_ cx: CGFloat, _ cy: CGFloat, _ rx: CGFloat, _ ry: CGFloat, _ hex: UInt32) {
    ctx.setFillColor(color(hex))
    ctx.fillEllipse(in: CGRect(x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2))
}
func star(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ hex: UInt32) {
    let k = r * 0.4
    poly([(x, y - r), (x + k, y - k), (x + r, y), (x + k, y + k), (x, y + r), (x - k, y + k), (x - r, y), (x - k, y - k)], hex)
}

// 背景と星
ctx.setFillColor(color(0x0B1430)); ctx.fill(CGRect(x: 0, y: 0, width: 108, height: 108))
star(19, 24, 4.2, 0xFFF4C2)
star(82, 25.1, 3.1, 0xFFF4C2)
star(86, 82.8, 2.8, 0x9FB6FF)

// 猫は中心 (54, 56) を軸に 1.3 倍
ctx.translateBy(x: 54, y: 56); ctx.scaleBy(x: 1.3, y: 1.3); ctx.translateBy(x: -54, y: -56)
// 三毛のミケ（js/data.js の look）：白地に、額の片側に茶、反対の耳まわりに黒。赤いはちまき
let fur: UInt32 = 0xFFFAF2, orange: UInt32 = 0xF29A3E, black: UInt32 = 0x3B302C
// 耳（右耳は黒）
poly([(33, 52), (36, 30), (50, 43)], fur)
poly([(75, 52), (72, 30), (58, 43)], black)
poly([(36.5, 46), (38, 35), (45, 42)], 0xF7B3BD)
poly([(71.5, 46), (70, 35), (63, 42)], 0xF7B3BD)
// 顔と、顔の形で切り抜いたぶち・はちまき
ellipse(54, 61, 24, 20, fur)
ctx.saveGState()
ctx.addEllipse(in: CGRect(x: 30, y: 41, width: 48, height: 40)); ctx.clip()
ellipse(40, 46, 14, 10, orange)
ellipse(33, 54, 7, 6, orange)
ellipse(68, 44, 11, 8, black)
ellipse(74, 50, 6, 6, black)
ctx.setFillColor(color(0xE0453A))
ctx.move(to: CGPoint(x: 26, y: 50)); ctx.addQuadCurve(to: CGPoint(x: 82, y: 50), control: CGPoint(x: 54, y: 40))
ctx.addLine(to: CGPoint(x: 82, y: 55.5)); ctx.addQuadCurve(to: CGPoint(x: 26, y: 55.5), control: CGPoint(x: 54, y: 45.5))
ctx.closePath(); ctx.fillPath()
ctx.restoreGState()
// 目（金色）・頬・鼻・口
for x: CGFloat in [44.5, 63.5] {
    ellipse(x, 61, 3.8, 4.4, 0xF2A91E)
    ellipse(x, 61.3, 2.1, 3.5, 0x1B1B2E)
    ellipse(x + 1.3, 59.2, 1.1, 1.1, 0xFFFFFF)
}
ellipse(39, 67.5, 3.2, 1.8, 0xF9C9CF)
ellipse(69, 67.5, 3.2, 1.8, 0xF9C9CF)
poly([(52, 66.5), (56, 66.5), (54, 68.6)], 0xE0707A)
ctx.setStrokeColor(color(0x8A5A5E)); ctx.setLineWidth(0.7); ctx.setLineCap(.round)
ctx.move(to: CGPoint(x: 51.2, y: 69.6)); ctx.addQuadCurve(to: CGPoint(x: 54, y: 69.4), control: CGPoint(x: 52.6, y: 71.4))
ctx.addQuadCurve(to: CGPoint(x: 56.8, y: 69.6), control: CGPoint(x: 55.4, y: 71.4))
ctx.strokePath()

let out = URL(fileURLWithPath: CommandLine.arguments[1])
let dest = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
CGImageDestinationFinalize(dest)
