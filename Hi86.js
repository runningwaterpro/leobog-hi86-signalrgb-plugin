// Leobog Hi86 —— SignalRGB 设备插件
//
// 逐键灯光控制（有线 USB-C）。
// 安装与使用方法见 README.md。

export function Name() { return "Leobog Hi86"; }
export function VendorId() { return 0x258A; }
export function ProductId() { return 0x010C; }
export function Publisher() { return "runningwaterpro"; }
export function Size() { return [17, 6]; }
export function DefaultPosition() { return [10, 100]; }
export function DefaultScale() { return 4.0; }

// 官方程序运行时拒绝工作。两者都独占厂商配置通道，同时写就是乱局。
export function ConflictingProcesses() { return ["OemDrv.exe"]; };

// 按画布位置排序后的 LED 索引。
const vKeys = [
    0, 6, 12, 18, 24, 30, 36, 42, 48, 54,
    60, 66, 72, 78, 84, 90, 1, 7, 13, 19,
    25, 31, 37, 43, 49, 55, 61, 67, 73, 79,
    85, 91, 2, 8, 14, 20, 26, 32, 38, 44,
    50, 56, 62, 68, 74, 80, 86, 92, 3, 9,
    15, 21, 27, 33, 39, 45, 51, 57, 63, 69,
    81, 87, 93, 4, 10, 16, 22, 28, 34, 40,
    46, 52, 58, 64, 82, 88, 5, 11, 17, 35,
    53, 59, 77, 83, 89, 95,
];

// SignalRGB 官方键名表。用于按键触发效果和逐键上色。
const vLedNames = [
    "Esc", "F1", "F2", "F3", "F4", "F5",
    "F6", "F7", "F8", "F9", "F10", "F11",
    "F12", "Print Screen", "Scroll Lock", "Pause Break", "`", "1",
    "2", "3", "4", "5", "6", "7",
    "8", "9", "0", "-", "=", "Backspace",
    "Insert", "Home", "Tab", "Q", "W", "E",
    "R", "T", "Y", "U", "I", "O",
    "P", "[", "]", "\\", "Del", "End",
    "Caps Lock", "A", "S", "D", "F", "G",
    "H", "J", "K", "L", ";", "'",
    "Enter", "Page Up", "Page Down", "Left Shift", "Z", "X",
    "C", "V", "B", "N", "M", ",",
    ".", "/", "Right Shift", "Up Arrow", "Left Ctrl", "Left Win",
    "Left Alt", "Space", "Right Alt", "Fn", "Right Ctrl", "Left Arrow",
    "Down Arrow", "Right Arrow",
];

// 画布坐标。同一行内按列从左到右。
const vLedPositions = [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [6, 0], [7, 0], [8, 0],
    [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1],
    [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1], [15, 1], [16, 1],
    [0, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2],
    [9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2],
    [0, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3],
    [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [15, 3], [16, 3], [0, 4],
    [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
    [10, 4], [11, 4], [12, 4], [15, 4], [0, 5], [1, 5], [3, 5], [4, 5],
    [10, 5], [11, 5], [13, 5], [14, 5], [15, 5], [16, 5],
];

// ---------------------------------------------------------------------------
// 协议
//
// 一帧灯光 = 520 字节 HID 特征报告：8 字节包头 + 512 字节载荷。
// 包头固定为 06 08 00 00 01 00 7A 01。
//
// 这套包头有两个独立实现互证，逐字节相同：
//   - OpenRGB  Controllers/SinowealthController/SinowealthKeyboard10cController
//   - 社区插件  NollieL/SignalRgb_CN_Key 的 Leobog Hi75.js
// ---------------------------------------------------------------------------

const REPORT_LENGTH = 520;
const PAYLOAD_LENGTH = 512;

// 包头
const HDR_ROUTE    = 0x06;   // 路由字节，恒定

// ✅ **对象号已在 Hi86 上实测确认（2026-10-23）：0x08。**
// 实测现象：单帧写入 Esc 变红、其余全灭，位置与颜色均正确。
// 单帧是瞬态：约 1 秒后固件自行重绘 onboard 效果；保持显示需要连续发帧
// （SignalRGB 的渲染循环天然满足这个条件）。
const HDR_OBJECT   = 0x08;

const HDR_RESERVED = 0x00;   // 第 3 字节
const HDR_PAGES    = 0x01;   // 第 4 字节，页数
const HDR_LEN_LO   = 0x7A;   // 第 6 字节，固定值（两份实现与 Hi86 实测一致）
const HDR_LEN_HI   = 0x01;   // 第 7 字节，固定值

const PAYLOAD_OFFSET = 8;      // 载荷起点
const BYTES_PER_LED  = 3;      // 每键三个字节

// LED 索引的合法上界。硬件事实，不是载荷能塞多少 —— 载荷 512 字节能塞
// 170 个 LED，但 Hi86 只有 0..95 这些索引。写错了会写到不存在的灯位上。
const MAX_LED_INDEX = 95;

// ---------------------------------------------------------------------------
// 端点
//
// 只认特征报告长度 520 的那个集合。
//
// Hi86 有三个 0xFF00/0x0001 的集合，Usage Page 和 Usage 完全相同：
//   COL03  特征长度 0
//   COL05  特征长度 6
//   COL06  特征长度 520   ← 只有这个装得下这个包
// 三者靠集合编号区分。
//
// 社区插件只按 interface/usage/usage_page 过滤，会同时打开三个 —— 这很可能
// 就是社区用户报告「Hi75 经常断开、无响应」的原因。
//
// **两道保险**：
//   1. Validate 按集合编号精确锁定 COL06
//   2. 发包前再确认当前端点的特征长度确实是 520
// 第 2 道是安全网：万一 SignalRGB 枚举出的集合编号与预期不同，
// 表现是「不发包」而不是「往错集合发包」。
// ---------------------------------------------------------------------------

const ENDPOINT_INTERFACE  = 1;
const ENDPOINT_USAGE      = 0x0001;
const ENDPOINT_USAGE_PAGE = 0xFF00;
const ENDPOINT_COLLECTION = 6;         // COL06 —— 特征长度 520 那个
const ENDPOINT_FEATURE_LEN = 520;      // 它的特征报告长度

// 厂商配置通道是否可用。false 表示不发包。
let channelReady = false;

export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
	];
}

