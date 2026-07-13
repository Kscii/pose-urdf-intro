---
theme: default
title: 从 Joint 到 End Pose
titleTemplate: '%s · 位姿与 URDF 入门'
author: kscii
info: |
  面向数采训练场平台开发团队的 30 分钟入门分享。
  正文与演示收束 27 页，附录 6 页。
colorSchema: dark
transition: fade-out
exportFilename: pose-urdf-intro
mdc: true
---

<div class="eyebrow">Pose · Frame · URDF · FK</div>

# 从 Joint 到 End Pose

<div class="subtitle">
数采平台中的坐标系、URDF 与位姿解算
</div>

<div class="muted" style="margin-top:34px;width:52%;font-size:19px">
一个末端位姿究竟表示哪个点、相对谁、从哪里来？
</div>

<!--
30 秒。直接从问题进入主题；不要求听众具有 ROS 或机器人学基础。
整篇使用 A2D 解释 URDF、TF 和 FK。
-->

---

<div class="eyebrow">01 · Why</div>

# 为什么平台需要末端位姿？

<div class="two-col wide-left">
<div>

<div class="lead">末端位姿描述一个操作点：<strong>在哪里、朝向哪里、相对谁</strong>。</div>

- 表达动作目标和实际状态
- 为训练数据提供统一的操作语义
- 校验厂商数据、URDF 与 joint mapping
- 在 Foxglove 中重建、回放和排查动作

</div>
<div class="media-placeholder">
  <div><strong>待补：A2D 左手局部</strong>手腕 reference frame、夹爪中心与 TCP<br><span class="tiny">assets/final/endpoints-reference-tcp.png</span></div>
</div>
</div>

<!--
1 分钟。末端不一定是最后一个看得见的零件，也可以是夹爪中心、工具尖端或相机光心。
平台关心的是带明确语义、参考坐标系和时间的 pose。
-->

---

<div class="eyebrow">02 · Pose semantics</div>

# 一条 Pose，至少要回答五个问题

<div class="semantic-line">
  <div><span class="label">Endpoint</span><span class="value">描述哪个点？</span></div>
  <div><span class="label">Reference frame</span><span class="value">相对谁？</span></div>
  <div><span class="label">Timestamp</span><span class="value">哪个时刻？</span></div>
</div>

<div class="two-col" style="margin-top:34px">
<div>

## Position

末端在哪里：`[x, y, z]`

</div>
<div>

## Orientation

末端朝向哪里：`RPY / R / q`

</div>
</div>

> 数值格式正确，不代表语义能够直接比较。

<!--
1 分 20 秒。单独给出 xyz 没有完整意义。Raw 与 Verify 比较前，也必须保证 endpoint、frame、timestamp 一致。
-->

---

<div class="eyebrow">03 · Coordinate frame</div>

# 看到坐标轴，先记住颜色约定

<div class="axis-row">
  <div class="axis-item x-axis">X · 红色</div>
  <div class="axis-item y-axis">Y · 绿色</div>
  <div class="axis-item z-axis">Z · 蓝色</div>
</div>

<div class="two-col">
<img class="image-frame" style="max-height:280px" src="./assets/source/a2d-foxglove-side-frames.png" alt="A2D 侧视坐标轴">
<img class="image-frame" style="max-height:280px" src="./assets/source/a2d-foxglove-top-frames.png" alt="A2D 俯视坐标轴">
</div>

<div class="small muted" style="margin-top:12px">这是 Foxglove、RViz 等工具的常见约定，不是数学强制要求；坐标轴会随对应 link 一起运动。</div>

<!--
1 分 10 秒。不同 frame 的轴方向可以完全不同，不能把屏幕方向当成坐标轴方向。
不要简单说“红色就是 roll”；roll/pitch/yaw 与轴的关系依赖所采用的旋转约定。
-->

---

<div class="eyebrow">04 · Reference frame</div>

# 公司数据中常见的三类坐标系

| 坐标系 | 表达什么 | 优势 | 使用时注意 |
|---|---|---|---|
| `world` | 场地或全局参考 | 跨机器人、跨时刻比较方便 | 依赖定位或外部标定 |
| `base_link` | 机器人本体基准 | 与 URDF、FK 天然衔接，稳定易复现 | 机器人移动时不代表世界固定位置 |
| 厂商自定义 frame | 厂商控制器或传感器参考 | 可直接使用原始话题 | 必须确认定义、方向和到 `base_link` 的变换 |

