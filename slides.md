---
theme: default
title: URDF、FK 与 End
titleTemplate: '%s · 位姿与 URDF 入门'
author: kscii
class: cover-business
info: |
  面向数采训练场团队开发人员的内部技术科普。
  阅读版：按 URDF、FK、End 三个模块组织，使用真实 URDF 片段、H5 截图和代码讲解。
colorSchema: dark
transition: fade-out
exportFilename: pose-urdf-intro
mdc: true
---

<div class="doc-series">URDF · FK · END</div>

# URDF、FK 与 End

<div class="cover-summary">
从 A2D 的机器人结构文件、H5 中的关节数据和 End 结果出发，说明如何计算、理解和检查末端位姿。
</div>

<!--
urdf是基础框架，end是目标数据，fk是方法，是实现从现有框架到目标数据的数学工具
-->

<div class="stage-flow cover-flow">
  <div class="stage-node stage-input is-active">
    <span>INPUT</span>
    <strong>URDF + joint q</strong>
    <small>静态框架 + 当前状态</small>
  </div>
  <b>→</b>
  <div class="stage-node stage-method is-active">
    <span>METHOD</span>
    <strong>FK</strong>
    <small>沿运动链累积变换</small>
  </div>
  <b>→</b>
  <div class="stage-node stage-output is-active">
    <span>OUTPUT</span>
    <strong>End Pose</strong>
    <small>position + orientation</small>
  </div>
</div>

<!--
这个教程会分为三部分urdf, 正运动学, 还有末端位姿

- urdf部分主要会介绍什么是urdf, 以及urdf中的一系列元素的含义

- fk也就是正运动学部分会介绍什么是fk, 如何使用fk计算出末端位姿

- end pose也就是末端位姿部分, 主要会说明什么是末端位姿, 末端位姿的字段和种类, 以及几种常见的坐标系
-->

---
class: module-divider
---

<div class="module-kicker">MODULE 01</div>

# URDF

<div class="module-summary">
URDF 回答“机器人结构是什么”：有哪些 link，joint 如何连接，每个 joint 的固定安装位置、旋转轴和运动类型是什么。
</div>

<div class="stage-flow divider-flow">
  <div class="stage-node stage-input is-active"><span>INPUT</span><strong>URDF + joint q</strong></div>
  <b>→</b>
  <div class="stage-node stage-method"><span>METHOD</span><strong>FK</strong></div>
  <b>→</b>
  <div class="stage-node stage-output"><span>OUTPUT</span><strong>End Pose</strong></div>
</div>

<!--
- 首先是urdf部分

- URDF 文件描述了机器人的连杆与关节结构、几何模型、关节约束，以及质量和惯性等运动学与动力学信息。

-  这部分我们会展开讲解一下.
-->

---
class: compact-business a2d-full-structure-slide
---

<div class="doc-section">00 · A2D 完整结构</div>

# A2D：从底盘 base_link 到 effector 的完整链路

<div class="doc-columns equal">
<div>

## 先看整体，再看代码

**URDF（Unified Robot Description Format）** 是 ROS 生态中描述机器人模型的 XML 格式。它把机器人拆成两类核心元素：

| 元素 | 直觉 | 在结构中的角色 |
|---|---|---|
| `link` | 一个刚体部件及其坐标 frame | 树上的节点 |
| `joint` | 连接两个 link 的关节 | 从 parent 指向 child 的边 |

主体结构可以理解为不断重复的：

```text
link → joint → link → joint → link
```

在 A2D 中，链路从底盘的 `base_link` 出发，经过身体、机械臂安装点和左臂各级 link，最终到达 `gripper_center`。

<div class="takeaway"><strong>关键：</strong>link 不独立声明“自己在哪里”。它相对 parent link 的位置与朝向，由连接两者的 joint 决定。</div>

</div>
<div>

<div class="a2d-full-grid">
  <img src="./assets/source/a2d-foxglove-side-frames.png" alt="A2D 侧视完整 frame 结构">
  <img src="./assets/source/a2d-foxglove-top-frames.png" alt="A2D 俯视完整 frame 结构">
</div>
<div class="image-note">左：侧视图。右：俯视图。两张图都展示了从底盘到末端的 link-joint-link 连接关系。</div>

</div>
</div>

<!--
- 念一下左侧urdf的定义

- URDF 主要通过两类核心元素描述机器人的结构：link 和 joint。其中，link 表示机器人中的刚体部件，每个 link 都有自己的参考坐标系。其视觉模型、碰撞模型和惯性参数等信息，均相对于相应的 link 坐标系进行描述

- joint 表示关节，用于描述父连杆 parent link 与子连杆 child link 之间的固定变换关系，以及二者允许的相对运动类型和方向。joint 的 origin 元素描述关节坐标系在父连杆坐标系下的位姿。关节变量为零时，子连杆坐标系与关节坐标系重合；从装配角度看，origin 可以理解为该关节或子连杆在父连杆上的安装位置和安装方向。

- joint也就是关节, 实际上就是描述两个link之间的变换关系, 以及link和link之间如何运动. 而每个joint的child_link的坐标系的来源就是joint的origin元素. 从视觉效果来看, joint的这个origin实际上就是其子连杆在父连杆上的安装位置

- 有关joint要特别说明一下，通常urdf中一个joint只能基于一个坐标轴作为轴线来运动。所以在urdf中如果想表达一个两个部件之间的关节可以朝多个方向旋转（多自由度），就需要设置两个在坐标上完全重合的joint, 以及中间的一个虚拟的link. 以a2d的肩膀关节为例，这里就是2自由度，因此这里在urdf中定义了两个joint, 它们之间的距离为0, 完全重合。
-->

---
class: lecture-slide urdf-pair-overview-slide
---

<div class="doc-section">01 · 一组真实 Link + Joint</div>