export function LedNames() {
	return vLedNames;
}

export function LedPositions() {
	return vLedPositions;
}

export function Initialize() {
	// 明确选中厂商配置通道。
	// set_endpoint 只能切到 Validate 已经打开的端点。
	device.set_endpoint(ENDPOINT_INTERFACE, ENDPOINT_USAGE,
		ENDPOINT_USAGE_PAGE, ENDPOINT_COLLECTION);

	// 核对一下这个端点的特征长度是不是 520。
	// 对不上就放弃 —— 宁可不发包，也不要往特征长度不够的集合发 520 字节。
	if (typeof device.getHidInfo === "function") {
		let info = device.getHidInfo();
		if (!info || info.featureLength !== ENDPOINT_FEATURE_LEN) {
			device.log("Hi86: 集合 " + ENDPOINT_COLLECTION
				+ " 的特征长度是 " + (info ? info.featureLength : "未知")
				+ "，不是 " + ENDPOINT_FEATURE_LEN + "，灯光不会被控制");
			channelReady = false;
			return;
		}
		device.log("Hi86: 选中厂商配置通道，集合 " + ENDPOINT_COLLECTION
			+ "，特征长度 " + info.featureLength);
	} else {
		// 这个 SignalRGB 版本没有 getHidInfo。信任集合编号。
		device.log("Hi86: 选中厂商配置通道，集合 " + ENDPOINT_COLLECTION);
	}
	channelReady = true;
}

// 唯一允许碰设备的地方。其余逻辑只算字节。
export function Render() {
	// 通道没准备好就不发包。
	if (!channelReady) {
		return;
	}
	sendFrame();
}

export function Shutdown() {
	// 停止发包即可。灯效档案在设备自己的 flash 里，不受影响。
	channelReady = false;
}

// ---------------------------------------------------------------------------
// 只写灯光，不碰别的
//
// 官方程序在同一片 flash 区域里存着灯效档案。本插件只写实时数据对象，
// 不动灯效档案本身，所以不会覆盖官方程序的设置。
// ---------------------------------------------------------------------------

// 从画布取色，组装成 {LED 索引: [R, G, B]}。
function collectColors() {
	let colors = {};

	for (let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		let iPxX = vLedPositions[iIdx][0];
		let iPxY = vLedPositions[iIdx][1];
		let color;

		if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(iPxX, iPxY);
		}

		// vKeys[iIdx] 是这个键的 LED 索引。索引是稀疏的，没用到的留空。
		colors[vKeys[iIdx]] = color;
	}

	return colors;
}

// 构造一帧灯光。纯函数，不碰设备。
function buildFrame(colors) {
	let frame = new Array(REPORT_LENGTH).fill(0);

	frame[0] = HDR_ROUTE;
	frame[1] = HDR_OBJECT;
	frame[2] = HDR_RESERVED;
	frame[3] = HDR_RESERVED;
	frame[4] = HDR_PAGES;
	frame[5] = HDR_RESERVED;
	frame[6] = HDR_LEN_LO;
	frame[7] = HDR_LEN_HI;

	for (let index in colors) {
		let led = parseInt(index, 10);
		if (isNaN(led) || led < 0 || led > MAX_LED_INDEX) {
			throw new Error("LED 索引 " + index + " 越界（合法范围 0.." + MAX_LED_INDEX + "）");
		}
		let color = colors[index];
		let offset = PAYLOAD_OFFSET + (led * BYTES_PER_LED);
		frame[offset] = color[0];
		frame[offset + 1] = color[1];
		frame[offset + 2] = color[2];
	}

	return frame;
}

function sendFrame() {
	// 发包前再确认一次当前端点。
	//
	// 万一 SignalRGB 枚举出的集合编号与预期不同，现在停着的可能是
	// 特征长度 0 或 6 的集合。往那里发 520 字节，Windows 会直接拒绝，
	// 而这个错误表现为「插件在、灯不动」，很难查。
	if (typeof device.getHidInfo === "function") {
		let info = device.getHidInfo();
		if (!info || info.featureLength !== ENDPOINT_FEATURE_LEN) {
			return;
		}
	}

	let frame = buildFrame(collectColors());

	// 特征报告总长必须等于集合声明的长度 520。
	device.send_report(frame, REPORT_LENGTH);
}

function hexToRgb(hex) {
	let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	let colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);
	return colors;
}

export function Validate(endpoint) {
	// 四项特征全对才打开这个集合。
	//
	// 少查集合编号就会同时打开 COL03 / COL05 / COL06 三个
	// （Usage Page 和 Usage 完全相同），同时持有多个句柄本身就是乱局来源。
	return endpoint.interface === ENDPOINT_INTERFACE
		&& endpoint.usage === ENDPOINT_USAGE
		&& endpoint.usage_page === ENDPOINT_USAGE_PAGE
		&& endpoint.collection === ENDPOINT_COLLECTION;
}