<div class="quote-big" style="margin-top:30px;font-size:28px">
平台内部优先把语义归一到 <code>base_link</code>；跨机器人或场景任务再使用 <code>world</code>。
</div>

<!--
1 分 20 秒。这里原先的 baseline 是笔误，统一为 base_link。
强调没有绝对“最好”的 frame，选择取决于是否要跨机器人、跨时刻和跨场景比较。
-->

---

<div class="eyebrow">05 · Orientation</div>

# 姿态的三种表达方式

| 表达 | 长度 | 适合 | 主要风险 |
|---|---:|---|---|
| RPY / Euler | 3 | 人读、配置、调试 | 旋转顺序歧义、万向节锁 |
| Rotation matrix | 9 | 计算与连续变换 | 冗余，需保持正交 |
| Quaternion | 4 | 存储、传输、插值 | 不直观；顺序可能是 `xyzw` 或 `wxyz` |

<div class="semantic-line">
  <div><span class="label">可读</span><span class="value">RPY</span></div>
  <div><span class="label">计算</span><span class="value">Matrix</span></div>
  <div><span class="label">传输</span><span class="value">Quaternion</span></div>
</div>

<div class="small muted">同一个姿态可以在三种表示之间转换；比较数据前先确认 RPY 顺序、角度单位和 quaternion 分量顺序。</div>

<!--
1 分 20 秒。少讲公式，只说明工程取舍。四元数 q 和 -q 表示同一个旋转。
-->

---

<div class="eyebrow">06 · Endpoint</div>

# “末端”不止一种：先拆开三组语义

<div class="semantic-line">
  <div><span class="label">目标还是实际</span><span class="value">Action / State</span></div>
  <div><span class="label">厂商还是自算</span><span class="value">Raw / FK</span></div>
  <div><span class="label">结构点还是工具点</span><span class="value">Reference / TCP</span></div>
</div>

<div class="flow">
  <div><strong>Joint 数据</strong><br><span class="small muted">Action 或 State</span></div>
  <div><strong>FK</strong><br><span class="small muted">沿运动链累积</span></div>
  <div><strong>Reference End</strong><br><span class="small muted">URDF 中的语义 frame</span></div>
  <div><strong>TCP End</strong><br><span class="small muted">叠加工具 offset</span></div>
</div>

<!--
1 分钟。这三组维度互相独立，例如可以有 verify action TCP end，也可以有 vendor raw state end。
不要用一个含糊的 end 字段承载全部语义。
-->

---

<div class="eyebrow">07 · Action vs State</div>

# Action End 与 State End：指令 ≠ 真实状态

<div class="two-col">
<div>

## Action End

- 输入：发出的 joint 指令
- 含义：系统希望机器人到达的位置与姿态
- 常用于动作目标、策略输出和指令检查

</div>
<div>

## State End

- 输入：传感器返回的真实 joint 状态
- 含义：机器人实际到达的位置与姿态
- 常用于训练标签、回放和执行误差分析

</div>
</div>

> 两者使用同一套 FK；差别首先来自输入数据，而不是算法。

<div class="media-placeholder compact">
  <div><strong>动画占位</strong>同一时间轴叠加 Action End 与 State End 轨迹</div>
</div>

<!--
1 分 20 秒。Action 就是发出的指令，State 就是传感器返回的真实信息，没有其他含义。
动态偏差可能来自控制滞后、机械误差、负载或时间对齐。
-->

---

<div class="eyebrow">08 · Raw vs Verify</div>

# Raw End 与 Verify End：数据来源不同

<div class="two-col wide-right">
<div>

## Raw End

厂商 ROS 话题或控制器直接提供的末端位姿。

## Verify / FK End

平台使用 joint 数据 + URDF 自行计算的末端位姿。

## 为什么两者都留？

互相校验 frame、joint mapping、URDF 和时间对齐。

</div>
<div class="media-placeholder">
  <div><strong>待补：DWHEEL 对比截图</strong>同一 frame、endpoint、timestamp 下叠加 Raw 与 Verify<br><span class="tiny">assets/final/raw-verify-overlay.png</span></div>
</div>
</div>

<div class="small muted">不一致不等于 FK 一定错误；先检查两条数据是否真的在描述同一件事。</div>

<!--
1 分钟。厂商没有 raw end 时，平台仍可通过 FK 得到 verify end。
-->