# 一段 URDF，如何同时读 Link 与 Joint

<div class="doc-columns urdf-overview-columns">
<div>

```xml
<!-- 教学摘录；完整 link 子字段见后页 -->
<link name="Link5_l" />

<link name="Link6_l">
  <inertial><!-- origin / mass / inertia --></inertial>
  <visual><!-- origin / geometry / material --></visual>
  <collision><!-- origin / geometry --></collision>
</link>

<joint name="left_arm_joint6" type="revolute">
  <origin xyz="0 0 0"
          rpy="-1.5708 0 3.1416" />
  <parent link="Link5_l" />
  <child link="Link6_l" />
  <axis xyz="0 0 -1" />
  <limit lower="-2.35619449" upper="2.35619449"
         effort="30" velocity="3.14" />
</joint>
```

</div>
<div>

## 先认八个核心字段，再逐页展开

<div class="urdf-read-cards">
  <div>
    <span class="card-kicker">1 · LINK <em>第 5–6 页详解</em></span>
    <strong>描述 link 自身</strong>
    <ul class="field-map">
      <li><code>inertial</code>：质量、质心与惯性等物理属性</li>
      <li><code>visual</code>：机器人显示出来的外观</li>
      <li><code>collision</code>：用于碰撞检测的几何模型</li>
    </ul>
  </div>
  <div>
    <span class="card-kicker">2 · JOINT <em>第 7 页详解</em></span>
    <strong>描述连接、安装与运动约束</strong>
    <ul class="field-map">
      <li><code>origin</code>：joint 相对 parent link 的固定安装位姿</li>
      <li><code>parent / child</code>：连接哪两个 link，以及连接方向</li>
      <li><code>axis</code>：关节旋转或平移的运动轴</li>
      <li><code>limit</code>：运动范围、速度与力矩等约束</li>
    </ul>
  </div>
</div>

</div>
</div>

<!--
这里讲一下urdf中有哪些元素

- 首先是在link元素下面有inertial元素, 这里描述了link的一些物理上的属性
- 然后是visual, 这里定义了在可视化中的模型信息
- collision 定义了用于碰撞检测的几何模型

- 然后是joint, 这里具体的元素我后续会详细展开, 这里可以大概说一下.
-->

---
class: lecture-slide link-inertial-slide
---

<div class="doc-section">02 · Link 的惯性字段</div>

# `inertial`：质量、质心与惯性张量

<div class="doc-columns equal">
<div class="fk-output-code">

```xml
<link name="Link6_l">
  <inertial>
    <origin
      xyz="2.2696E-06 -0.10227 -0.0029117"
      rpy="0 0 0" />
    <mass value="0.17825" />
    <inertia
      ixx="0.00013761"
      ixy="5.1473E-09"
      ixz="6.9927E-09"
      iyy="8.0777E-05"
      iyz="2.0192E-05"
      izz="0.00012814" />
  </inertial>
  <!-- visual / collision 见下一页 -->
</link>
```

</div>
<div>

| 字段 | 含义 | 常用单位 |
|---|---|---|
| `link name` | link 的唯一名称，也对应 frame 名 | — |
| `inertial/origin xyz` | 质心相对 link frame 的位置 | m |
| `inertial/origin rpy` | 惯性参考系相对 link frame 的姿态 | rad |
| `mass value` | link 的质量 | kg |
| `ixx...izz` | 3×3 对称惯性张量的 6 个独立分量 | kg·m² |

```text
I = [[ixx, ixy, ixz],
     [ixy, iyy, iyz],
     [ixz, iyz, izz]]
```

<div class="scope-note"><strong>边界：</strong>这些字段用于动力学和物理仿真。只计算几何位姿的 FK 不读取质量或惯性张量。</div>

</div>
</div>

<!--
我这里介绍一些inertial下面的几个元素.
- 首先是origin, 这里的origin和joint的origin不一样, 这里是指的是这个link的质心相对其坐标系的的位置偏移 (画图举个例子)
- 然后是mass也就是link的质量
- 最后就是inertia, 表示惯性张量，是一个3*3的对称矩阵，用于描述刚体的质量分布以及它对旋转运动的抵抗程度。该参数主要用于动力学而不是今天的运动学计算，这里不再展开。
-->

---
class: lecture-slide link-geometry-slide
---

<div class="doc-section">03 · Link 的可视与碰撞字段</div>

# `visual` 与 `collision`：同一 link 的两套几何语义

<div class="doc-columns equal">
<div>

```xml
<visual>
  <origin xyz="0 0 0" rpy="0 0 0" />
  <geometry>
    <mesh filename="./meshes/Link6_l.STL" />
  </geometry>
  <material name="">
    <color rgba="0.75294 0.75294 0.75294 1" />
  </material>
</visual>
```

| 字段 | 含义 |
|---|---|
| `origin` | visual 几何体相对 link frame 的变换 |
| `geometry/mesh` | 要加载的网格文件 |
| `material/color rgba` | 红、绿、蓝、透明度 |

</div>
<div>

```xml
<collision>
  <origin xyz="0 0 0" rpy="0 0 0" />
  <geometry>
    <mesh filename="./meshes/Link6_l.STL" />
  </geometry>
</collision>
```

| 字段 | 含义 |
|---|---|
| `origin` | collision 几何体相对 link frame 的变换 |
| `geometry/mesh` | 碰撞检测使用的网格文件 |

<div class="takeaway"><strong>A2D 当前情况：</strong>两者引用同一个 STL；职责仍不同。实际项目也常让 collision 使用更简单的几何体以降低计算量。</div>

</div>
</div>

