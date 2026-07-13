---
theme: default
title: 从 Joint 到 End Pose
titleTemplate: '%s · 位姿与 URDF 入门'
author: kscii
class: cover-slide
info: |
  面向数采训练场平台开发团队的 30 分钟技术科普。
  文档型版本：正文与演示 20 页，附录 3 页，共 23 页。
colorSchema: dark
transition: fade-out
exportFilename: pose-urdf-intro
mdc: true
---

<div class="eyebrow">POSE · FRAME · URDF · TF · FK</div>

# 未命名标题

<div class="subtitle">机器人位姿、坐标系、URDF 与末端位姿解算通识介绍</div>

<!--
这里可以写注释
-->

---

<div class="eyebrow">00 · 大纲</div>

# 讲解范围

<div class="three-col micro">
<div>

## 结束后应能回答

1. Pose 为什么必须说明 frame？
2. position / orientation 是什么？
3. RPY、matrix、quaternion 的区别？
4. Action End / State End 的区别？
5. Raw、Verify、Reference、TCP 是什么？
6. world、base_link、vendor frame 如何选择？
7. link、joint、origin、axis、mesh 是什么？
8. URDF joint、运行时 joint、TF 的区别？
9. FK 如何沿链计算 end pose？
10. FK 开发应检查哪些工程问题？
11. 如何用 Foxglove 基本校验？

</div>
<div>

## 正文覆盖

- Pose / frame / timestamp / XYZ 颜色
- 三类坐标系与三种姿态表示
- 三组 End 语义
- URDF tree、link、joint、mesh/STL
- Joint 定义、运行时 q 与 TF
- 齐次变换、单 joint、链式 FK
- 单帧 / 批量 FK 与公司流程
- Raw/Verify、校验和错误清单

## 不展开

IK、Jacobian、动力学、规划；完整姿态转换推导；Rodrigues / quaternion 乘法；inertia 计算；TCP 标定；ROS TF API；STL 内部格式；完整 H5 schema；GPU FK 与复杂优化。

</div>
<div>

## 时间安排

| 章节 | 分钟 |
|---|---:|
| 为什么需要 End Pose | 2 |
| Pose / 坐标系 / 姿态 | 5 |
| End 类型与来源 | 4 |
| URDF 与结构 | 6 |
| FK 算法 | 7 |
| TF / 流程 / 校验 | 4 |
| Foxglove / 总结 | 2 |
| **合计** | **30** |

HTML 是正式演示版本；PDF 用作离线备用和存档。不单独预留 Q&A。

</div>
</div>

---

<div class="eyebrow">01 · Pose semantics</div>

# 为什么需要末端位姿，以及一条 Pose 必须说明什么

<div class="doc-grid wide-right">
<div>

末端位姿(end_pose) 描述机器人上的某个操作点：

- **position**：在哪里，通常为 `[x, y, z]`
- **orientation**：朝向哪里，表达方式包含：
  - RPY (roll, pitch, yaw)
  - Rotation Matrix (3×3的旋转矩阵)
  - Quaternion (x, y, z, w)
- **reference frame**：end_pose 处于的坐标系

> 目前我们内部对手臂末端的定义是使用arm的最后一个link作为reference end

</div>
<div>

|  - | - | 
|---|---|
| endpoint | 对应URDF中的哪个link |
| reference frame | 相对的坐标系(比如 `world`、`base_link`、`vendor frame`) | 
| timestamp | end_pose 对应的时间戳 | 
| position | end_pose 的位置 `[x, y, z]` | 
| orientation | end_pose 的姿态 `[x, y, z, w]` | 

```text
可用 Pose = Position + Orientation
          + Endpoint + Reference Frame + Timestamp
```

<div class="placeholder-line">待补：A2D 左手 reference / gripper center / TCP；pose 五项语义图</div>

</div>
</div>

<!--
约 2 分钟。单独给出 xyz 没有完整意义；Raw/Verify 校验的前提同样是 endpoint、frame、timestamp 一致。
-->

