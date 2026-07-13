---
theme: default
title: URDF 与末端位姿
titleTemplate: '%s · 位姿与 URDF 入门'
author: kscii
class: cover-business
info: |
  面向数采训练场平台开发团队的内部技术科普。
  30 分钟演示版：封面、17 页正文、3 页证据，共 21 页。
colorSchema: dark
transition: fade-out
exportFilename: pose-urdf-intro
mdc: true
---

<div class="doc-series">POSE · FRAME · URDF · TF · FK</div>

# URDF 与末端位姿


<div class="cover-summary">
本文以 A2D 构型为主要示例，说明平台如何从关节数据和机器人结构模型生成可解释、可校验的末端位姿。
</div>



<!--
本分享同时提供后续参与 FK 模块开发所需的最低技术基础。
A2D 用于解释 URDF、TF、FK 与候选 End；DWHEEL 用于说明语义不一致的 Raw End 为什么必须被排除。
-->

---

<div class="doc-section">01 · 业务背景</div>

# 末端位姿在业务中的作用

<div class="doc-columns equal">
<div>

## 当前问题

当前多构型数据采集与标准化流程中，End Pose 存在三类核心问题：

1. **完整性不足**：部分构型未提供 Raw End，最终 H5 中的 End 分组可能缺失。
2. **可信度不足**：厂商 Raw End 可能存在标定偏移、时间错位或数值异常，缺少自动化校验闭环。
3. **语义不统一**：不同构型的 reference frame、endpoint、单位和姿态约定可能不同，不能直接比较。

</div>
<div>

<img class="inline-business-image frame-convention-image" src="./assets/source/dwheel的baselink的定义和我们的定义不一致.png" alt="DWHEEL 的 base_link 定义与平台定义不一致示意">
<div class="image-note">示例：DWHEEL 构型中末端位姿使用的参考坐标系定义与平台默认 <code>base_link</code> 约定不一致。</div>

</div>
</div>

---

<div class="doc-section">02 · End Pose 处理链路</div>

# 从 H5 输入到统一 End Pose

<div class="business-flow">
  <div><span class="step">01</span><strong>H5 输入</strong><br>Action/State Joint<br>可选厂商 Raw End</div>
  <span>→</span>
  <div><span class="step">02</span><strong>normalize</strong><br>加载内置 bundle<br>计算 Raw/Verify/TCP<br>写入 candidates</div>
  <span>→</span>
  <div><span class="step">03</span><strong>collect / inspect</strong><br>按 ruleCode 采集指标<br>输出 collect JSON<br>CSV selector/range 判级</div>
  <span>→</span>
  <div><span class="step">04</span><strong>align / extract</strong><br>按 final_priority 选择<br>写入 final End<br>反解与交付</div>
</div>

<div class="doc-columns equal" style="margin-top:20px">
<div>

## 实际任务顺序

```text
normalize → collect → inspect → align → extract
```

`end_rule` 和 `limit_inspect_rule` 只有在 collect 请求显式包含对应 `ruleCode` 时执行；否则不会自动运行 End 质量检查。

</div>
<div>

## End Core 调用边界

```text
equipment_model → robot_id → built-in bundle
→ compute_ends → write_ends → inspect_end_groups
```

未配置型号可跳过 End Core；已配置型号的配置、计算或写回失败会终止当前任务。

</div>
</div>

<div class="platform-rule"><strong>语义边界：</strong>坐标系可通过已知 transform 归一化；endpoint 不一致时，必须有明确的固定变换或标定，不能仅靠更名处理。</div>


---

<div class="doc-section">03 · 数据契约</div>

# 一条可使用的 Pose 必须包含哪些语义

<div class="definition"><strong>通用定义</strong>　Pose 由 position 和 orientation 组成；在平台数据中，还必须明确它描述的端点、参考坐标系、时刻和表示约定。</div>

| 字段 | 必须回答的问题 | 平台约定 |
|---|---|---|
| endpoint | 描述机器人上的哪个点？ | 必须明确 wrist、gripper center、TCP 等语义 |
| reference frame | 这个点相对谁表达？ | 交付 End Pose 统一归一化到 `base_link` |
| timestamp | 对应哪个采样、指令或计算时刻？ | 动态比较前必须对齐 |
| position | endpoint 在 reference frame 中的位置在哪里？ | `[x, y, z]`，长度单位为 m |
| orientation | endpoint 相对 reference frame 的朝向如何？ | 单位 quaternion，分量顺序为 `xyzw` |