<!--
这里讲一下visual和collision下面的元素
- 首先visual和collision都是origin和mesh元素, 其中origin表示三维模型文件相对link的坐标系原点的位姿, 而mesh元素定义了这个关节的stl也就是三维模型文件的路径.
- 要注意的是虽然这里的visual和collision的mesh文件是一致的, 但是通常为了降低碰撞的计算量, 有时候collision的mesh会使用简化后的简单集合形状
- 后就是color元素, 这里定义了rgb和透明度的四个值
-->

---
class: lecture-slide joint-fields-slide
---

<div class="doc-section">04 · Joint 的完整字段</div>

# `left_arm_joint6`：结构、运动方式与约束

<div class="doc-columns code-wide">
<div>

```xml
<joint name="left_arm_joint6" type="revolute">
  <origin xyz="0 0 0"
          rpy="-1.5708 0 3.1416" />
  <parent link="Link5_l" />
  <child link="Link6_l" />
  <axis xyz="0 0 -1" />
  <limit
    lower="-2.35619449"
    upper="2.35619449"
    effort="30"
    velocity="3.14" />
</joint>
```

</div>
<div>

| 字段 | 含义 |
|---|---|
| `name` | joint 的唯一名称，也是关节数据映射键 |
| `type` | 此处为有限位旋转关节 `revolute` |
| `origin` | joint zero frame 相对 `Link5_l` 的固定安装变换 |
| `parent / child` | 连接方向：`Link5_l → Link6_l` |
| `axis` | 在 joint frame 中表达的运动轴，此处为负 Z |
| `lower / upper` | 位置范围；旋转关节单位为 rad |
| `effort / velocity` | revolute 常用 N·m / rad·s⁻¹，prismatic 常用 N / m·s⁻¹；不直接进入基础 FK |

## 常见 type

| `fixed` | `revolute` | `continuous` | `prismatic` |
|---|---|---|---|
| 固定 | 有限旋转 | 连续旋转 | 有限平移 |

</div>
</div>

<!--
这里开始讲解joint的几个字段
-->

---
class: lecture-slide urdf-origin-slide
---

<div class="doc-section">05 · 静态 URDF 与动态 q</div>

# URDF 定义“怎么动”，关节值决定“动了多少”

<div class="doc-columns equal">
<div>

```xml
<joint name="left_arm_joint6" type="revolute">
  <origin xyz="0 0 0"
          rpy="-1.5708 0 3.1416"/>
  <parent link="Link5_l"/>
  <child link="Link6_l"/>
  <axis xyz="0 0 -1"/>
</joint>
```

```python
# 固定安装变换 + 当前关节旋转
T_motion_6 = rotation_transform(
    axis=[0, 0, -1], theta=q6)
T_Link5_l_Link6_l = T_origin_6 @ T_motion_6
```

</div>
<div>

## 两层信息要分开

| 来源 | 内容 | 是否随时间变化 |
|---|---|---|
| URDF `origin` | 固定安装位置和固定姿态 | 否 |
| URDF `axis/type` | 允许运动的方式 | 否 |
| H5 / rosbag joint position | 当前关节变量 `q6` | 是 |
| FK 输出 | 当前 parent→child transform | 是 |

`axis="0 0 -1"` 表示运行时绕 joint zero frame 的负 Z 轴旋转。真正转了多少，是每一帧的 `q6` 决定的。

</div>
</div>

---
class: lecture-slide h5-joint-input-slide
---

<div class="doc-section">06 · 静态结构与动态数据会合</div>

# 通过 joint mapping，把 URDF 与当前帧 q 接起来

<div class="doc-columns code-wide">
<div>

```yaml
# 资料文档.md 中的 H5 通道示例
h5:
  position_dataset: position

mappings:
  - group: arm
    h5: joints/state/arm
    idx: 5
    name: idx18_left_arm_joint6
    transform: {type: direct, clamp: true}
    targets: [idx18_left_arm_joint6]
```

<div class="scope-note"><code>idx: 5</code> 是零基索引，即 <code>position</code> 的第 6 列；A2D URDF 中对应的规范 joint 名为 <code>left_arm_joint6</code>。</div>

</div>
<div>

```python
# t 表示当前采样时刻
q6 = h5["joints/state/arm/position"][t, 5]

# 经过构型映射，对接 A2D.urdf 的 joint name
joint_values["left_arm_joint6"] = q6
T_motion_6 = rotation_transform(
    axis=[0, 0, -1], theta=q6)
```

| 输入 | 提供什么 | 是否随 t 变化 |
|---|---|---|
| `A2D.urdf` | chain、origin、axis、type | 否 |
| H5 `position[t, 5]` | 当前关节角 `q6` | 是 |

- revolute / continuous 的 `q` 使用 rad。
- prismatic 的 `q` 使用 m。
- URDF 定义“怎么动”，H5 记录“这一帧动了多少”。

<div class="takeaway"><strong>输入已经齐了：</strong><code>URDF 静态结构 + joint_values[t]</code>。FK 会使用这些输入计算 End Pose。</div>

</div>
</div>

---
class: lecture-slide urdf-chain-slide
---

<div class="doc-section">07 · Chain 与语义 Frame</div>

# 从 URDF Tree 里取出一条 End Chain

<div class="doc-columns code-wide">
<div>

```xml
<joint name="Joint_hand_l" type="fixed">
  <origin xyz="0 0 0" rpy="0 0 0"/>
  <parent link="Link7_l"/>
  <child link="left_base_link"/>
</joint>

<!-- 语义末端：夹爪中心 -->
<link name="gripper_center"/>
<joint name="gripper_center_joint" type="fixed">
  <origin rpy="0 0 -1.57079632679"
          xyz="0.0 0.0 0.23"/>
  <parent link="left_base_link"/>
  <child link="gripper_center"/>
</joint>
```

</div>
<div>

## End 往往是语义 frame

```text
base_link
→ ...
→ Link7_l
→ left_base_link
→ gripper_center
```