---

<div class="eyebrow">02 · Coordinate frame</div>

# XYZ 坐标轴与 Frame：不要把屏幕方向当成轴方向

<div class="doc-grid wide-left">
<div>

<div class="axis-inline">
  <span class="x-axis">X · 红色</span>
  <span class="y-axis">Y · 绿色</span>
  <span class="z-axis">Z · 蓝色</span>
</div>

- 这些颜色是 Foxglove、RViz 等工具的常见颜色约定。
- 每个 link 都可以拥有自己的 XYZ 轴，目前我们内部的所有axis都是完全和xyz轴对齐的。
- 坐标轴随对应 link 运动；
- 通常roll代表绕X轴旋转，pitch代表绕Y轴旋转，yaw代表绕Z轴旋转。

<div class="placeholder-line">待补：只显示 base_link、Link6_l、reference end、TCP 的简化截图</div>

</div>
<div class="doc-grid images-2">
<img class="doc-image" src="./assets/source/a2d-foxglove-side-frames.png" alt="A2D 侧视坐标轴">
<img class="doc-image" src="./assets/source/a2d-foxglove-top-frames.png" alt="A2D 俯视坐标轴">
</div>
</div>

---

<div class="eyebrow">03 · Reference frame</div>

# world、base_link 与厂商坐标系

| 坐标系 | 含义 | 优势 | 局限 | 适合场景 |
|---|---|---|---|---|
| `world` | 固定在场地或场景 | 全局轨迹、多机器人关系 | 依赖定位、标定或场地定义 | 移动轨迹、跨设备关系 |
| `base_link` | 固定在机器人本体，随整机移动 | 机器人内部运动语义稳定，与 URDF/FK 衔接 | 不能直接表达场地全局位置 | 机械臂 FK、统一 End、内部校验 |
| vendor frame | 厂商控制器或传感器自定义 | 与原始 topic / 系统直接对应 | 构型间不统一，定义可能不明确 | 原始接入、问题追踪 |

<div class="doc-grid" style="margin-top:18px">
<div>

厂商 Pose 归一化到 `base_link`：

$$T_{base\rightarrow end}=T_{base\rightarrow vendor}T_{vendor\rightarrow end}$$

</div>
<div class="small">

- `base_link` 不一定在几何中心，而是模型选定的本体参考 frame。
- vendor frame 不是错误，但不能在未说明时与 base_link pose 混用。
- 归一化不改变物理位置，只改变表达方式；必须先确认变换方向。

</div>
</div>

<div class="placeholder-line">动画占位：同一末端分别在 world / base_link / vendor frame 下显示（8–12 秒）</div>

---

<div class="eyebrow">04 · Orientation</div>

# 同一个姿态的三种表达

| 表达 | 数据形式 | 优点 | 局限 / 风险 | 常见用途 |
|---|---|---|---|---|
| RPY / Euler | `[roll, pitch, yaw]` | 三个数，人工理解直观 | 依赖旋转顺序；存在 gimbal lock | URDF origin、配置、调试显示 |
| Rotation Matrix | 3×3 | 直接参与变换和矩阵组合 | 九个数、有冗余；需保持正交 | FK 与坐标变换内部计算 |
| Quaternion | `[x, y, z, w]` | 四个数、无 gimbal lock，适合组合与插值 | 不直观；必须确认 `xyzw/wxyz` | ROS、H5、程序输出 |

<div class="doc-grid wide-left" style="margin-top:18px">
<div>

必须记住：三种表示描述的是同一个物理姿态；quaternion 通常应保持单位长度；`q` 和 `-q` 表示同一旋转。FK 常把 RPY / quaternion 转为 matrix 计算，再转换为输出 quaternion。

正文不展开完整转换公式，只建立用途与风险意识。

</div>
<div>
<img class="doc-image short" src="./assets/source/a2d-tf-message-arm.png" alt="TFMessage 中的 quaternion 与 RPY">
<div class="placeholder-line">待补：同一 Link6_l 姿态的三种表示图</div>
</div>
</div>