---

<div class="doc-section">04 · 坐标语义</div>

# 坐标轴颜色约定与解释边界

<div class="doc-columns equal">
<div>

<div class="axis-contract">
  <span class="axis-x">X · 红色</span>
  <span class="axis-y">Y · 绿色</span>
  <span class="axis-z">Z · 蓝色</span>
</div>

## 通用说明

- 这是 Foxglove、RViz 等机器人可视化工具的常见颜色约定，不是数学定义的强制要求。
- 每个 link 或自定义 frame 均可拥有自己的 XYZ 坐标轴。
- 不同 frame 的轴方向可以完全不同，并随对应 link 一起运动。

</div>
<div class="axis-evidence">

<div class="evidence-header">坐标轴示例 · 单关节</div>
<img class="evidence-image evidence-image-contain" src="./assets/source/单独只有一个关节的图片，可以用于解释坐标轴的颜色.png" alt="单关节及 XYZ 坐标轴">
<div class="evidence-caption">
红、绿、蓝分别表示 X、Y、Z 轴。颜色是可视化约定；轴的物理方向由 frame 定义，不由屏幕方向决定。
</div>

</div>
</div>

<!--
备用素材：a2d-foxglove-top-frames.png 用于从俯视角度再次说明“屏幕方向不等于坐标轴方向”。
待补简化截图：仅显示 base_link、Link6_l、Reference End 和 TCP。
-->

---
class: compact-business frame-selection-slide
---

<div class="doc-section">05 · 坐标系选择</div>

# world、base_link 与厂商自定义坐标系

| 坐标系 | 定义 | 优势 | 局限 | 适用场景 |
|---|---|---|---|---|
| `world` | 固定于场地或场景的全局参考系 | 表达全局轨迹和多机器人关系 | 依赖定位、标定或场地定义 | 移动轨迹、跨设备关系 |
| `base_link` | 固定于机器人本体并随整机移动 | 与 URDF/FK 衔接，机器人内部语义稳定 | 不能直接表示场地中的全局位置 | 机械臂 FK、统一 End、内部校验 |
| vendor frame | 厂商控制器或传感器定义的参考系 | 与原始 topic 和厂商系统直接对应 | 构型间可能不一致，定义可能不明确 | 原始接入、厂商问题追踪 |

<div class="platform-rule"><strong>当前 End Core 契约：</strong>输出坐标系由 schema v7 的 <code>output.pose_frame</code> 和 endpoint <code>pose_frame</code> 定义；A2D 当前均为 <code>base_link</code>。<code>world</code> 不属于 End Core 的 H5 输出坐标系配置，外部定位关系由上层 TF 或 overlay 处理。</div>

<div class="doc-columns equal" style="margin-top:20px">
<div>

## 坐标归一化

厂商提供 $T_{raw\rightarrow end}$，并已知 $T_{base\rightarrow raw}$：

$$T_{base\rightarrow end}=T_{base\rightarrow raw}T_{raw\rightarrow end}$$

</div>
<div>

## 实现中的 frame 映射

- Raw 已在输出 frame：使用 identity。
- Raw 使用厂商 frame：必须在 `raw_pose_frames` 中定义到输出 frame 的已知变换。
- DWHEEL 当前 Raw source 为 `excluded`：其 flange control frame 与 Verify/TCP 的 arm link 语义不一致，不能只做坐标旋转后强行比较。

</div>
</div>

---

<div class="doc-section">06 · 姿态表示</div>

# RPY、Rotation Matrix 与 Quaternion

| 表示方式 | 数据形式 | 主要优势 | 约束与风险 | 平台中的常见用途 |
|---|---|---|---|---|
| RPY / Euler Angles | `[roll, pitch, yaw]` | 三个数，人工阅读和配置较直观 | 依赖旋转顺序；存在 gimbal lock | URDF `origin rpy`、配置、调试显示 |
| Rotation Matrix | 3×3 matrix | 可直接参与坐标变换与矩阵组合 | 九个数、有冗余；应保持正交 | FK 与坐标变换内部计算 |
| Quaternion | `[x, y, z, w]` | 四个数、无 gimbal lock，适合组合和插值 | 不直观；必须确认 `xyzw/wxyz` | ROS、H5、程序输出 |