---

<div class="eyebrow">09 · URDF</div>

# URDF：机器人的“结构说明书”

<div class="two-col wide-left">
<div>

URDF 是 XML，主要描述：

- 有哪些刚体部件：`link`
- 部件如何连接和运动：`joint`
- 固定安装位姿：`origin xyz / rpy`
- 运动轴、类型和限制：`axis / type / limit`
- 显示、碰撞和惯性：`visual / collision / inertial`

> URDF 定义结构，不保存每一帧的实时关节角。

</div>
<div>
<img class="image-frame tall" src="./assets/source/a2d-foxglove-side-frames.png" alt="A2D 机器人">
<div class="small muted" style="margin-top:8px">本分享使用 <code>A2D.urdf</code> 贯穿结构、TF 和 FK。</div>
</div>
</div>

<!--
1 分钟。URDF 是 Unified Robot Description Format。本页只讲它回答“机器人由什么组成、怎样连接”。
-->

---

<div class="eyebrow">10 · Link and joint</div>

# Link、Joint 与一条运动链

<div class="chain">
  <span class="node">Link5_l</span><span class="joint">→</span>
  <span class="node">left_arm_joint6</span><span class="joint">→</span>
  <span class="node">Link6_l</span><span class="joint">→</span>
  <span class="node">left_arm_joint7</span><span class="joint">→</span>
  <span class="node">Link7_l</span><span class="joint">→</span>
  <span class="node">left_base_link</span><span class="joint">→</span>
  <span class="node">gripper_center</span>
</div>

<div class="two-col">
<div>

## Link

刚体部件，以及固定在该刚体上的坐标系。

</div>
<div>

## Joint

连接 parent link 与 child link，并规定允许的运动。

</div>
</div>

- 从 base 到 end 的有序路径叫 **kinematic chain**
- 完整 URDF 通常是一棵树，而 FK 只需取其中一条链

<!--
1 分 20 秒。中间 link 可以没有实体长度或 mesh。End 一般对应 link/custom frame，而不是 joint。
-->

---

<div class="eyebrow">11 · A real joint</div>

# 一个真实 URDF Joint 定义了什么？

<div class="two-col wide-left">
<div>

```xml
<joint name="left_arm_joint6" type="revolute">
  <origin xyz="0 0 0"
          rpy="-1.5708 0 3.1416"/>
  <parent link="Link5_l"/>
  <child link="Link6_l"/>
  <axis xyz="0 0 -1"/>
  <limit lower="-2.356" upper="2.356"
         effort="30" velocity="3.14"/>
</joint>
```

</div>
<div>

| 字段 | 含义 |
|---|---|
| parent / child | 连接的前后 link |
| origin | 固定安装位姿 |
| axis | 旋转或平移轴 |
| type | 运动类型 |
| limit | 位置、速度、力矩限制 |

<div class="small muted">`origin rpy` 不是当前 joint angle；运行时角度来自 Action/State joint position。</div>

</div>
</div>

<!--
1 分 30 秒。axis 0 0 -1 表示绕 joint frame 的负 Z 轴旋转。URDF 允许任意合法轴向量。
-->

---

<div class="eyebrow">12 · Mesh and STL</div>

# Mesh、STL 与 Link：形状不等于结构

<div class="two-col">
<div>

```xml
<link name="Link6_l">
  <visual>
    <geometry>
      <mesh filename="./meshes/Link6_l.STL"/>
    </geometry>
  </visual>
  <collision>
    <geometry>
      <mesh filename="./meshes/Link6_l.STL"/>
    </geometry>
  </collision>
</link>
```

</div>
<div>

<div class="quote-big" style="margin-top:18px;font-size:27px"><strong>URDF</strong>：结构、连接和坐标关系<br><br><strong>STL</strong>：零件的三角形表面</div>

- `visual`：显示
- `collision`：碰撞检测
- `inertial`：动力学属性

</div>
</div>

<!--
1 分 10 秒。STL 不知道 parent、child 或运动规则。visual origin 是 mesh 相对 link frame 的放置方式，不是 joint origin。
-->

---

<div class="eyebrow">13 · Meshless link</div>

# 没有 Mesh 的 Link，仍然很有意义

<div class="two-col wide-left">
<div>