---

<div class="eyebrow">05 · End semantics</div>

# “End”有三组独立语义，不是一组互斥枚举

<div class="three-col">
<div>

## 目标还是实际

| 类型 | 含义 |
|---|---|
| Action | 发给机器人的控制指令 |
| State | 传感器返回的实际状态 |
| Action End | 指令对应的目标末端位姿 |
| State End | 实际关节状态对应的末端位姿 |

```text
action joints + FK → action end
state joints  + FK → state end
```

</div>
<div>

## 厂商还是平台计算

| 类型 | 含义 |
|---|---|
| Raw End | 厂商 topic / 控制器直接提供 |
| Verify/FK End | joint + URDF 由平台计算 |

Raw 接入简单但语义和质量可能不统一；Verify 过程可控但依赖正确 URDF、mapping、单位和时间。二者都不会“自动正确”。

</div>
<div>

## 描述哪个点

- wrist reference frame
- gripper center
- TCP
- camera optical frame
- foot contact / custom endpoint

End 通常对应 link/custom frame，而不是 joint；URDF 最后一个可见 mesh 不等于业务末端。

</div>
</div>

<div class="doc-note">可以组合出 verify action TCP end 等具体数据；比较任何两条 End Pose 前，先确认 endpoint、frame、timestamp 和 quaternion convention。</div>

---

<div class="eyebrow">06 · Action / State / Raw / Verify</div>

# Action 与 State 的差异，以及 Raw 与 Verify 的使用边界

<div class="doc-grid">
<div>

## Action End vs State End

Action 表示“被要求到哪里”，State 表示“实际到哪里”。两者使用同一 FK，差别首先来自输入 joint 数据。正常差异可能来自：控制延迟、速度限制、负载、跟踪误差、传感器噪声和时间未对齐。

<div class="placeholder-box compact"><strong>动画占位</strong><br>Action 用黄/橙，State 用青；内部 XYZ 仍为红绿蓝。展示 Action 先移动、State 随后跟随，8–12 秒循环。</div>

</div>
<div>

## Raw End vs Verify/FK End

Raw 接近厂商内部定义；Verify 便于平台统一和诊断。不要把 raw action、verify action、raw state、verify state 当成四个不同物理末端。

- A2D 没有 raw end：用于解释 URDF 与 FK。
- DWHEEL 有 raw end：用于 Raw / Verify 对比。
- 固定偏差不必然表示 FK 错误，可能是 endpoint 或 frame 不同。

<div class="placeholder-box compact"><strong>动画占位</strong><br>DWHEEL Raw 用橙、Verify 用青；展示正确重合与固定偏差，8–12 秒。</div>

</div>
</div>

---

<div class="eyebrow">07 · Reference end / TCP</div>

# Reference End 与 TCP：结构语义和操作语义

<div class="doc-grid wide-left">
<div>

- **Reference End**：选定的 URDF link / custom frame，是 FK 运动链的结构或语义终点。
- **TCP**：Tool Center Point，真正执行抓取、焊接、测量等操作的工具点。
- TCP 可以由 URDF fixed joint 或人工标定给出固定 offset；具体标定方法不在本次范围。

$$T_{base\rightarrow tcp}=T_{base\rightarrow reference}T_{reference\rightarrow tcp}$$

名字叫 `gripper_center` 不代表它自动等于最终业务 TCP，仍须确认语义和标定。

</div>
<div>

```xml
<link name="gripper_center"/>
<joint name="gripper_center_joint" type="fixed">
  <origin xyz="0 0 0.23"
          rpy="0 0 -1.57079632679"/>
  <parent link="left_base_link"/>
  <child link="gripper_center"/>
</joint>
```

`gripper_center` 没有 visual / collision / mesh，但仍是合法 link/frame。

</div>
</div>

<div class="placeholder-line">待补：Reference / gripper center / TCP 三点图；隐藏 mesh 后显示 meshless frame</div>