`gripper_center` 没有 mesh 也没关系。它是一个为了表达业务需要而存在的 frame：告诉我们“夹爪中心”相对手部 base link 的固定位置和方向。

<div class="takeaway"><strong>关键点：</strong>URDF 不只是可视化模型。对 FK 来说，它更像一张可遍历的结构图，每条边给出一段固定变换或可动变换。</div>

</div>
</div>

---
class: lecture-slide urdf-tf-half-slide
---

<div class="doc-section">08 · URDF 与 TF</div>

# URDF 是静态定义，TF 是运行时结果

<div class="doc-columns equal">
<div>

## 两者职责不同

| 对比项 | URDF | TF |
|---|---|---|
| 内容 | link/joint 结构 | frame 间实时 transform |
| 时间 | 静态文件 | 带 timestamp |
| 输入 | XML 中的 origin、axis、type | URDF + 当前 joint values |
| 用途 | 提供结构约束 | 展示某一时刻的空间关系 |

`left_arm_joint6` 在 URDF 中只说明结构；TF message 中出现的 translation 和 rotation 是某个时间点计算后的结果。

<div class="handoff"><strong>URDF 模块交接：</strong>静态结构与当前关节值已经齐备；下一步沿 base→end chain 开始 FK 计算。</div>

</div>
<div>

<div class="tf-pair">
  <img src="./assets/source/a2d-tf-message-body.png" alt="A2D body TF message">
  <img src="./assets/source/a2d-tf-message-arm.png" alt="A2D arm TF message">
</div>
<div class="image-note">TF message 适合用来确认 parent/child、timestamp、translation 和 quaternion 是否符合预期。</div>

</div>
</div>

---
class: module-divider
---

<div class="module-kicker">MODULE 02</div>

# FK

<div class="module-summary">
FK 回答“给定一组关节值，末端在哪里”：它把关节空间中的角度或位移，映射成笛卡尔空间中的 End Pose。
</div>

<div class="stage-flow divider-flow">
  <div class="stage-node stage-input"><span>INPUT</span><strong>URDF + joint q</strong></div>
  <b>→</b>
  <div class="stage-node stage-method is-active"><span>METHOD</span><strong>FK</strong></div>
  <b>→</b>
  <div class="stage-node stage-output"><span>OUTPUT</span><strong>End Pose</strong></div>
</div>

---
class: lecture-slide kinematics-slide
---

<div class="doc-section">01 · 机器人运动学</div>

# 什么是机器人运动学？

<div class="definition"><strong>通用定义</strong>　机器人运动学研究机器人几何结构、关节运动与末端执行器在空间中的位置和姿态之间的关系，而不考虑引起运动的力或力矩。</div>

<div class="doc-columns equal">
<div>

## 两个空间

| 空间 | 在数据中的样子 |
|---|---|
| 关节空间 Joint Space | H5 / rosbag 中的关节角度或位移 |
| 笛卡尔空间 Cartesian Space | End 的 `position` 和 `orientation` |

正运动学就是从关节空间到笛卡尔空间的映射：给机器人一组关节状态，计算它的“手”会伸到哪里、朝向哪里。

</div>
<div>

## 两个基本问题

| 对比维度 | 正运动学 FK | 逆运动学 IK |
|---|---|---|
| 输入 | 各个关节变量 | 末端目标位姿 |
| 输出 | 末端位置和姿态 | 各个关节变量 |
| 复杂度 | 按链路累乘，相对直接 | 可能无解、多解或无穷解 |
| 用途 | 状态计算、轨迹仿真、数据校验 | 路径规划、任务控制 |

</div>
</div>

<div class="takeaway"><strong>本文主线：</strong><code>joint_values + URDF chain → End Pose</code>。IK 只作为对比概念，不展开求解算法。</div>

<!--
- 正运动学fk就是使用关节角度值和urdf的定义求当前关节角会达到的末端位姿, 正运动学是可以求出唯一解的
- 逆运动学ik就是使用末端位姿和urdf的定义求可以达到当前末端位姿需要的每个关节的关节角. 这里没有唯一解
- 我们这里主要使用的是正运动学
-->

---
class: lecture-slide matrix-slide code-matrix-slide
---

<div class="doc-section">02 · 齐次变换</div>

# 齐次变换矩阵：用代码读懂一个 4×4

<div class="notation-rule"><code>T_A_B</code> 统一表示“<strong>B frame 在 A frame 下的位姿</strong>”。因此可组合为 <code>T_A_C = T_A_B @ T_B_C</code>；变量中的 <code>base</code> 是 <code>base_link</code> 的简称。</div>

<div class="doc-columns code-wide">
<div>

```python
T = np.array([
    # 左上 3x3 是旋转，右侧一列是位置
    [r00, r01, r02, px],
    [r10, r11, r12, py],
    [r20, r21, r22, pz],
    [0.0, 0.0, 0.0, 1.0],
])
```

| 区域 | 代码切片 | 含义 |
|---|---|---|
| 左上 3×3 | `T[:3, :3]` | 旋转矩阵 `R`，表示当前 frame 的朝向 |
| 右侧 3×1 | `T[:3, 3]` | 坐标 `p`，表示当前 frame 原点在哪里 |
| 最后一行 | `T[3, :]` | 齐次矩阵的固定补位 |

</div>
<div>

## 为什么用 `@`

```python
T_base_Link6_l = (
    T_base_Link5_l @ T_Link5_l_Link6_l)
T_base_gripper_center = (
    T_base_Link6_l @ T_Link6_l_gripper_center)

position = T_base_gripper_center[:3, 3]
rotation = T_base_gripper_center[:3, :3]
orientation_xyzw = rotation_matrix_to_quaternion(rotation)
```

矩阵乘法的顺序表达了 frame 的方向：左边是已经累计到 base 的结果，右边是下一段 parent→child 变换。