```xml
<link name="gripper_center"/>

<joint name="gripper_center_joint" type="fixed">
  <origin xyz="0.0 0.0 0.23"
          rpy="0 0 -1.57079632679"/>
  <parent link="left_base_link"/>
  <child link="gripper_center"/>
</joint>
```

- 它没有 visual、collision 或 mesh
- 仍然是合法的 link / frame
- 可用作 reference end、TCP 或传感器 frame

</div>
<div class="media-placeholder">
  <div><strong>待补：gripper_center 可视化</strong>打开 frame 后显示在手部前方 0.23 m<br><span class="tiny">assets/final/gripper-center-frame.png</span></div>
</div>
</div>

<!--
50 秒。Link 的核心是刚体关系和 frame，不是必须看得见的零件。名字叫 gripper_center 也不自动等于业务 TCP。
-->

---

<div class="eyebrow">14 · Three layers</div>

# 不要把三层信息都叫“Joint 信息”

<div class="flow" style="grid-template-columns:repeat(3,1fr)">
  <div><strong>URDF Joint</strong><br><span class="small muted">origin · axis · type<br>parent · child · limit</span></div>
  <div><strong>运行时 Joint</strong><br><span class="small muted">position<br>可选 velocity / effort</span></div>
  <div><strong>TF Transform</strong><br><span class="small muted">translation + rotation<br>parent frame → child frame</span></div>
</div>

<div class="two-col" style="margin-top:26px">
<img class="image-frame" style="max-height:165px" src="./assets/source/a2d-tf-message-body.png" alt="躯干 TFMessage">
<img class="image-frame" style="max-height:165px" src="./assets/source/a2d-tf-message-arm.png" alt="手臂 TFMessage">
</div>

<div class="small muted" style="margin-top:10px">图中 TFMessage 是计算后的 frame 关系，不是 URDF joint 原始定义。</div>

<!--
1 分 20 秒。用户特别提出 position、orientation、axis，这里做精确纠正：URDF joint 有固定 origin 和 axis；运行时 joint 通常只有标量 q；FK 结果才是 translation + orientation。
-->

---

<div class="eyebrow">15 · Transform</div>

# 用一个 4×4 矩阵同时装下位置和姿态

<div class="two-col">
<div style="font-size:30px;padding-top:45px">

$$
T=
\begin{bmatrix}
R & p\\
0 & 1
\end{bmatrix}
$$

</div>
<div>

## `R` · Rotation matrix

3×3，表示姿态。

## `p` · Position

3×1，表示位置。

## 为什么要用 `T`？

相邻坐标系的旋转与平移，可以用矩阵乘法连续组合。

</div>
</div>

<div class="small muted">RPY 和 quaternion 可以先转换为 rotation matrix，最终结果也可以再转换回 quaternion。</div>

<!--
1 分 20 秒。不推导齐次坐标，只解释为什么 FK 代码会不断进行 4×4 matrix multiplication。
-->

---

<div class="eyebrow">16 · Joint transform</div>

# 单个 Joint = 固定安装 + 运行时运动

$$
T_{parent\rightarrow child}(q)=T_{origin}\,T_{motion}(q)
$$

| Joint type | 运行时变换 |
|---|---|
| `fixed` | $T=T_{origin}$ |
| `revolute / continuous` | $T=T_{origin}\,R(axis,q)$ |
| `prismatic` | $T=T_{origin}\,Trans(axis\cdot q)$ |

<div class="semantic-line" style="margin-top:24px">
  <div><span class="label">固定输入</span><span class="value">origin · axis · type</span></div>
  <div><span class="label">动态输入</span><span class="value">joint position q</span></div>
  <div><span class="label">输出</span><span class="value">parent → child</span></div>
</div>

<div class="small muted">`origin` 在前、`motion` 在后；矩阵乘法顺序不能交换。fixed joint 没有 q，但不能从 chain 中删除。</div>

<!--
1 分 30 秒。revolute 通常是 rad，prismatic 通常是 m；axis 在 joint frame 中表达。
-->

---

<div class="eyebrow">17 · Forward kinematics</div>

# FK：沿运动链逐级累积

<div class="chain">
  <span class="node">base_link</span><span class="joint">→</span>
  <span class="node">shoulder</span><span class="joint">→</span>
  <span class="node">elbow</span><span class="joint">→</span>
  <span class="node">wrist</span><span class="joint">→</span>
  <span class="node">reference end</span>
</div>

$$
T_{base\rightarrow end}=T_1T_2\cdots T_n
$$