---

<div class="eyebrow">08 · URDF</div>

# URDF 是结构说明书：Link、Joint、Tree 与运动链

<div class="doc-grid wide-left">
<div>

URDF（Unified Robot Description Format）用 XML 描述机器人：link；joint 的 parent/child、origin、axis、type、limit；link 的 visual、collision、inertial；mesh 文件位置。

URDF **不保存**每帧 joint state，不是控制程序，也不是完整 CAD 工程。它给静态模型，运行时数据给当前关节值。

| 概念 | 含义 |
|---|---|
| link | 刚体部件及对应 frame |
| joint | parent link 与 child link 的连接与运动规则 |
| kinematic chain | base 到 end 的有序路径 |
| tree | 完整机器人通常是一棵树；FK 取其中一条链 |

</div>
<div>

```text
Link5_l → left_arm_joint6 → Link6_l
        → left_arm_joint7 → Link7_l
        → Joint_hand_l → left_base_link
        → gripper_center_joint → gripper_center
```

- 非根 link 通常只有一个 parent joint，可有多个 child joint。
- 三自由度腕部常用三个单自由度 joint 串联。
- joint 之间需要 link；中间 link 可以无实体长度或 mesh。
- 本文只截取 A2D 左臂，不展示 2400 多行完整 XML。

<div class="placeholder-line">动画：整机淡化并高亮左臂；图：简化 A2D 左臂 URDF Tree</div>

</div>
</div>

<div class="small">完整示例：<code>assets/source/A2D.urdf</code></div>

---

<div class="eyebrow">09 · URDF joint</div>

# 一个真实 Joint 定义了什么：以 left_arm_joint6 为例

<div class="doc-grid wide-left">
<div>

```xml
<joint name="left_arm_joint6" type="revolute">
  <origin xyz="0 0 0" rpy="-1.5708 0 3.1416"/>
  <parent link="Link5_l"/>
  <child link="Link6_l"/>
  <axis xyz="0 0 -1"/>
  <limit lower="-2.356" upper="2.356"
         effort="30" velocity="3.14"/>
</joint>
```

</div>
<div>

| 字段 | 含义 / 注意点 |
|---|---|
| parent / child | 连接的前后 link |
| origin xyz/rpy | joint frame 相对 parent 的固定安装位姿；**不是当前角度** |
| axis | revolute 旋转轴或 prismatic 平移轴；在 joint frame 表达 |
| type | fixed / revolute / continuous / prismatic |
| limit | 位置、速度、力矩等限制 |

`axis="0 0 -1"` 表示绕 joint frame 的负 Z 轴旋转。当前 q 来自 Action/State joint position。URDF 允许任意合法 axis；主轴方向只是数据现状或内部约定，不是 URDF 限制。

</div>
</div>

<div class="placeholder-line">动画占位：先显示 origin，再显示负 Z axis，最后播放 Link6_l 随 q 旋转（6–10 秒）</div>

---

<div class="eyebrow">10 · Mesh / STL</div>

# Mesh、STL、可见 Link 与 Meshless Link

<div class="doc-grid">
<div>

```xml
<link name="Link6_l">
  <visual><geometry>
    <mesh filename="./meshes/Link6_l.STL"/>
  </geometry></visual>
  <collision><geometry>
    <mesh filename="./meshes/Link6_l.STL"/>
  </geometry></collision>
</link>
```

**URDF** 管结构、连接和坐标关系；**STL** 只保存零件的三角形表面，不知道自己属于哪个机器人，也不知道 parent、child、joint 或运动规则。

</div>
<div>

| 元素 | 用途 |
|---|---|
| visual | 显示；visual origin 是 mesh 相对 link frame 的放置方式 |
| collision | 碰撞检测；常可用更简单 mesh 降低计算量 |
| inertial | 动力学属性；本次不展开 inertia 计算 |