</div>
</div>

<!--
这里讲一下fk的计算方式, 首先对于urdf中两个link之间的变换关系, 可以使用一个齐次变换矩阵来表达, 结构是一个4*4的矩阵
- 矩阵中的左上角的3*3其实就是旋转矩阵, 可以从我们h5里面的四元数或者rpy值来转换得到
- 右侧的1*3的部分就是坐标, 也就是xyz

- 这些变换矩阵可以直接使用矩阵成分相乘, 其中成分的左侧就是过去从baselink开始一级一级乘上来的总的变换, 然后右边是现在要乘上去的最新的一级变换(可以参考这里的代码)
-->

---
class: lecture-slide dh-code-slide
---

<div class="doc-section">03 · DH 参数</div>

# DH 与 URDF：两种建模语言，同一种连乘思想

<div class="doc-columns code-wide">
<div>

Denavit-Hartenberg 参数法用四个参数描述相邻连杆坐标系之间的关系。

| DH 参数 | 含义 | 描述 |
|---|---|---|
| `a` | 连杆长度 | 两个相邻关节轴线之间的公法线距离 |
| `alpha` | 连杆扭角 | 两个相邻关节轴线之间的夹角 |
| `d` | 连杆偏移 | 沿关节轴线的距离 |
| `theta` | 关节角度 | 绕关节轴线的旋转角度 |

DH 和 URDF-FK 的共同点：每一段生成一个 4×4 变换矩阵，然后按顺序连乘。区别是每一段的参数从哪里来。

</div>
<div>

```python
import numpy as np

def dh_transform(a, alpha, d, theta):
    # 先缓存三角函数，矩阵里会重复使用
    ct = np.cos(theta)
    st = np.sin(theta)
    ca = np.cos(alpha)
    sa = np.sin(alpha)

    return np.array([
        [ct, -st * ca,  st * sa, a * ct],
        [st,  ct * ca, -ct * sa, a * st],
        [0,        sa,       ca,      d],
        [0,         0,        0,      1],
    ])

T_base_end = T1 @ T2 @ T3
```

</div>
</div>

<div class="takeaway"><strong>本教程的取舍：</strong>DH 用来建立“逐段建模再连乘”的直觉；A2D 主线仍直接解析 URDF，不把现有模型重新改写成 DH 参数表。</div>

<!--
这里是构造一个变换矩阵的方法, 实际上这些参数都可以使用urdf中的定义计算获取
-->

---
class: lecture-slide urdf-transform-example-slide
---

<div class="doc-section">04 · 可动关节的 Motion</div>

# 由当前关节值 q 构造 motion，再与 origin 相乘

<div class="doc-columns code-wide">
<div>

回到贯穿示例 `left_arm_joint6`：

| 变换 | 来源 | 含义 |
|---|---|---|
| `T_origin_6` | URDF `origin` | 零位时的固定安装变换 |
| `T_motion_6(q6)` | `revolute + axis + q6` | 当前帧绕负 Z 轴的旋转 |

```python
q6 = joint_values["left_arm_joint6"]

T_origin_6 = origin_transform(
    xyz=[0, 0, 0],
    rpy=[-1.5708, 0, 3.1416],
)
T_motion_6 = rotation_transform(
    axis=[0, 0, -1], theta=q6)

T_Link5_l_Link6_l = T_origin_6 @ T_motion_6
```

</div>
<div>

```python
# 把这一段接到前面已经累计的结果后面
T_base_Link6_l = (
    T_base_Link5_l @ T_Link5_l_Link6_l)
```

## 其他 type 只改变 `T_motion`

| type | 当前运动变换 |
|---|---|
| `fixed` | `I`，没有运行时 q |
| `revolute / continuous` | `R(axis, q)`，q 单位 rad |
| `prismatic` | `Trans(axis × q)`，q 单位 m |

<div class="takeaway"><strong>顺序固定：</strong>先应用安装变换，再应用 joint 自己的运动：<code>T_parent_child = T_origin @ T_motion(q)</code>。</div>

</div>
</div>

<!--
- 讲一下一个可动关节的自由度变换其实包含两部分，也就是origin变换和motion变换
- origin变换就是urdf中定义的当前link相比上一个link的固定变换，这个固定变换使用urdf中的origin中的xyz和rpy字段。这个变换是固定不变的
- motion变换代表的就是这个关节本身的旋转或者平移，会随着关节角或者平移距离的变化而变化。可以使用urdf中定义的关节类型信息，以及h5里面的关节角信息或者平移量信息来计算。构造一个随着时间变化的变换矩阵
- 对于每个非固定关节，都需要在origin的变换矩阵的基础上乘上motion的变换矩阵。具体如图所示
-->

---
class: lecture-slide fk-tree-slide
---

<div class="doc-section">05 · FK Tree</div>

# FK Tree：从 base_link 一层一层走到 End

<div class="tf-tree-full-image">
  <img src="./assets/source/a2d-tf-tree-full.png" alt="A2D TF tree full">
</div>

<div class="takeaway"><strong>计算方向：</strong>从 <code>base_link</code> 出发，按 parent → child 的路径一段一段乘到 <code>gripper_center</code>，得到 <code>T_base_gripper_center</code>。</div>

<!--
- 使用fk tree讲解，实际在人形机器人上，link和link之间通常是一个树型关系
- 对于每个要被计算出来的end pose, 都需要按照这里的顺序从baselink开始一层一层进行矩阵乘法来乘上去。最终得到的就是在baselink坐标系下的end的 pose
-->

---
class: lecture-slide fk-algorithm-slide
---

<div class="doc-section">06 · FK 算法</div>

# 沿 base → end 的运动链累积变换

<div class="doc-columns code-wide">
<div>