<div class="doc-columns equal" style="margin-top:18px">
<div>

## 通用定义

三种表示描述的是同一个物理姿态，而不是三种不同姿态。quaternion 通常应保持单位长度；`q` 与 `-q` 表示同一旋转。

</div>
<div>

## 实现约定

URDF 使用 RPY 便于人工配置；FK 通常将 RPY 或 quaternion 转换为 rotation matrix 参与计算，再按输出协议转换回 quaternion。正文不展开完整转换公式。

</div>
</div>

<div class="platform-rule"><strong>平台约定：</strong>URDF 中的 RPY 使用 rad；H5 End Pose 输出单位 quaternion，分量顺序为 <code>xyzw</code>。比较前必须确认双方约定一致。</div>

---
class: compact-business end-types-slide
---

<div class="doc-section">07 · End 类型与比较</div>

# 当前方案中的五类 End

<div class="doc-columns equal">
<div>

| 类型 | 来源 | 用途 |
|---|---|---|
| `raw_action_end` | H5 厂商 Action Pose | `h5_pose`；也可显式设为 `none/excluded` |
| `raw_state_end` | H5 厂商 State Pose | `h5_pose`；缺失时不会 fallback FK |
| `verify_action_end` | Action Joint + URDF/FK | 计算控制目标的 Reference End |
| `verify_state_end` | State Joint + URDF/FK | 计算实际状态的 Reference End |
| `tcp_end` | State FK + `tcp_from_reference` | 表示经标定的真实操作点 |

</div>
<div class="end-type-notes">

## 语义和比较规则

- Action/State 区分控制目标与实际反馈，不决定数据是 Raw 还是 Verify。
- 五类是计算阶段的 kind；落盘后，每个 Action/State candidate group 固定为 `raw_end / verify_end / tcp_end` 三个槽位。
- 当前 `end_rule` 在每个 group 内计算 Raw↔Verify、Raw↔TCP、Verify↔TCP 三组指标。
- endpoint 单独记录，不是第四种候选类型；解释比较结果时还要核对 `reference_link`。
- Raw 不必然正确，Verify 也依赖正确的 URDF 与 mapping。

<img class="inline-business-image action-state-image" src="./assets/source/展示action_end和state_end的图片，说明了action_end和state_end在运动的时候通常会有一定错位.png" alt="Action End 与 State End 的运动错位示例">
<div class="image-note">Action/State 在运动中可因控制延迟和 timestamp 未对齐而错位。</div>

</div>
</div>

<div class="takeaway"><strong>TCP 关系：</strong><code>T_base→tcp = T_base→reference · T_reference→tcp</code>。比较涉及 TCP 时，若它与 Raw/Verify 的 <code>reference_link</code> 不同，误差包含 endpoint offset，不能直接解释为 FK 错误。</div>

---

<div class="doc-section">08 · 结构模型</div>

# URDF：结构、Joint 与语义 Frame

<div class="definition"><strong>通用定义</strong>　URDF（Unified Robot Description Format）使用 XML 描述机器人结构模型。</div>

<div class="doc-columns equal">
<div>

## 结构与运动学信息

- `link`：刚体部件与固定在其上的 frame。
- `joint`：连接 parent/child link，定义 origin、axis、type 和 limit。
- URDF Tree：表达完整机器人的 link/joint 拓扑，FK 从中提取 base→end chain。
- `visual` origin 描述 mesh 相对 link frame 的位姿，不是 joint origin。

</div>
<div>

## 几何、动力学与语义 Frame

| 元素 | 作用与边界 |
|---|---|
| visual | 显示模型，可引用 STL 等 mesh |
| collision | 碰撞检测，可使用简化几何 |
| inertial | 质量、质心与惯量；不参与本文 FK 推导 |
| meshless link | 无 mesh 仍是合法 frame，可作为 Reference End 或 TCP |

</div>
</div>

<div class="example"><strong>边界：</strong>URDF 不保存每帧 joint state，也不直接给出指定时刻的 End Pose。它提供静态结构；运行时 joint 提供 q；FK 将二者组合为 TF 和 End Pose。</div>

---

<div class="doc-section">09 · Link / Joint / Tree</div>