A2D 的 Link6_l visual/collision 引用同一 STL。相反，`gripper_center` 无 mesh 仍有 frame 语义；meshless link 也可用于 TCP、传感器 frame 或虚拟中间结构。

<div class="placeholder-line">待补：Link6_l frame 与 STL；gripper_center frame</div>

</div>
</div>

---

<div class="eyebrow">11 · Three information layers</div>

# URDF Joint、运行时 Joint 与 TF Transform 不是同一层

<div class="three-col">
<div>

## URDF Joint · 静态

- parent / child
- origin position + orientation
- axis / type / limit
- 规定结构和允许的运动

</div>
<div>

## 运行时 Joint · 动态

- position `q`
- 可选 velocity / effort
- 常见一自由度 joint 的 position 通常是一个标量

</div>
<div>

## TF Transform · 计算结果

- parent frame → child frame
- translation + rotation
- 带 timestamp，随 joint state 更新

</div>
</div>

<div class="doc-grid images-2" style="margin-top:18px">
<img class="doc-image short" src="./assets/source/a2d-tf-message-body.png" alt="base_link 附近 TFMessage">
<img class="doc-image short" src="./assets/source/a2d-tf-message-arm.png" alt="Link5_l 到 Link6_l TFMessage">
</div>

<div class="doc-note">更准确的链路：URDF origin/axis/type + 当前 q → FK → TF transform → End Pose。截图中的 TFMessage 不是 URDF joint 原始定义。</div>

---

<div class="eyebrow">12 · Transform</div>

# 齐次变换与单 Joint 变换

<div class="doc-grid">
<div>

一个 pose 可写为 4×4 齐次变换：

$$T=\begin{bmatrix}R&p\\0&1\end{bmatrix}$$

- `R`：3×3 rotation matrix，表示姿态
- `p`：3×1 position，表示位置
- 多个相邻 frame 的旋转和平移可用矩阵乘法连续组合

正文不推导齐次坐标；只需理解 FK 为什么不断做 4×4 multiplication。

</div>
<div>

$$T_{parent\rightarrow child}(q)=T_{origin}T_{motion}(q)$$

| Joint type | 变换 |
|---|---|
| fixed | $T=T_{origin}$ |
| revolute / continuous | $T=T_{origin}R(axis,q)$ |
| prismatic | $T=T_{origin}Trans(axis\cdot q)$ |

revolute/continuous 的 q 通常为 rad；prismatic 通常为 m。fixed joint 虽无 q，但可能包含关键 origin，不能从 chain 删除。`origin` 在前、`motion` 在后，顺序不可交换。

</div>
</div>

<div class="placeholder-line">待补：齐次矩阵示意；动画“先应用 origin，再应用 joint motion”（8–12 秒）</div>

---

<div class="eyebrow">13 · Forward kinematics</div>

# FK：从单位矩阵开始，沿 base → end 有序累积

<div class="doc-grid wide-right">
<div>

```text
base_link → shoulder → elbow → wrist → reference end
```

$$T_{base\rightarrow end}=T_1T_2\cdots T_n$$

每一步：

```text
base_to_child = base_to_parent @ parent_to_child
```

矩阵有方向和顺序，不能交换。若得到 `end→base`，需要求逆。最终 position 来自 `T[:3,3]`，rotation matrix 再转输出 quaternion。

<div class="placeholder-line">动画：坐标架沿 A2D 左臂逐级累积（10–15 秒）</div>

</div>
<div>

```python
def forward_kinematics(chain, joint_values):
    T = identity_transform()
    for joint in chain:
        T = T @ origin_transform(
            joint.origin_xyz, joint.origin_rpy)

        if joint.type in {"revolute", "continuous"}:
            T = T @ rotation_transform(
                joint.axis, joint_values[joint.name])
        elif joint.type == "prismatic":
            T = T @ translation_transform(
                joint.axis * joint_values[joint.name])

    return T[:3, 3], matrix_to_quaternion(T[:3, :3])
```

正文不展开 Rodrigues 与 `matrix_to_quaternion` 的内部推导。