```text
base_link
→ ...
→ Link6_l
→ Link7_l
→ left_base_link
→ gripper_center                              
```

## 计算步骤

1. 从单位矩阵 `np.eye(4)` 开始。
2. 按 base→end 的有序 chain 遍历 joint。
3. 为每个 joint 生成 `T_parent_child`。
4. 每步执行 `T_base_current = T_base_current @ T_parent_child`。
5. 返回最终的 `T_base_end`。

</div>
<div>

```python
def forward_kinematics(chain, joint_values):
    T_base_current = np.eye(4)
    for joint in chain:
        T_parent_child = origin_transform(
            joint.origin_xyz, joint.origin_rpy)

        if joint.type in {"revolute", "continuous"}:
            q = joint_values[joint.name]
            T_parent_child = T_parent_child @ rotation_transform(
                joint.axis, q)
        elif joint.type == "prismatic":
            q = joint_values[joint.name]
            T_parent_child = T_parent_child @ translation_transform(
                joint.axis * q)

        T_base_current = T_base_current @ T_parent_child

    return T_base_current  # T_base_end
```

</div>
</div>

<!--
- 这里讲一下fk的实际算法, 核心就是从base开始, 沿着urdf里面的chain一段一段往end乘
- 每一段joint都会先生成一个parent到child的变换矩阵, 这个矩阵里面同时包含旋转和平移两种情况
- 可以结合前面那张tf tree图讲, 从base_link开始, 顺着树上的parent child关系一层一层往目标end走

- 旋转的计算方法比较简单, 如果是固定安装的旋转, 就用urdf里面origin的rpy转成旋转矩阵
- 如果是revolute或者continuous关节, 就拿当前这一帧的关节角q, 绕urdf里面axis写的轴转q这么多
- 所以旋转不是直接加角度, 而是每一段都先变成旋转矩阵, 然后跟前面累计的旋转矩阵相乘

- 平移的计算方法也比较简单, 固定安装的平移就是urdf里面origin的xyz
- 如果是prismatic关节, 就沿着axis方向移动q这么多, 也就是axis乘上q
- 这里需要注意, 本地坐标系里的平移会被前面已经累计出来的旋转带着一起转过去, 所以不能只把所有xyz简单相加

- 最后乘完以后, T右边这一列就是end的位置, T左上角3*3就是end的朝向
- 这两个合起来, 就是end在base_link坐标系下面的pose
- 最后再提醒一下, 真正容易错的是joint名称和顺序, 单位和正负号, 还有end和frame是不是同一个定义
-->

---
class: lecture-slide fk-output-slide
---

<div class="doc-section">07 · 从矩阵得到几何结果</div>

# `T_base_gripper_center` → position + orientation

<div class="doc-columns code-wide">
<div>

```python
t = sample_index
joint_values = read_joint_values(h5, t)

T_base_gripper_center = forward_kinematics(
    chain=urdf.chain(
        "base_link", "gripper_center"),
joint_values=joint_values,
)

position = T_base_gripper_center[:3, 3]
orientation_xyzw = rotation_matrix_to_quaternion(
T_base_gripper_center[:3, :3])
```

</div>
<div class="fk-output-summary">

<div class="fk-output-result-card">

| FK 已确定 | 来源 |
|---|---|
| `position` | 最终矩阵右侧 3×1，单位 m |
| `orientation` | 最终矩阵左上 3×3 转 quaternion `xyzw` |
| 起点与终点 | chain 为 `base_link → gripper_center` |
| 采样索引 | 当前输入使用 `joint_values[t]` |

</div>
<div class="fk-output-contract-card">

## 还不是完整的数据契约

FK 已经给出几何结果，但还需要把以下语义显式写入 End 数据：

- `reference_link / reference_frame`
- `timestamp`
- Action / State、Raw / Verify、TCP 等分类                                  

</div>
</div>
</div>

<div class="takeaway fk-output-handoff"><strong>FK 模块交接：</strong>数学计算已经完成；下一模块把 position 和 orientation 组织成一条可保存、可比较的 End Pose。</div>

---
class: module-divider
---

<div class="module-kicker">MODULE 03</div>

# End

<div class="module-summary">
上一模块已经由 FK 得到 position 和 orientation；End 继续回答“描述哪个末端点、相对哪个坐标系、在什么时刻、用什么格式表达”。
</div>

<div class="stage-flow divider-flow">
  <div class="stage-node stage-input"><span>INPUT</span><strong>URDF + joint q</strong></div>
  <b>→</b>
  <div class="stage-node stage-method"><span>METHOD</span><strong>FK</strong></div>
  <b>→</b>
  <div class="stage-node stage-output is-active"><span>OUTPUT</span><strong>End Pose</strong></div>
</div>

<!--
需要说明end下的position和oritation的具体含义，特别是oritation”朝向“这个含义，必须讲解的清楚。
-->

---
class: compact-business end-contract-slide
---

<div class="doc-section">01 · End 数据契约</div>

# 一条可使用的 End Pose 必须说明什么

<div class="doc-columns equal">
<div>

| 字段 | 含义 |
|---|---|
| `reference_link` | 这个 End 对应的 URDF 结构中的 link，例如 `gripper_center` |
| `reference_frame` | 这个点相对谁表达，例如 `base_link`、world 或 vendor frame |
| `timestamp` | 对应哪个采样、指令或计算时刻 |
| `position` | 末端点在参考坐标系中的位置，通常是 `[x, y, z]` |
| `orientation` | 末端坐标系相对参考坐标系的朝向，H5/ROS 常用 quaternion |

## orientation 的三种表达

| 表达 | 使用场景 | 例子 |
|---|---|---|
| Quaternion | H5 内部保存 | `[0, 0, 0.7071, 0.7071]` |
| Rotation Matrix | FK 计算 | `T[:3, :3]` |
| RPY | 人类阅读 / URDF | `[0, 0, 1.5708]` |