# 从 URDF Tree 中提取一条 Kinematic Chain

<div class="chain-doc">
  <span>Link5_l</span><b>→</b><span>left_arm_joint6</span><b>→</b><span>Link6_l</span><b>→</b><span>left_arm_joint7</span><b>→</b><span>Link7_l</span><b>→</b><span>Joint_hand_l (fixed)</span><b>→</b><span>left_base_link</span><b>→</b><span>gripper_center_joint (fixed)</span><b>→</b><span>gripper_center</span>
</div>

| 概念 | 定义 | 实现意义 |
|---|---|---|
| link | 刚体部件及固定在该部件上的 frame | FK 的节点；End 通常对应 link/custom frame |
| joint | parent link 与 child link 的连接及允许运动 | 提供固定 origin、axis、type 等结构信息 |
| kinematic chain | 从 base 到指定 end 的有序路径 | FK 仅遍历该路径，不需要遍历完整树 |
| URDF tree | 完整机器人的 link/joint 拓扑 | 非根 link 通常只有一个 parent joint，可有多个 child joint |

<div class="takeaway"><strong>链路原则：</strong>三自由度腕部通常由三个单自由度 joint 串联表达；fixed joint 虽然没有 q，但它的 origin 仍属于 FK chain，不能省略。</div>

---

<div class="doc-section">10 · Joint 定义</div>

# left_arm_joint6：字段定义与运行时含义

<div class="doc-columns equal">
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

| 字段 | 严格含义 |
|---|---|
| parent / child | joint 连接的前后两个 link |
| origin xyz/rpy | joint frame 相对 parent link 的固定安装位姿 |
| axis | revolute 旋转轴或 prismatic 平移轴；在 joint frame 中表达 |
| type | fixed / revolute / continuous / prismatic |
| limit | 位置、速度、力矩等限制 |

`origin rpy` 不是当前 joint angle。`axis="0 0 -1"` 表示运行时绕 joint frame 的负 Z 轴旋转；当前 q 来自 Action/State joint position。

</div>
</div>

<div class="platform-rule"><strong>解释边界：</strong>URDF 允许任意合法 axis 向量。A2D 中使用主轴方向是构型现状，不应表述为 URDF 的通用限制。</div>

---
class: evidence-slide tf-message-slide
---

<div class="evidence-header">运行时 TF 证据 · Link5_l → Link6_l</div>
<img class="evidence-image tf-message" src="./assets/source/a2d-tf-message-arm.png" alt="Link5_l 到 Link6_l TFMessage">
<div class="evidence-caption">
该消息展示 parent frame、child frame、timestamp、translation 和 quaternion；Foxglove 同时显示换算后的 RPY。它是运行时变换结果，不是 URDF joint 原始定义。
</div>

---

<div class="doc-section">11 · 信息分层</div>

# 结构定义、运行时关节状态与 TF 变换

<div class="layer-grid">
<div>
  <div class="layer-title">URDF Joint · 静态结构</div>
  parent / child<br>origin position + orientation<br>axis / type / limit
</div>
<div class="layer-arrow">+</div>
<div>
  <div class="layer-title">Runtime Joint · 动态状态</div>
  position q<br>可选 velocity / effort<br>Action 或 State 语义
</div>
<div class="layer-arrow">→</div>
<div>
  <div class="layer-title">TF Transform · 计算结果</div>
  parent frame → child frame<br>translation + rotation<br>timestamp
</div>
</div>

<div class="doc-columns equal" style="margin-top:24px">
<div>

## 规范表述

不能笼统地说“一个 joint 保存 position、orientation 和 axis”。更准确的表述是：

1. URDF joint 保存固定安装位姿、axis、type 等结构信息。
2. 运行时 joint 数据提供当前 q；常见一自由度 joint 的 position 通常是标量。
3. FK 根据结构信息和 q 计算 parent→child 的 TF transform。

</div>
<div>

## 与 End Pose 的关系

```text
URDF Joint + Action/State Joint Position
→ FK
→ TF Transform
→ Reference End Pose
→ Optional TCP Offset
→ TCP End Pose
```

截图中的 TFMessage 属于第三层，而不是第一层。

</div>
</div>

---

<div class="doc-section">12 · 变换约定</div>

# 齐次变换与单 Joint 变换的计算规则