</div>
</div>

---

<div class="eyebrow">14 · FK engineering</div>

# FK 的输入、Action / State / TCP 与批量 H5

<div class="three-col">
<div>

## 静态输入 · 解析一次

- 有序 kinematic chain
- parent / child / origin / axis / type
- base link / reference end
- H5 channel → URDF joint mapping
- 可预计算的 origin transform

</div>
<div>

## 动态输入与输出

每帧输入：Action 或 State joint position + timestamp。

输出：

```text
position:    [x, y, z]
orientation: [x, y, z, w]
```

```python
action_end = fk(chain, action_q)
state_end  = fk(chain, state_q)
tcp_end    = compose(state_end, tcp_offset)
```

</div>
<div>

## 批量 H5

```text
N frames × J joints
→ N frames × end pose
```

- 不要每帧解析 URDF
- 缓存 chain / origin transform
- 批量构造 rotation / translation matrix
- NumPy 向量化
- 多 end 复用共享中间 transform
- 减少小对象重复分配

单帧复杂度约 O(J)。先保证语义和结果正确，再优化。

</div>
</div>

<div class="placeholder-line">待补：URDF/Config + H5 Joint → Batch FK → End Pose 流程图</div>

---

<div class="eyebrow">15 · URDF tree / TF tree</div>

# URDF Tree 是模型；TF Tree 是运行时 Frame 世界

<div class="doc-grid wide-right">
<div>

| URDF Tree | TF Tree |
|---|---|
| link/joint 拓扑 | 所有 frame 的连接关系 |
| 主要来自 URDF XML | 来自 URDF、FK、传感器和程序 |
| 不含每帧实时姿态 | transform 随时间更新 |
| 通常描述机器人本体 | 可含 world、camera、TCP、verify end |

A2D TF Tree 包含 `world`、`base_link`、各级 link、TCP、verify action/state end。额外 end frame 不一定在原始 URDF，可由程序计算后发布。TF 必须维持树状父子关系；循环或多父节点会破坏解析。

</div>
<div>
<img class="doc-image tree" src="./assets/source/a2d-tf-tree-full.png" alt="A2D 完整 TF Tree">
<img class="doc-image tree-list" src="./assets/source/a2d-tf-tree-left-chain.png" alt="A2D 左臂 TF 层级">
</div>
</div>

<div class="small">演示顺序：先看完整规模 → 放大 world→base_link → 追踪左臂 chain → 指出 TCP 与 verify end；不要缩小整图后要求听众读全部标签。</div>

---

<div class="eyebrow">16 · Platform pipeline</div>

# 公司中的高层处理与配置流程

<div class="pipeline-row">
  <div><strong>ROS / MCAP / H5</strong><br>Action/State Joint<br>厂商 Raw End</div>
  <span>→</span>
  <div><strong>语义归一化</strong><br>frame / endpoint<br>mapping / timestamp</div>
  <span>→</span>
  <div><strong>URDF / Config + FK</strong><br>Verify Action/State<br>Reference → TCP</div>
  <span>→</span>
  <div><strong>统一输出</strong><br>H5 / 报告<br>Foxglove</div>
</div>

<div class="doc-grid micro" style="margin-top:18px">
<div>

## 数据规则

- Raw End 先确认 frame / endpoint，再转换到 `base_link`。
- Action/State joint 用同一 FK 模块分别算 verify end。
- Reference End 叠加 fixed offset 得 TCP End。
- H5、质量报告和 Foxglove 都应使用明确统一的 Pose 语义。
- 可提 `h5_tf_exporter` / `hpc_executor`，正文不展开模块和完整 schema。

</div>
<div>

## 配置角色

| 配置 | 作用 |
|---|---|
| `robot.yaml` | URDF、base_link、joint limit、H5 channel→URDF joint mapping |
| `end_config.yaml` | Raw / Verify / TCP 计算、raw frame、reference end、TCP offset |