三种表达描述同一个朝向，可以互相转换；比较 End 前要确认 orientation 约定一致。

</div>
<div>

<img class="inline-business-image h5-end-image" src="./assets/source/一个有end的h5的结构的例子（normalize）.png" alt="normalize 后 H5 中 End 结构示例">
<div class="image-note">normalize 后的 H5 中，Action/State 下会出现多个 End 候选组；字段名和 group 层级本身就是数据契约的一部分。</div>

</div>
</div>

<!--
- 简单说一下目前end在h5中保存的结构
- end pose主要由position也就是xyz, 还有orientation构成
- 其中orientation有三种表达方法
- 另外除了坐标和姿态, 一个end pose还需要包含reference_link和reference_frame(目前我们预期的归一化后的坐标系应该都是baselink, 所以这里不用标)
-->

---
class: compact-business axis-color-slide
---

<div class="doc-section">02 · 坐标轴颜色</div>

# XYZ 坐标轴颜色约定

<div class="doc-columns equal">
<div>

<div class="axis-contract">
  <span class="axis-x">X · 红色</span>
  <span class="axis-y">Y · 绿色</span>
  <span class="axis-z">Z · 蓝色</span>
</div>

| 颜色 | 坐标轴 | 说明 |
|---|---|---|
| 红色 | X | frame 自己的 X 方向 |
| 绿色 | Y | frame 自己的 Y 方向 |
| 蓝色 | Z | frame 自己的 Z 方向 |

颜色只是 Foxglove / RViz 等工具的常见显示约定。真正重要的是：每个 link 或末端 frame 都有自己的 XYZ 轴，方向会随着对应 link 一起运动。

</div>
<div>

<img class="inline-business-image axis-color-image" src="./assets/source/单独只有一个关节的图片，可以用于解释坐标轴的颜色.png" alt="单关节 XYZ 坐标轴颜色示例">
<div class="image-note">红、绿、蓝分别表示 X、Y、Z。屏幕方向不等于坐标轴方向，要以 frame 定义为准。</div>

</div>
</div>

<!--
简单说一下三种颜色
-->

---
class: compact-business world-frame-slide
---

<div class="doc-section">03 · world 与 base_link</div>

# 只区分两类：base_link 坐标系与 world 坐标系

<div class="doc-columns equal">
<div>

| 坐标系 | 含义 |
|---|---|
| `base_link` | 固定在机器人本体上的运动学根 frame。手臂 FK 通常先计算末端相对 `base_link` 的位姿。 |
| `world` | 外部参考系。它可以由地面、脚底/底盘接地点、基站、第三方相机或标定板定义。 |

URDF 只告诉我们 `base_link` 和各 link/joint 的关系；它不会自动给出外部世界。要使用 `world`，必须额外说明 `world → base_link` 的来源。

</div>
<div>

<div class="world-image-grid">
  <img src="./assets/source/基于地面的世界坐标系的例子，具体内容看文档.png" alt="基于地面的世界坐标系示例">
  <img src="./assets/source/基于基站或者第三方摄像头获取的世界坐标系，具体内容看文档.png" alt="基于基站或第三方摄像头的世界坐标系示例">
</div>
<div class="image-note">这两张图都是 world 的可能来源：左侧来自地面/接地点，右侧来自基站或第三方相机。</div>

</div>
</div>

<!--
简单说一下目前我们有使用到两种坐标系
- baselink坐标系就是基于在urdf中定义的baselink这个部件的坐标系, baselink对于轮臂机器人来说通常在底盘. 对于有双腿的机器人baselink通常在身体中央
- baselink的优势(容易获取end pose)
- 世界坐标系就是一个独立于机器人urdf结构的一个第三方的坐标系
- 世界坐标系的优势(在后续采集需要机器人本体移动的数据的时候, 可以保证目标相对坐标系静止, 只有机器人在运动. 并且就算是在机器人静止的数采任务下, 也可以避免机器人本体的抖动对目标相对坐标系的抖动) (还有就是如果可以采集到多个机器人在统一的一个世界坐标系下的end pose, 就可以采集多个机器人共同处理一个任务的数据)
- 世界坐标系的问题(世界坐标系下的end pose会比较难以获取, 可靠的世界坐标系下的数据通常需要额外的硬件)
- 简单介绍两种常见的获取世界坐标系的方案,(第一类依赖准确的urdf结构以及机器人腿部的关节数据, 使用地面作为世界坐标系)(第二类需要外部设备, 摄像头, 第三方基站)
-->

---
class: compact-business raw-end-mismatch-slide
---

<div class="doc-section">04 · Raw End 校验</div>

# DWHEEL：为什么 Raw End 需要统一坐标系

<div class="doc-columns equal">
<div>

部分构型的厂商 Raw End 并不是相对统一的 `base_link` 表达。DWHEEL 是一个例子：厂商给出的两个手的 Raw End 坐标系定义在两侧肩膀附近，而不是地盘上的 `base_link`。

| 检查项 | DWHEEL 例子 | 处理原则 |
|---|---|---|
| reference frame | 左/右肩膀附近 frame | 先归一化到统一 `base_link` |
| endpoint | 厂商控制系统定义 | 对齐到明确的手部/工具点 |
| 是否可比较 | 不能直接与 FK End 比较 | 先校验语义，再比较数值 |

这页的重点不是 DWHEEL 本身，而是说明 Raw End 进入数据流程后不能直接信任：坐标系、endpoint 和姿态约定都需要被校验。

</div>
<div>

<img class="inline-business-image dwheel-frame-image" src="./assets/source/dwheel的baselink的定义和我们的定义不一致.png" alt="DWHEEL Raw End 坐标系定义不一致示例">
<div class="image-note">DWHEEL 的厂商 Raw End 使用肩部附近参考系；统一处理时需要回到地盘 <code>base_link</code> 或明确记录其真实 frame。</div>