<div class="two-col" style="margin-top:22px">
<div>

1. 从单位矩阵开始
2. 按 base → end 顺序遍历 joint
3. 先乘 origin，再乘 motion(q)
4. 最后一列得到 position
5. 最终 rotation matrix 转 quaternion

</div>
<div class="media-placeholder" style="min-height:170px">
  <div><strong>动画占位</strong>坐标架沿 A2D 左臂逐级传递<br><span class="tiny">assets/final/fk-chain.mp4</span></div>
</div>
</div>

<!--
1 分 20 秒。这里先给直觉，下一页再看实际代码。每一步都是 base_to_child = base_to_parent @ parent_to_child。
-->

---

<div class="eyebrow">18 · FK in code</div>

# 代码中，FK 的核心循环并不长

```python
def forward_kinematics(chain, joint_values):
    T = identity_transform()

    for joint in chain:
        T = T @ origin_transform(joint.origin_xyz,
                                 joint.origin_rpy)

        if joint.type in {"revolute", "continuous"}:
            T = T @ rotation_transform(
                joint.axis, joint_values[joint.name])
        elif joint.type == "prismatic":
            T = T @ translation_transform(
                joint.axis * joint_values[joint.name])

    position = T[:3, 3]
    orientation = matrix_to_quaternion(T[:3, :3])
    return position, orientation
```

<div class="small muted">公式不复杂；工程正确性更依赖 chain、mapping、单位、方向和时间。</div>

<!--
1 分 20 秒。矩阵乘法有方向和顺序。如果算成 end→base，需要求逆。正文不展开 Rodrigues 与 matrix_to_quaternion 的内部推导。
-->

---

<div class="eyebrow">19 · Engineering input</div>

# FK 真正需要准备的输入

<div class="two-col">
<div>

## 静态输入 · 只解析一次

- 有序 kinematic chain
- parent / child / origin / axis / type
- base link 与 reference end
- H5 channel → URDF joint mapping
- 可预计算的 origin transform

</div>
<div>

## 动态输入 · 每帧变化

- Action 或 State joint position
- timestamp

## 输出

- `position: [x, y, z]`
- `orientation: [x, y, z, w]`

</div>
</div>

```python
action_end = fk(chain, action_joint_values)
state_end  = fk(chain, state_joint_values)
tcp_end    = compose(state_end, tcp_offset)
```

<!--
1 分钟。强调同一 FK 模块分别接 Action 和 State；TCP 是在 reference end 上继续乘固定 offset。
-->

---

<div class="eyebrow">20 · Batch FK</div>

# 面向 H5 的批量 FK：算法相同，组织方式不同

<div class="flow" style="margin:24px 0">
  <div><strong>URDF + Config</strong><br><span class="small muted">chain · mapping · offset</span></div>
  <div><strong>N × J Joint</strong><br><span class="small muted">Action / State</span></div>
  <div><strong>Batch FK</strong><br><span class="small muted">复用静态结构</span></div>
  <div><strong>N × End Pose</strong><br><span class="small muted">position + quaternion</span></div>
</div>

## 第一版先保证正确，再做这些优化

<div class="small">

- 缓存有序 chain；避免每帧解析 URDF
- 预计算静态 origin transform
- NumPy 批量构造 rotation / translation matrix
- 多个 end 共享前半段 chain 时复用中间结果

</div>

<div class="small muted">单帧复杂度约为 O(J)；通常不是性能首先出问题，而是输入语义与 mapping。</div>

<!--
1 分 10 秒。这里只介绍优化方向，不展开 GPU FK 或复杂向量化实现。
-->

---

<div class="eyebrow">21 · URDF tree vs TF tree</div>

# URDF Tree 是模型；TF Tree 是运行时世界

<div class="two-col wide-right">
<div>

| URDF Tree | TF Tree |
|---|---|
| link / joint 拓扑 | 所有 frame 的连接关系 |
| 主要来自 XML | 来自 URDF、FK、传感器和程序 |
| 不含每帧实时姿态 | transform 随时间更新 |
| 主要描述机器人本体 | 可含 world、TCP、verify end |

</div>
<div>
<img class="image-frame full" src="./assets/source/a2d-tf-tree-full.png" alt="A2D 完整 TF Tree">
</div>
</div>

<div class="small muted">完整树用于看规模；现场再在 Foxglove 中放大 `world → base_link → 左臂 → end`。</div>