离线：URDF + 样例 H5 → 模板 → 人工补全 → MCAP/报告 → Foxglove 校验 → 发布配置。

生产：读取配置/H5 → 归一化与 FK → 写回 End → 统计校验 → 交付数据。

</div>
</div>

---

<div class="eyebrow">17 · Validation</div>

# FK 与 End Pose 的校验方法和常见错误

<div class="doc-grid wide-left">
<div>

## 开发阶段

1. **Zero pose**：可动 joint 全为 0，与 URDF 查看器比较。
2. **Single joint**：一次只动一个 joint，检查 child chain 和 axis。
3. **Fixed joint**：确认固定 offset / rotation 未丢失。
4. **Reference implementation**：与 Foxglove、已验证 FK 库或参考程序对比。

## 数据阶段

1. 先对齐 timestamp、endpoint、reference frame。
2. 叠加 Raw End 与 Verify End。
3. 比较 position 与 orientation 差异。
4. 检查轨迹连续性与异常跳变。

固定偏差多提示 frame、endpoint、offset 或 URDF 定义差异；抖动/跳变可能来自时间、数据、传感器、mapping 或通信。

</div>
<div>

| 问题 | 常见表现 |
|---|---|
| 矩阵顺序错误 | 整体位置姿态异常 |
| 忽略 origin rotation | axis 方向错误 |
| axis 所在 frame 错 | child 沿错误方向运动 |
| 遗漏 fixed joint | 固定位置/姿态偏差 |
| joint mapping 错 | link 跟随错误 joint |
| 正负方向错 | 关节反向运动 |
| degree/radian | 旋转幅度异常 |
| mm/m | 放大或缩小 1000 倍 |
| base/end 求反 | 得到 end→base |
| xyzw/wxyz | orientation 异常 |
| Action/State 未对齐 | 动态错位 |
| endpoint 不同 | Raw/Verify 固定偏差 |

</div>
</div>

<div class="placeholder-line">待补：固定系统性偏差 vs 随机抖动/跳变示意</div>

---

<div class="eyebrow">18 · Foxglove demo</div>

# 演示顺序、备用方案与核心结论

<div class="doc-grid wide-right">
<div>

## 2 分钟演示

1. A2D 整体模型与 RGB frame。
2. TF Tree：从 `base_link` 追踪到左臂末端。
3. Action End 与 State End。
4. Reference End 与 TCP。
5. 时间允许：DWHEEL Raw End 与 Verify End。

优先用预录 MP4/WebM 或已定位 MCAP 时间段；提前加载 Foxglove layout 和数据，不现场寻找 topic。所有动画必须有静态截图或 PDF 备用。

<div class="placeholder-box"><strong>Foxglove / MCAP 演示区</strong><br>后续替换为脱敏视频或已定位数据；完整 MCAP 不提交公开仓库。</div>

</div>
<div>

## 四个结论

1. Pose 只有在 endpoint、frame、timestamp 明确时才完整。
2. Action/State 是目标/实际；Raw/FK 是来源；Reference/TCP 是末端语义。
3. URDF 定义静态结构，运行时 joint 提供 q，FK 计算 TF 和 End Pose。
4. FK 公式不复杂；工程正确性取决于 mapping、单位、坐标系、方向与时间对齐。

## 开发时的第一原则

> 先确认“这条数据描述的是什么”，再检查数值是否正确。

</div>
</div>

<!-- 正文到此结束；以下附录不计入 30 分钟。 -->

---
class: appendix-slide
---

<div class="eyebrow">APPENDIX A · 公式与误差</div>

# Raw 归一化、TCP Offset 与 Raw/Verify 误差

<div class="three-col">
<div>

## Raw 坐标归一化

$$T_{base\rightarrow end}=T_{base\rightarrow vendor}T_{vendor\rightarrow end}$$

校验前先确认厂商 pose 是 `vendor→end`，而不是 `end→vendor`。

</div>
<div>

## TCP Offset