<div class="doc-columns equal">
<div>

## 齐次变换

$$T=\begin{bmatrix}R&p\\0&1\end{bmatrix}$$

- `R`：3×3 rotation matrix，表示姿态。
- `p`：3×1 position，表示位置。
- `T`：同时表达旋转和平移，便于连续组合相邻 frame。

正文不推导齐次坐标理论；只需理解 FK 为什么使用 4×4 matrix multiplication。

</div>
<div>

## 单 Joint 变换

$$T_{parent\rightarrow child}(q)=T_{origin}T_{motion}(q)$$

| Joint type | 变换 |
|---|---|
| fixed | $T=T_{origin}$ |
| revolute / continuous | $T=T_{origin}R(axis,q)$ |
| prismatic | $T=T_{origin}Trans(axis\cdot q)$ |

revolute/continuous 的 q 通常为 rad；prismatic 通常为 m。

</div>
</div>

<div class="platform-rule"><strong>计算约束：</strong><code>origin</code> 在前、<code>motion(q)</code> 在后，矩阵乘法顺序不可交换。fixed joint 虽无 q，但可能包含关键 origin，不得直接从 chain 删除。</div>

---

<div class="doc-section">13 · FK 算法</div>

# 沿 base → end 的运动链累积变换

<div class="doc-columns code-wide">
<div>

```text
base_link
→ shoulder
→ elbow
→ wrist
→ reference end
```

$$T_{base\rightarrow end}=T_1T_2\cdots T_n$$

## 计算步骤

1. 从单位矩阵开始。
2. 按 base→end 的有序 chain 遍历 joint。
3. 对每个 joint 依次应用 origin 和 motion(q)。
4. 每步执行 `base_to_child = base_to_parent @ parent_to_child`。
5. 最终 position 取自 `T[:3,3]`，rotation matrix 转为输出 quaternion。

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

    position = T[:3, 3]
    orientation = matrix_to_quaternion(T[:3, :3])
    return position, orientation