</div>
</div>

<!--
这里是一个坐标系定义我我们不一致的例子
- dhweel的坐标系使用的不是baselink, 因此如果我们把它提供的raw_end数据当作baselink坐标系下的数据使用, 就会出现这样的错位.
- 因此对于这种情况, 必须要搞清楚厂商对于他们底层数采返回的raw_end数据的坐标系定义是什么.
-->

---
class: compact-business end-types-slide
---

<div class="doc-section">05 · End 类型</div>

# Action End、State End、Raw End 与 Verify End

<div class="doc-columns equal">
<div>

| 名称 | 含义 |
|---|---|
| Action End | 控制指令对应的目标末端位姿 |
| State End | 实际关节反馈对应的末端位姿 |
| Raw End | 厂商或外部系统直接给出的末端位姿 |
| Verify End | 上一模块已经用 joint values + URDF/FK 计算出的末端位姿 |
| TCP End | 在 reference end 基础上叠加固定标定偏移后的工具中心点 |

这些名字不是五个物理末端，而是从“数据来源、时间语义、endpoint 语义”三个维度组合出来的结果。

</div>
<div>

<img class="inline-business-image action-state-image" src="./assets/source/展示action_end和state_end的图片，说明了action_end和state_end在运动的时候通常会有一定错位.png" alt="Action End 与 State End 的运动错位示例">
<div class="image-note">Action/State 在运动中可能因为控制延迟或 timestamp 未对齐而错位。</div>

<div class="takeaway"><strong>比较原则：</strong>Raw 与 Verify 不一致，不等于 FK 一定错。先确认 endpoint、frame、timestamp、单位和 quaternion 顺序。</div>

</div>
</div>

<!--
讲解目前会保存在h5中的几种end
- 这里实际保存的其实是raw verify tcp, action和 state只是分类
- 通常action 和state end会在关节运动的时候出现一些偏移, 这是正常情况
-->

---
class: compact-business lecture-slide tcp-end-slide
---

<div class="doc-section">06 · TCP End</div>

# TCP End：从参考末端到真实工具点

<div class="doc-columns equal">
<div>

```python
# 参考末端：上一模块已由 FK 计算
T_base_reference = forward_kinematics(
    chain, state_joint_values)

# TCP：叠加固定标定偏移
T_base_tcp = (
    T_base_reference @ T_reference_tcp)
```

| 变换 | 含义 |
|---|---|
| `T_base_reference` | FK 算出的参考末端，例如 `left_base_link` |
| `T_reference_tcp` | 标定得到的固定偏移 |
| `T_base_tcp` | 真实工具中心点相对 `base_link` 的位姿 |

<div class="scope-note"><strong>约定与边界：</strong>人形机器人领域尚无完全统一的 <code>tcp_end</code> 定义；这里从明确的 reference end 叠加固定标定偏移。TCP 误差还可能来自工具安装、夹爪几何与标定，不能全部归因于 FK。</div>

<div class="handoff"><strong>End 模块收束：</strong>几何结果已经补齐 link、frame、timestamp 和 endpoint 语义，可以用于保存、比较和下游任务。</div>

</div>
<div>

<img class="inline-business-image tcp-image" src="./assets/source/用于讲解tcp_end的图片，说明了tcp_end的一种标定方式为从effector的baselink平移变换得到.png" alt="TCP End 标定方式示意">
<div class="image-note">示例：TCP 可以由 effector 的 base link 经过固定平移/旋转得到。</div>

</div>
</div>

<!--
tcp end就是 tool control end, 代表夹爪实际抓握时和物体接触的位置, 通常就在夹爪的中心, 我这里的图片可能有点问题.
- 这个概念过去主要被应用于工业机械臂领域, 因此可以比较好的被使用在夹爪上, 但是对于灵巧手, 目前没有行业统一的对tcp的定义.
- 对于夹爪, 计算方式其实就是设定一个固定的相对夹爪的baselink(通常就是最后一个手腕的link)的坐标系的一个变换, 这里的变换通常只需要沿着一个轴线平移. 然后就可以获得tcp end
-->

---
class: conclusion-slide
---

<div class="doc-section">SUMMARY · 完整逻辑链</div>

# 从已有机器人数据，到可使用的 End Pose

<div class="stage-flow final-flow">
  <div class="stage-node stage-input is-active">
    <span>INPUT</span>
    <strong>URDF + joint q</strong>
    <small>结构来自 A2D.urdf<br>状态来自 H5 当前帧</small>
  </div>
  <b>→</b>
  <div class="stage-node stage-method is-active">
    <span>METHOD</span>
    <strong>FK</strong>
    <small>逐 joint 构造变换<br>沿 base → end 连乘</small>
  </div>
  <b>→</b>
  <div class="stage-node stage-output is-active">
    <span>OUTPUT</span>
    <strong>End Pose</strong>
    <small>明确 link、frame、时间<br>position + orientation</small>
  </div>
</div>

<div class="summary-statements">
  <div><strong>URDF 是基础框架</strong><span>定义 link、joint、origin、axis 与 type。</span></div>
  <div><strong>关节角是当前状态</strong><span>同一套结构在每个时刻对应不同的 q。</span></div>
  <div><strong>FK 是数学工具</strong><span>把静态结构和动态 q 变成 4×4 累积变换。</span></div>
  <div><strong>End Pose 是目标数据</strong><span>最终用于保存、比较、验证和下游任务。</span></div>
</div>

<div class="handoff final-handoff"><strong>一句话复述：</strong>从 URDF 取结构、从 H5 取当前关节角，用 FK 计算出指定 frame 下的 End Pose。</div>
