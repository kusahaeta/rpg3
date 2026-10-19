// アプリアイコン（1024px）を描く。Android の ic_launcher_*.xml と同じ絵。
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
// 耳
poly([(33, 52), (36, 30), (50, 43)], 0xF2A65A)
poly([(75, 52), (72, 30), (58, 43)], 0xF2A65A)
poly([(36.5, 46), (38, 35), (45, 42)], 0xF7C6C0)
poly([(71.5, 46), (70, 35), (63, 42)], 0xF7C6C0)
// 顔
ellipse(54, 61, 24, 20, 0xF2A65A)
ellipse(54, 70, 10, 7, 0xFFE9D2)
// 目と鼻
ellipse(44.5, 59, 3.5, 4.2, 0x1B1B2E)
ellipse(63.5, 59, 3.5, 4.2, 0x1B1B2E)
ellipse(46.1, 57.2, 1.1, 1.1, 0xFFFFFF)
ellipse(65.1, 57.2, 1.1, 1.1, 0xFFFFFF)
poly([(51.5, 66), (56.5, 66), (54, 68.6)], 0xE0707A)

let out = URL(fileURLWithPath: CommandLine.arguments[1])
let dest = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
CGImageDestinationFinalize(dest)