$$T_{base\rightarrow tcp}=T_{base\rightarrow reference}T_{reference\rightarrow tcp}$$

前者来自 State FK；后者来自 URDF fixed joint 或人工标定。

</div>
<div>

## 误差指标

$$e_p=\lVert p_{raw}-p_{verify}\rVert$$

$$e_q=2\arccos\left(\left|q_{raw}\cdot q_{verify}\right|\right)$$

绝对值用于处理 `q/-q` 等价；指标只在 endpoint、frame、timestamp 一致后有效。

</div>
</div>

<div class="doc-note">除均值外还应观察分位数、最大值、异常区间和随时间的变化；Raw/Verify 不一致不必然等于 FK 错误。</div>

---
class: appendix-slide compact-table
---

<div class="eyebrow">APPENDIX B · 实现与术语</div>

# 单帧/批量 FK 与术语速查

<div class="doc-grid wide-right">
<div>

## 单帧与基础批量实现

```text
J 个 joint value → 一个 end pose
时间复杂度约 O(J)
```

```python
poses = [
    forward_kinematics(chain, frame)
    for frame in joint_frames
]
```

后续优化：缓存 chain；预计算 origin；批量构造矩阵；NumPy 向量化；复用共享中间 transform；避免每帧解析 URDF 和重复分配小对象。

</div>
<div>

| 术语 | 简要定义 |
|---|---|
| Pose / Frame | 位姿；以及表达它的坐标系 |
| Link / Joint | 刚体及 frame；连接与运动关系 |
| Joint position | 运行时运动量，旋转通常 rad、平移通常 m |
| Transform / TF Tree | 两 frame 间平移旋转；运行时树状关系 |
| FK | 模型 + joint position → end pose |
| Action / State | 控制指令 / 传感器实际状态 |
| Raw / Verify End | 厂商直接提供 / joint+URDF 计算的诊断位姿 |
| Reference End / TCP | 选定 link/custom frame / 真实工具操作点 |

</div>
</div>

---
class: appendix-slide materials-slide
---

<div class="eyebrow">APPENDIX C · 素材与维护</div>

# 素材清单、后续数据与 Slidev 维护约束

<div class="three-col micro">
<div>

## 已有素材

- `A2D.urdf`：完整模型
- side/top frames：封面、XYZ/frame
- TF tree full/left chain：总览与局部
- TF message body/arm：translation、rotation、quaternion、RPY
- 图片 217 全透明，未加入有效展示

## 待补图片

`endpoints-reference-tcp.png`、`pose-semantics.svg`、`a2d-frames-clean.png`、`orientation-representations.svg`、`a2d-left-chain.svg`、`link6-mesh-frame.png`、`gripper-center-frame.png`、`homogeneous-transform.svg`、`batch-fk-pipeline.svg`、`error-patterns.svg`

</div>
<div>

## 待补动画 / 视频

- frame comparison：8–12 s
- Action/State End：8–12 s
- DWHEEL Raw/Verify：8–12 s
- A2D chain highlight：6–10 s
- joint6 motion：6–10 s
- origin then motion：8–12 s
- FK chain：10–15 s

## 后续数据

脱敏短 MCAP 或录屏；DWHEEL Raw/Verify 片段；Action/State 差异明显但正常的片段；Link6_l 单 joint 数据。完整 MCAP 不默认提交公开仓库。

</div>
<div>

## Slidev 约束

- 16:9 深色、与 Foxglove 一致
- 单一 `slides.md` + 全局 CSS
- 内置 layout、Markdown、本地图片/视频、KaTeX；必要时 Mermaid / v-click
- 无第三方主题、插件、自定义 Vue
- 无在线字体、CDN、远程媒体
- 动画优先预录，其次静态 SVG / v-click
- 颜色：XYZ 红绿蓝；Action/Raw 黄橙；State/Verify 青；TCP 紫
- HTML 正式演示；PDF 离线备用
- 文档型版本允许更高单页密度；长代码仍应拆分或高亮

</div>
</div>