<!--
1 分 20 秒。额外 end frame 不一定存在于原始 URDF，可由程序计算后发布。TF Tree 不能出现循环或多父节点。
-->

---

<div class="eyebrow">22 · Data pipeline</div>

# 公司中的高层处理流程

<div class="flow">
  <div><strong>ROS / MCAP / H5</strong><br><span class="small muted">joint + raw end</span></div>
  <div><strong>语义归一化</strong><br><span class="small muted">frame · mapping · time</span></div>
  <div><strong>FK / TCP</strong><br><span class="small muted">verify action / state</span></div>
  <div><strong>统一输出</strong><br><span class="small muted">H5 · 报告 · Foxglove</span></div>
</div>

<div class="two-col" style="margin-top:35px">
<div>

## 厂商 Raw End

确认 endpoint 和 frame，转换到 `base_link`。

</div>
<div>

## Action / State Joint

通过同一 FK 模块分别计算 verify end，再按需叠加 TCP offset。

</div>
</div>

<!--
1 分钟。可提到 h5_tf_exporter 和 hpc_executor，但正文不展开 schema 或模块细节。
-->

---

<div class="eyebrow">23 · Validation</div>

# FK 与 End Pose 如何校验？

<div class="two-col">
<div>

## 开发阶段

1. **Zero pose**：所有可动 joint 设为 0
2. **Single joint**：一次只动一个 joint
3. **Fixed joint**：确认固定 offset/rotation 未丢失
4. **Reference**：与 Foxglove 或已验证实现对比

</div>
<div>

## 数据阶段

1. 对齐 timestamp、endpoint、reference frame
2. 叠加 Raw End 与 Verify End
3. 比较 position 和 orientation 差异
4. 检查轨迹连续性与异常跳变

</div>
</div>

<div class="media-placeholder compact">
  <div><strong>待补：误差模式示意</strong>固定偏差 vs. 随机抖动或跳变</div>
</div>

<!--
1 分 20 秒。固定偏差常提示 frame、endpoint、offset 或 URDF 差异；跳变常提示时间、数据、mapping 或通信问题。
-->

---

<div class="eyebrow">24 · Checklist</div>

# 开发 FK 时，优先检查这些问题

<ul class="checklist">
  <li>矩阵乘法顺序</li>
  <li>joint origin rotation</li>
  <li>axis 所在 frame</li>
  <li>fixed joint 是否遗漏</li>
  <li>joint mapping</li>
  <li>正负方向</li>
  <li>degree / radian</li>
  <li>mm / m</li>
  <li>base→end 是否求反</li>
  <li>quaternion 是 xyzw 还是 wxyz</li>
  <li>Action / State 时间对齐</li>
  <li>Raw / Verify endpoint 是否一致</li>
</ul>

<div class="quote-big" style="margin-top:30px;font-size:28px">公式通常不是最难的部分。<br><strong>语义、映射、单位、方向与时间</strong>决定工程结果是否可信。</div>

<!--
30 秒。快速展示排查顺序，不逐项解释。
-->

---

<div class="eyebrow">Demo · Foxglove</div>

# 最后用 Foxglove 把概念串起来

<div class="two-col wide-right">
<div>

1. A2D 整体模型与 RGB frame
2. TF Tree：`base_link → 左臂末端`
3. Action End 与 State End
4. Reference End 与 TCP
5. 可选：DWHEEL Raw 与 Verify

<div class="small muted" style="margin-top:24px">目标时长：2 分钟。现场动画由讲者后续补入；静态截图作为备用。</div>

</div>
<div class="media-placeholder" style="min-height:300px">
  <div><strong>Foxglove / MCAP 演示区</strong>预录 MP4、WebM 或已定位好的 MCAP 时间段<br><span class="tiny">assets/final/foxglove-demo.webm</span></div>
</div>
</div>

<!--
1 分 30 秒。提前加载 layout 和数据，不在现场临时寻找 topic。
如果演示条件不稳定，使用前面的静态截图完成讲解。
-->

---
layout: center
---

<div class="eyebrow">Takeaways</div>

# 四个结论

<div style="max-width:1050px;text-align:left;font-size:25px;line-height:1.5">

<p><span class="number">01</span>Pose 只有在 <strong>endpoint、frame、timestamp</strong> 明确时才有完整意义。</p>

<p><span class="number">02</span>Action/State、Raw/FK、Reference/TCP 是三组独立语义。</p>