```

</div>
</div>


<!-- 伪代码假设 joint_values 已完成 H5→URDF mapping、正负号/比例变换、default 与 mimic 解析。正文不展开 Rodrigues 公式和 quaternion 转换推导。 -->

---
class: compact-business production-slide
---

<div class="doc-section">14 · 配置与生产落地</div>

# 从离线配置到生产 H5

<div class="doc-columns equal">
<div>

## 配置与资源边界

```text
schema v7 YAML + 精简 URDF
→ h5_tf_exporter 测试、发布 h5-end-core
→ HPC 按 equipment_model 加载内置 bundle
```

| schema v7 配置段 | 核心职责 |
|---|---|
| `robot / urdf / output` | robot ID、pose frame、`base_link`、输出 `xyzw` |
| `joint_groups / joint_overrides` | H5 path/index、数值变换、joint limit |
| `ends / endpoints / quality` | 五类计算、reference、TCP、final priority 与阈值 |

</div>
<div>

## `hpc_executor` 生产阶段

1. **normalize**：`mode=candidates`，写三候选张量并更新 metadata `end_info_ver=2.0`。
2. **collect**：显式规则计算 End 误差/稳定性或 joint limit，生成 collect JSON。
3. **inspect**：用 CSV selector/range 检查 collect JSON，生成错误和质量等级。
4. **align**：设备对齐后以严格时间轴运行 `mode=final`，再更新 metadata。

<div class="platform-rule"><strong>final 选择：</strong>依次检查 <code>final_priority</code>；候选必须全帧有限，Raw/TCP 还必须 <code>allow_as_final=true</code>。A2D 当前优先级为 Raw → Verify → TCP，但 TCP 不允许作为 final。</div>

</div>
</div>

<div class="doc-columns equal wire-cards" style="margin-top:10px">
<div><strong>normalize · candidates</strong><br><code>joints/{action|state}/{output_group}</code><br><span class="micro-note">position [F,3,3] · orientation [F,3,4] · group timestamp [F]</span></div>
<div><strong>align · final</strong><br><code>joints/{action|state}/end</code><br><span class="micro-note">position [F,E,3] · orientation [F,E,4] · 严格复用根 timestamp</span></div>
</div>

<div class="micro-note wire-attrs">公共 attrs：generated_by · bundle_hash · endpoint_id · end_type · reference_link；最终选中的类型直接记录在 <code>end_type</code>。</div>

---

<div class="doc-section">15 · URDF / TF</div>

# URDF Tree 与 TF Tree 的职责边界

| 对比项 | URDF Tree | TF Tree |
|---|---|---|
| 核心职责 | 描述机器人模型中的 link/joint 拓扑 | 描述运行时所有 frame 的连接关系 |
| 主要来源 | URDF XML | URDF、FK、传感器和程序发布的 transform |
| 时间属性 | 不包含每帧实时姿态 | transform 随时间更新 |
| 覆盖范围 | 通常是机器人本体 | 还可包含 world、camera、TCP、verify end 等 frame |

<div class="doc-columns equal" style="margin-top:20px">
<div>

## A2D 示例

A2D 的 TF Tree 包含 `world`、`base_link`、各级 link、TCP、verify action end 和 verify state end。额外 End frame 不一定存在于原始 URDF，可以由程序计算后发布。

</div>
<div>

## 结构约束

TF Tree 必须保持树状父子关系。循环或多父节点会导致变换无法被正确解析。检查某个 End 时，应从目标 frame 反向追踪到约定 base frame，并确认链路连续。

</div>
</div>

---
class: evidence-slide tf-tree-overview-page
---

<div class="evidence-header">TF Tree 证据 · 整体拓扑</div>
<img class="evidence-image tree-overview" src="./assets/source/a2d-tf-tree-full.png" alt="A2D 完整 TF Tree">
<div class="evidence-caption">
确认运行时 frame 的整体规模与根节点。此页用于观察拓扑全貌，不要求逐一阅读全部节点。
</div>

---
class: evidence-slide tf-tree-detail-page
---

<div class="evidence-header">TF Tree 证据 · 左臂局部链路</div>
<img class="evidence-image tree-detail" src="./assets/source/a2d-tf-tree-left-chain.png" alt="A2D 左臂 TF 层级">
<div class="evidence-caption">
从 <code>base_link</code> 进入左臂分支，依次检查 link、Reference End、gripper center、TCP 和 Verify End，验证 parent/child、joint mapping 与 End 发布关系。
</div>

---



<div class="doc-section">16 · 校验与问题定位</div>

# FK 与 End Pose 的验证顺序

<div class="doc-columns equal">
<div>

## 开发阶段

1. **Zero Pose**：可动 joint 全设为 0，与 URDF 查看器结果比较。
2. **Single Joint**：一次仅改变一个 joint，检查 child chain 和 axis 方向。
3. **Fixed Joint**：确认固定 position/rotation 未丢失。
4. **Reference Implementation**：与 Foxglove、已验证 FK 库或参考程序比较。

## 数据阶段

1. 对齐 timestamp、endpoint、reference frame、单位和 convention。
2. 叠加 Raw End 与 Verify End。
3. 比较 position 和 orientation 差异。
4. 检查轨迹连续性、固定偏差和异常跳变。

</div>
<div>

| 问题 | 典型表现 |
|---|---|
| 矩阵顺序 / base-end 方向错误 | 整体位置与姿态异常 |
| 忽略 origin rotation / axis frame 错 | child link 沿错误方向运动 |
| 遗漏 fixed joint | 固定位置或姿态偏差 |
| joint mapping / 正负方向错误 | link 跟随错误 joint 或反向运动 |
| degree/radian、mm/m | 幅度异常或 1000 倍误差 |
| xyzw/wxyz | orientation 异常 |
| Action/State 时间未对齐 | 两条轨迹动态错位 |
| endpoint 不同 | 出现结构性、可能随姿态变化的偏差 |

</div>
</div>

<div class="doc-columns equal" style="margin-top:14px">
<div>位置误差：$e_p=\lVert p_{raw}-p_{verify}\rVert$</div>
<div>姿态误差：$e_q=2\arccos(|q_{raw}\cdot q_{verify}|)$<br><span class="micro-note">$q_{raw}$ 与 $q_{verify}$ 必须先单位化</span></div>
</div>

<div class="platform-rule"><strong>解释原则：</strong>已知的传感器安装或测量偏置也会进入误差，必须根据厂商测量方式处理。稳定的结构性偏差多指向 frame、endpoint、offset 或 URDF；抖动与跳变再检查时间、传感器、mapping 和通信。</div>