<p><span class="number">03</span>URDF 定义结构，运行时 joint 提供 q，FK 计算 TF 与 End Pose。</p>

<p><span class="number">04</span>FK 的工程正确性主要依赖 mapping、单位、方向与时间对齐。</p>

</div>

<!--
40 秒。正文到此结束；以下为附录，不计入 30 分钟。
-->

---
class: appendix-slide
---

# 附录 A · Raw End 坐标系归一化

厂商提供：

$$T_{vendor\rightarrow end}$$

已知厂商 frame 相对 `base_link` 的变换：

$$T_{base\rightarrow vendor}$$

归一化到平台统一 frame：

$$
T_{base\rightarrow end}
=T_{base\rightarrow vendor}T_{vendor\rightarrow end}
$$

> 计算前必须确认厂商 pose 的方向是 `vendor → end`，而不是 `end → vendor`。

---
class: appendix-slide
---

# 附录 B · TCP Offset

$$
T_{base\rightarrow tcp}
=T_{base\rightarrow reference}T_{reference\rightarrow tcp}
$$

| 变换 | 来源 |
|---|---|
| $T_{base\rightarrow reference}$ | 通过 State FK 计算 |
| $T_{reference\rightarrow tcp}$ | URDF fixed joint 或人工标定 |
| $T_{base\rightarrow tcp}$ | 最终具有操作语义的 TCP pose |

<div class="media-placeholder" style="min-height:150px;margin-top:28px">
  <div><strong>待补动画</strong>Reference End 固定叠加 TCP Offset</div>
</div>

---
class: appendix-slide
---

# 附录 C · Raw 与 Verify 误差

<div class="two-col">
<div>

## 位置误差

$$
e_p=\lVert p_{raw}-p_{verify}\rVert
$$

</div>
<div>

## 姿态误差

$$
e_q=2\arccos\left(\left|q_{raw}\cdot q_{verify}\right|\right)
$$

</div>
</div>

- 使用绝对值，因为 `q` 与 `-q` 表示同一个旋转
- 指标只在 endpoint、frame 与 timestamp 一致后有意义
- 除均值外，建议观察分位数、最大值、异常段与时间趋势

---
class: appendix-slide
---

# 附录 D · 单帧与批量 FK

<div class="two-col">
<div>

## 单帧

```text
J 个 joint value
→ 一个 end pose
复杂度约 O(J)
```

```python
pose = forward_kinematics(chain, frame)
```

</div>
<div>

## 基础批量实现

```python
poses = [
    forward_kinematics(chain, frame)
    for frame in joint_frames
]
```

先保证每帧语义与结果正确，再向矩阵批处理演进。

</div>
</div>

---
class: appendix-slide
---

# 附录 E · 配置与生产流程

| 配置 | 高层作用 |
|---|---|
| `robot.yaml` | URDF、base_link、joint limit、H5 channel → URDF joint mapping |
| `end_config.yaml` | Raw、Verify、TCP 的计算方式、raw pose frame、reference end、TCP offset |

<div class="flow" style="grid-template-columns:repeat(3,1fr);margin-top:42px">
  <div><strong>离线准备</strong><br><span class="small muted">URDF + 样例 H5<br>生成配置模板</span></div>
  <div><strong>人工补全</strong><br><span class="small muted">frame · mapping<br>end · offset</span></div>
  <div><strong>生产执行</strong><br><span class="small muted">MCAP / H5<br>End Pose / 报告</span></div>
</div>

---
class: appendix-slide compact-table
---

# 附录 F · 术语速查

| 术语 | 本分享中的含义 |
|---|---|
| Pose | position + orientation，并带 endpoint/frame/time 语义 |
| Frame | 一套有原点和 XYZ 方向的坐标系 |
| Link | 刚体部件及其 frame |
| Joint | parent link 与 child link 之间的连接与运动规则 |
| TF | 指定时刻 parent frame 到 child frame 的变换 |
| FK | joint position → end pose 的正向运动学 |
| Reference End | 运动链计算到的结构或语义末端 |
| TCP | 真正执行操作的工具中心点 |
| Raw End | 厂商直接提供的末端位姿 |
| Verify End | 平台从 joint + URDF 自行计算的末端位姿 |

<div class="small muted" style="margin-top:18px">内容底稿、详细讲解提示和素材计划见 <code>CONTENT.md</code>。</div>
